package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    private final byte[] tokenAtteso;

    public InternalController(
            UtenteRepository utenteRepository,
            // Riusa il segreto JWT se non se ne configura uno dedicato: entrambi i
            // servizi lo hanno gia', quindi nessun nuovo segreto da distribuire.
            @Value("${neurodesk.internal.token:${neurodesk.jwt.secret}}") String internalToken) {
        this.utenteRepository = utenteRepository;
        this.tokenAtteso = internalToken.getBytes(StandardCharsets.UTF_8);
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
        return ResponseEntity.ok(Map.of("attivo", attivo, "consenso", consenso));
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
