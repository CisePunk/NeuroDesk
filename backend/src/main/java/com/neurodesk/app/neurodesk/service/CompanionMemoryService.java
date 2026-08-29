package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.ScambioSalvatoResponse;
import com.neurodesk.app.neurodesk.dto.SessioneDettaglioResponse;
import com.neurodesk.app.neurodesk.dto.SessioneDettaglioResponse.MessaggioResponse;
import com.neurodesk.app.neurodesk.dto.SessioneResponse;
import com.neurodesk.app.neurodesk.dto.SalvaScambioRequest;
import com.neurodesk.app.neurodesk.entity.CompanionMessage;
import com.neurodesk.app.neurodesk.entity.CompanionSession;
import com.neurodesk.app.neurodesk.repository.CompanionSessionRepository;
import com.neurodesk.app.neurodesk.security.CryptoService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Memoria delle conversazioni Companion: salvataggio cifrato, rilettura per il solo
 * proprietario, cancellazione (diritto all'oblio) e pulizia automatica a 30 giorni.
 */
@Service
@RequiredArgsConstructor
public class CompanionMemoryService {

    /** Retention: le conversazioni non toccate da oltre 30 giorni si cancellano da sole. */
    public static final int GIORNI_CONSERVAZIONE = 30;

    private static final Logger log = LoggerFactory.getLogger(CompanionMemoryService.class);

    private final CompanionSessionRepository sessioni;
    private final CryptoService crypto;

    @Transactional
    public ScambioSalvatoResponse salvaScambio(Long utenteId, SalvaScambioRequest req) {
        CompanionSession sessione;
        if (req.sessioneId() != null) {
            sessione = sessioni.findByIdAndUtenteId(req.sessioneId(), utenteId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessione non trovata"));
        } else {
            sessione = CompanionSession.builder()
                    .utenteId(utenteId)
                    .titolo(titoloValido(req.titolo()))
                    .build();
        }

        sessione.aggiungi(messaggio("user", req.messaggioUtente()));
        sessione.aggiungi(messaggio("assistant", req.rispostaCompanion()));

        sessione = sessioni.save(sessione);

        // IDENTITY assegna l'id sull'insert, non a fine transazione: dopo il
        // save i due messaggi appena aggiunti li hanno già. Sono gli ultimi
        // due della lista perché li abbiamo appena aggiunti in questo ordine.
        List<CompanionMessage> messaggi = sessione.getMessaggi();
        Long idUtente = messaggi.get(messaggi.size() - 2).getId();
        Long idCompanion = messaggi.get(messaggi.size() - 1).getId();
        return new ScambioSalvatoResponse(sessione.getId(), idUtente, idCompanion);
    }

    @Transactional(readOnly = true)
    public List<SessioneResponse> listaSessioni(Long utenteId) {
        return sessioni.findByUtenteIdOrderByAggiornatoIlDesc(utenteId).stream()
                .map(s -> new SessioneResponse(s.getId(), s.getTitolo(), s.getAggiornatoIl()))
                .toList();
    }

    @Transactional(readOnly = true)
    public SessioneDettaglioResponse dettaglio(Long utenteId, Long sessioneId) {
        CompanionSession s = sessioni.findByIdAndUtenteId(sessioneId, utenteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessione non trovata"));

        List<MessaggioResponse> messaggi = s.getMessaggi().stream()
                .map(m -> new MessaggioResponse(
                        m.getId(),
                        m.getRuolo(),
                        crypto.decifra(m.getContenutoCifrato()),
                        m.getEtichettaCifrata() != null ? crypto.decifra(m.getEtichettaCifrata()) : null,
                        m.getCreatoIl()))
                .toList();

        return new SessioneDettaglioResponse(s.getId(), s.getTitolo(), messaggi);
    }

    /**
     * Imposta o toglie l'etichetta di UN messaggio. Come ogni altro accesso qui
     * dentro, passa prima dalla sessione con {@code findByIdAndUtenteId}: non si
     * cerca mai il messaggio da solo, altrimenti l'id proprietario si perde per
     * strada e si aprirebbe la porta a toccare un messaggio di un altro utente
     * (lo stesso principio IDOR di tutto il resto del progetto).
     */
    @Transactional
    public void impostaEtichetta(Long utenteId, Long sessioneId, Long messaggioId, String etichetta) {
        CompanionSession s = sessioni.findByIdAndUtenteId(sessioneId, utenteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessione non trovata"));

        CompanionMessage m = s.getMessaggi().stream()
                .filter(x -> x.getId().equals(messaggioId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Messaggio non trovato"));

        String pulita = etichetta == null ? null : etichetta.trim();
        m.setEtichettaCifrata(pulita == null || pulita.isEmpty() ? null : crypto.cifra(pulita));
        // Nessun sessioni.save(): m è un'entità gestita dentro questa transazione,
        // il dirty-checking di Hibernate scrive la modifica da solo al commit.
    }

    @Transactional
    public void cancellaUna(Long utenteId, Long sessioneId) {
        CompanionSession s = sessioni.findByIdAndUtenteId(sessioneId, utenteId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sessione non trovata"));
        sessioni.delete(s);
    }

    /** Diritto all'oblio: cancella tutte le conversazioni dell'utente. */
    @Transactional
    public void cancellaTutte(Long utenteId) {
        sessioni.deleteByUtenteId(utenteId);
    }

    /** Pulizia automatica: ogni notte rimuove le sessioni più vecchie di 30 giorni. */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void pulisciScadute() {
        LocalDateTime soglia = LocalDateTime.now().minusDays(GIORNI_CONSERVAZIONE);
        List<CompanionSession> scadute = sessioni.findByAggiornatoIlBefore(soglia);
        if (!scadute.isEmpty()) {
            sessioni.deleteAll(scadute);
            log.info("Retention Companion: cancellate {} sessioni più vecchie di {} giorni.",
                    scadute.size(), GIORNI_CONSERVAZIONE);
        }
    }

    private CompanionMessage messaggio(String ruolo, String contenuto) {
        return CompanionMessage.builder()
                .ruolo(ruolo)
                .contenutoCifrato(crypto.cifra(contenuto))
                .build();
    }

    private String titoloValido(String titolo) {
        if (titolo == null || titolo.isBlank()) {
            return "Conversazione";
        }
        return titolo.trim();
    }
}
