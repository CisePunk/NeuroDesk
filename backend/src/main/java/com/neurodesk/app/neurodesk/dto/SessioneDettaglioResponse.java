package com.neurodesk.app.neurodesk.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Dettaglio di una sessione: i messaggi decifrati, in ordine. Solo per il proprietario. */
public record SessioneDettaglioResponse(
        Long id,
        String titolo,
        List<MessaggioResponse> messaggi) {

    public record MessaggioResponse(
            Long id,
            String ruolo,
            String contenuto,
            /** Decifrata; null se il messaggio non ha un'etichetta. */
            String etichetta,
            LocalDateTime creatoIl) {
    }
}
