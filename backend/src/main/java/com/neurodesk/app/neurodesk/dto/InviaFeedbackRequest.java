package com.neurodesk.app.neurodesk.dto;

import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * Invio di un feedback da parte di un tester. {@code risposte} mappa id-domanda ->
 * id-opzione (validate contro FeedbackCatalogo lato service). I due testi sono liberi
 * e facoltativi.
 */
public record InviaFeedbackRequest(
        Map<String, String> risposte,
        @Size(max = 4000) String descrizioneErrori,
        @Size(max = 4000) String commento) {
}
