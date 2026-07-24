package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.FeedbackReportResponse;
import com.neurodesk.app.neurodesk.dto.FeedbackReportResponse.Commento;
import com.neurodesk.app.neurodesk.dto.FeedbackReportResponse.DomandaReport;
import com.neurodesk.app.neurodesk.dto.FeedbackReportResponse.OpzioneConteggio;
import com.neurodesk.app.neurodesk.dto.InviaFeedbackRequest;
import com.neurodesk.app.neurodesk.entity.Feedback;
import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.repository.FeedbackRepository;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import com.neurodesk.app.neurodesk.service.FeedbackCatalogo.Domanda;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Salvataggio e aggregazione dei feedback tester. Le domande valide sono quelle di
 * {@link FeedbackCatalogo}: qualsiasi domanda/opzione fuori catalogo viene rifiutata.
 */
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final FeedbackRepository feedbackRepository;
    private final UtenteRepository utenteRepository;

    @Transactional
    public void invia(Long utenteId, InviaFeedbackRequest req) {
        Map<String, String> risposte = req.risposte() == null ? Map.of() : req.risposte();

        // Valida ogni risposta contro il catalogo: domanda nota + opzione ammessa.
        Map<String, String> pulite = new HashMap<>();
        for (Map.Entry<String, String> e : risposte.entrySet()) {
            Domanda domanda = FeedbackCatalogo.byId(e.getKey());
            if (domanda == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Domanda sconosciuta: " + e.getKey());
            }
            String valore = e.getValue();
            if (valore != null && !valore.isBlank()) {
                if (!domanda.ammette(valore)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Risposta non valida per '" + e.getKey() + "'.");
                }
                pulite.put(domanda.id(), valore);
            }
        }

        String descrizione = normalizza(req.descrizioneErrori());
        String commento = normalizza(req.commento());

        if (pulite.isEmpty() && descrizione == null && commento == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Il feedback e' vuoto: rispondi ad almeno una domanda o scrivi un commento.");
        }

        feedbackRepository.save(Feedback.builder()
                .utenteId(utenteId)
                .risposte(pulite)
                .descrizioneErrori(descrizione)
                .commento(commento)
                .build());
    }

    @Transactional(readOnly = true)
    public FeedbackReportResponse report() {
        List<Feedback> tutti = feedbackRepository.findAllByOrderByCreatoIlDesc();
        Map<Long, String> etichette = etichettePerUtente();

        List<DomandaReport> domande = FeedbackCatalogo.DOMANDE.stream()
                .map(d -> aggregaDomanda(d, tutti))
                .toList();

        List<Commento> commenti = tutti.stream()
                .filter(f -> f.getDescrizioneErrori() != null || f.getCommento() != null)
                .map(f -> new Commento(
                        f.getCreatoIl(),
                        etichette.get(f.getUtenteId()),
                        f.getDescrizioneErrori(),
                        f.getCommento()))
                .toList();

        return new FeedbackReportResponse(tutti.size(), domande, commenti);
    }

    /** Export CSV di tutti i feedback: una riga per feedback, una colonna per domanda + i testi liberi. */
    @Transactional(readOnly = true)
    public String esportaCsv() {
        List<Feedback> tutti = feedbackRepository.findAllByOrderByCreatoIlDesc();
        Map<Long, String> etichette = etichettePerUtente();

        StringBuilder sb = new StringBuilder();

        // Intestazione: data, tester, poi il testo di ogni domanda, poi i due testi liberi.
        sb.append(csv("data")).append(',').append(csv("tester"));
        for (Domanda d : FeedbackCatalogo.DOMANDE) {
            sb.append(',').append(csv(d.testo()));
        }
        sb.append(',').append(csv("errori descritti"))
                .append(',').append(csv("commento")).append("\r\n");

        for (Feedback f : tutti) {
            sb.append(csv(f.getCreatoIl() == null ? "" : TS.format(f.getCreatoIl())));
            sb.append(',').append(csv(etichette.getOrDefault(f.getUtenteId(), "")));
            for (Domanda d : FeedbackCatalogo.DOMANDE) {
                String valore = f.getRisposte().get(d.id());
                sb.append(',').append(csv(valore == null ? "" : d.etichettaDi(valore)));
            }
            sb.append(',').append(csv(f.getDescrizioneErrori() == null ? "" : f.getDescrizioneErrori()));
            sb.append(',').append(csv(f.getCommento() == null ? "" : f.getCommento()));
            sb.append("\r\n");
        }

        return sb.toString();
    }

    private DomandaReport aggregaDomanda(Domanda d, List<Feedback> tutti) {
        Map<String, Long> conteggi = tutti.stream()
                .map(f -> f.getRisposte().get(d.id()))
                .filter(v -> v != null && !v.isBlank())
                .collect(Collectors.groupingBy(v -> v, Collectors.counting()));

        List<OpzioneConteggio> opzioni = d.opzioni().stream()
                .map(o -> new OpzioneConteggio(o.valore(), o.etichetta(),
                        conteggi.getOrDefault(o.valore(), 0L)))
                .toList();

        return new DomandaReport(d.id(), d.testo(), opzioni);
    }

    private Map<Long, String> etichettePerUtente() {
        return utenteRepository.findAll().stream()
                .filter(u -> u.getEtichetta() != null)
                .collect(Collectors.toMap(Utente::getId, Utente::getEtichetta, (a, b) -> a));
    }

    private static String normalizza(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /** Escaping CSV secondo RFC 4180: racchiude tra virgolette e raddoppia le virgolette interne. */
    private static String csv(String value) {
        String v = value == null ? "" : value;
        return '"' + v.replace("\"", "\"\"") + '"';
    }
}
