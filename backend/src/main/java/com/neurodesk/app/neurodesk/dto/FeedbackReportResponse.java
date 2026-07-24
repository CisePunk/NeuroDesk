package com.neurodesk.app.neurodesk.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Report aggregato dei feedback per l'admin SCUOLA. Contiene, per ogni domanda,
 * il conteggio di ciascuna opzione, e in coda l'elenco dei testi liberi. Nessun
 * dato identificante: solo l'etichetta non identificante del tester (es. "tester 3").
 */
public record FeedbackReportResponse(
        int totale,
        List<DomandaReport> domande,
        List<Commento> commenti) {

    /** Aggregato di una singola domanda: quante risposte per ogni opzione. */
    public record DomandaReport(
            String id,
            String testo,
            List<OpzioneConteggio> opzioni) {
    }

    public record OpzioneConteggio(
            String valore,
            String etichetta,
            long conteggio) {
    }

    /** Un testo libero lasciato da un tester (errori e/o commento). */
    public record Commento(
            LocalDateTime creatoIl,
            String etichetta,
            String descrizioneErrori,
            String commento) {
    }
}
