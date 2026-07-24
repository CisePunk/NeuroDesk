package com.neurodesk.app.neurodesk.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Dettaglio di una sessione: i messaggi decifrati, in ordine. Solo per il proprietario. */
public record SessioneDettaglioResponse(
        Long id,
        String titolo,
        List<MessaggioResponse> messaggi) {

    public record MessaggioResponse(
            String ruolo,
            String contenuto,
            LocalDateTime creatoIl) {
    }
}
