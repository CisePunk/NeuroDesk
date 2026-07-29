package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.ConsumoRiepilogoResponse;
import com.neurodesk.app.neurodesk.dto.TesterCreatoResponse;
import com.neurodesk.app.neurodesk.dto.TesterResponse;
import com.neurodesk.app.neurodesk.entity.Ruolo;
import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.repository.ConsumoAiRepository;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import com.neurodesk.app.neurodesk.security.CodeGenerator;
import com.neurodesk.app.neurodesk.security.CryptoService;
import com.neurodesk.app.neurodesk.security.HashService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Creazione/gestione dei tester (utenti STUDENTE anonimi). Il codice in chiaro
 * esiste solo per l'istante della creazione: nel DB va solo il suo hash.
 */
@Service
@RequiredArgsConstructor
public class TesterService {

    private final UtenteRepository utenteRepository;
    private final ConsumoAiRepository consumoRepository;
    private final HashService hashService;
    private final CryptoService cryptoService;
    private final CodeGenerator codeGenerator;

    @Transactional
    public TesterCreatoResponse crea(String etichetta) {
        for (int tentativi = 0; tentativi < 5; tentativi++) {
            String codice = codeGenerator.generaCodice();
            String hash = hashService.loginHash(codice);
            if (!utenteRepository.existsByLoginHash(hash)) {
                Utente tester = Utente.builder()
                        .loginHash(hash)
                        .ruolo(Ruolo.STUDENTE)
                        .attivo(true)
                        .etichetta(etichetta != null && !etichetta.isBlank() ? etichetta.trim() : null)
                        .build();
                tester = utenteRepository.save(tester);
                return new TesterCreatoResponse(tester.getId(), codice, tester.getEtichetta());
            }
        }
        // Con 80 bit di entropia e' praticamente impossibile: fallisci esplicito, non salvare un duplicato.
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Impossibile generare un codice univoco. Riprova.");
    }

    public List<TesterResponse> lista() {
        // Una sola interrogazione per tutto il consumo, poi si accosta in memoria:
        // con una query per codice, l'elenco farebbe N+1 accessi al database.
        Map<Long, Object[]> consumo = new HashMap<>();
        for (Object[] riga : consumoRepository.riepilogoPerUtente()) {
            consumo.put((Long) riga[0], riga);
        }
        return utenteRepository.findByRuoloOrderByCreatoIlDesc(Ruolo.STUDENTE).stream()
                .map(u -> {
                    Object[] c = consumo.get(u.getId());
                    return new TesterResponse(
                            u.getId(),
                            u.getEtichetta(),
                            Boolean.TRUE.equals(u.getAttivo()),
                            u.getConsensoIl() != null,
                            u.getCreatoIl(),
                            c == null ? 0L : ((Number) c[1]).longValue(),
                            c == null ? 0L : ((Number) c[2]).longValue(),
                            c == null ? 0L : ((Number) c[3]).longValue(),
                            c == null ? null : (LocalDateTime) c[4],
                            // Solo se c'e', e per quale fornitore. La chiave in se'
                            // non esce mai verso il browser.
                            u.getChiaveAiCifrata() != null,
                            u.getChiaveAiProvider());
                })
                .toList();
    }

    /**
     * Quanto si sta consumando, diviso per modello, in tutto e negli ultimi sette
     * giorni. Il calcolo in euro non si fa qui: qui escono i token misurati, il
     * listino sta in un punto solo del frontend perche' cambia da solo (Sonnet 5
     * ha un prezzo di lancio fino al 31 agosto 2026) e un cambio di listino non
     * deve costringere a ripubblicare il backend.
     */
    public ConsumoRiepilogoResponse riepilogoConsumo() {
        LocalDateTime setteGiorniFa = LocalDateTime.now().minusDays(7);
        LocalDateTime inizio = consumoRepository.primaRegistrazione();

        // Quanti giorni di storico abbiamo davvero. Se il registro e' partito ieri,
        // proiettare "al ritmo degli ultimi sette giorni" mentirebbe di sette volte.
        double giorni = inizio == null
                ? 0
                : Math.max(0.5, java.time.Duration.between(inizio, LocalDateTime.now()).toMinutes() / 1440.0);

        return new ConsumoRiepilogoResponse(
                righe(consumoRepository.riepilogoPerModello()),
                righe(consumoRepository.riepilogoPerModelloDa(setteGiorniFa)),
                Math.min(giorni, 7.0),
                consumoRepository.countByRipiegoDaIsNotNullAndCreatoIlGreaterThanEqual(setteGiorniFa));
    }

    private static List<ConsumoRiepilogoResponse.Riga> righe(List<Object[]> grezze) {
        return grezze.stream()
                .map(r -> new ConsumoRiepilogoResponse.Riga(
                        (String) r[0],
                        (String) r[1],
                        ((Number) r[2]).longValue(),
                        ((Number) r[3]).longValue(),
                        ((Number) r[4]).longValue()))
                .toList();
    }

    /** Fornitori per cui accettiamo una chiave personale. */
    private static final java.util.Set<String> PROVIDER_AMMESSI = java.util.Set.of("anthropic", "openai");

    /**
     * Imposta (o sostituisce) la chiave API personale di un tester.
     *
     * "Bring your own token": da qui in poi le sue risposte le paga lui, sul suo
     * conto. La chiave viene cifrata subito, con lo stesso servizio e la stessa
     * chiave con cui si cifrano le conversazioni: e' una credenziale che spende
     * soldi senza tetto, e merita la protezione piu' alta che abbiamo.
     *
     * Non viene mai registrata nei log, nemmeno parzialmente.
     */
    @Transactional
    public void impostaChiaveAi(Long id, String provider, String chiave) {
        Utente tester = utenteRepository.findById(id)
                .filter(u -> u.getRuolo() == Ruolo.STUDENTE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tester non trovato"));

        String p = provider == null ? "" : provider.trim().toLowerCase();
        if (!PROVIDER_AMMESSI.contains(p)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Fornitore non valido: usa 'anthropic' oppure 'openai'.");
        }
        String pulita = chiave == null ? "" : chiave.trim();
        // Nessun controllo sul formato oltre alla lunghezza minima: i prefissi
        // delle chiavi cambiano nel tempo, e rifiutare una chiave valida perche'
        // non somiglia a quelle di un anno fa sarebbe peggio che accettarla.
        if (pulita.length() < 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La chiave sembra troppo corta: controlla di averla copiata tutta.");
        }

        tester.setChiaveAiCifrata(cryptoService.cifra(pulita));
        tester.setChiaveAiProvider(p);
        tester.setChiaveAiImpostataIl(LocalDateTime.now());
        utenteRepository.save(tester);
    }

    /** Toglie la chiave personale: da qui in poi torna a usare il credito comune. */
    @Transactional
    public void rimuoviChiaveAi(Long id) {
        Utente tester = utenteRepository.findById(id)
                .filter(u -> u.getRuolo() == Ruolo.STUDENTE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tester non trovato"));
        tester.setChiaveAiCifrata(null);
        tester.setChiaveAiProvider(null);
        tester.setChiaveAiImpostataIl(null);
        utenteRepository.save(tester);
    }

    @Transactional
    public void impostaStato(Long id, boolean attivo) {
        Utente tester = utenteRepository.findById(id)
                .filter(u -> u.getRuolo() == Ruolo.STUDENTE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tester non trovato"));
        tester.setAttivo(attivo);
        utenteRepository.save(tester);
    }
}
