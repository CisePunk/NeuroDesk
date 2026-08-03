package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.entity.ConsumoAi;
import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.repository.ConsumoAiRepository;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Optional;

/**
 * Endpoint INTERNO servizio-a-servizio. Il companion-service (Node) si fida del solo
 * JWT, valido fino a 24h: senza questo controllo, revocare un utente (o il suo consenso)
 * non gli chiude il Companion fino alla scadenza del token. Qui il companion chiede
 * lo stato reale dal DB, cosi' la revoca ha effetto entro pochi secondi.
 *
 * NON deve essere raggiungibile dall'esterno: Caddy blocca /api/internal/* verso il web;
 * il companion lo chiama in locale (127.0.0.1:8080). In piu' e' protetto da un token
 * condiviso (di default lo stesso segreto JWT, gia' noto a entrambi i servizi).
 */
@RestController
@RequestMapping("/api/internal")
public class InternalController {

    private final UtenteRepository utenteRepository;
    private final ConsumoAiRepository consumoRepository;
    private final com.neurodesk.app.neurodesk.security.CryptoService cryptoService;
    private final byte[] tokenAtteso;

    // Tetto di consumo sul credito comune, in token. 0 = SPENTO (default): non
    // blocca nessuno. Quando servira', si imposta neurodesk.consumo.tetto-token-
    // condiviso e si riavvia il backend; il resto dell'impalcatura e' gia' pronto.
    private final long tettoTokenCondivisi;

    public InternalController(
            UtenteRepository utenteRepository,
            ConsumoAiRepository consumoRepository,
            com.neurodesk.app.neurodesk.security.CryptoService cryptoService,
            // Riusa il segreto JWT se non se ne configura uno dedicato: entrambi i
            // servizi lo hanno gia', quindi nessun nuovo segreto da distribuire.
            @Value("${neurodesk.internal.token:${neurodesk.jwt.secret}}") String internalToken,
            @Value("${neurodesk.consumo.tetto-token-condiviso:0}") long tettoTokenCondivisi) {
        this.utenteRepository = utenteRepository;
        this.consumoRepository = consumoRepository;
        this.cryptoService = cryptoService;
        this.tokenAtteso = internalToken.getBytes(StandardCharsets.UTF_8);
        this.tettoTokenCondivisi = tettoTokenCondivisi;
    }

    @GetMapping("/utente/{id}/stato")
    public ResponseEntity<?> stato(
            @PathVariable Long id,
            @RequestHeader(value = "X-Internal-Token", required = false) String token) {
        if (!tokenValido(token)) {
            return ResponseEntity.status(401).build();
        }
        Optional<Utente> trovato = utenteRepository.findById(id);
        if (trovato.isEmpty()) {
            // Utente inesistente: per il chiamante equivale a "non attivo".
            return ResponseEntity.ok(Map.of("attivo", false, "consenso", false));
        }
        Utente utente = trovato.get();
        boolean attivo = Boolean.TRUE.equals(utente.getAttivo());
        boolean consenso = utente.getConsensoIl() != null;

        // Chiave personale del tester, decifrata SOLO qui e SOLO per il canale
        // interno: il companion deve poterla usare per chiamare il fornitore a
        // suo nome. Non passa mai dal browser (Caddy risponde 404 su
        // /api/internal/* verso il web) e non finisce in nessun log.
        Map<String, Object> risposta = new java.util.HashMap<>();
        risposta.put("attivo", attivo);
        risposta.put("consenso", consenso);
        if (utente.getChiaveAiCifrata() != null && utente.getChiaveAiProvider() != null) {
            try {
                risposta.put("chiaveAi", cryptoService.decifra(utente.getChiaveAiCifrata()));
                risposta.put("chiaveAiProvider", utente.getChiaveAiProvider());
            } catch (RuntimeException err) {
                // Chiave illeggibile (es. cifrata con un segreto diverso): non e'
                // un motivo per bloccare l'accesso. Si ricade sul credito comune,
                // ma lo diciamo nel log perche' e' un guasto vero da sistemare.
                System.err.println("[internal] chiave AI dell'utente " + id + " non decifrabile: " + err.getMessage());
            }
        }

        // Tetto di consumo sul credito COMUNE. Finche' la soglia e' 0 (default)
        // questo e' sempre false e non blocca nessuno: e' l'impalcatura, spenta.
        // Il companion applica il blocco solo a chi NON ha una chiave propria.
        boolean creditoCondivisoEsaurito =
                tettoTokenCondivisi > 0
                && consumoRepository.tokenCondivisiPerUtente(id) >= tettoTokenCondivisi;
        risposta.put("creditoCondivisoEsaurito", creditoCondivisoEsaurito);

        return ResponseEntity.ok(risposta);
    }

    /**
     * Registra quanto e' costata una chiamata AI. Lo chiama il companion-service
     * dopo ogni risposta, sul canale interno.
     *
     * Perche' NON lo manda il browser: il consumo serve anche ad accorgersi di
     * chi usa il Companion per fatti propri, e un numero che passa dal client
     * puo' essere falsificato proprio da chi avrebbe interesse a farlo.
     *
     * Qui non arriva nessun contenuto: solo conteggi, provider e modello.
     */
    @PostMapping("/consumo")
    public ResponseEntity<?> registraConsumo(
            @RequestBody Map<String, Object> corpo,
            @RequestHeader(value = "X-Internal-Token", required = false) String token) {
        if (!tokenValido(token)) {
            return ResponseEntity.status(401).build();
        }
        Long utenteId = numero(corpo.get("utenteId"));
        if (utenteId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "utenteId richiesto"));
        }
        consumoRepository.save(ConsumoAi.builder()
                .utenteId(utenteId)
                .sessioneId(numero(corpo.get("sessioneId")))
                .provider(String.valueOf(corpo.getOrDefault("provider", "sconosciuto")))
                .modello(corpo.get("modello") == null ? null : String.valueOf(corpo.get("modello")))
                .tokenInput(intero(corpo.get("tokenInput")))
                .tokenOutput(intero(corpo.get("tokenOutput")))
                .ripiegoDa(corpo.get("ripiegoDa") == null ? null : String.valueOf(corpo.get("ripiegoDa")))
                .pagatoDaUtente(Boolean.TRUE.equals(corpo.get("pagatoDaUtente")))
                .build());
        return ResponseEntity.noContent().build();
    }

    private static Long numero(Object v) {
        if (v instanceof Number n) return n.longValue();
        try {
            return v == null ? null : Long.parseLong(String.valueOf(v));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static int intero(Object v) {
        Long n = numero(v);
        return n == null ? 0 : Math.max(0, n.intValue());
    }

    /** Confronto a tempo costante: non rivela la lunghezza/valore del token con il timing. */
    private boolean tokenValido(String token) {
        if (token == null) {
            return false;
        }
        byte[] fornito = token.getBytes(StandardCharsets.UTF_8);
        if (fornito.length != tokenAtteso.length) {
            return false;
        }
        return MessageDigest.isEqual(fornito, tokenAtteso);
    }
}
