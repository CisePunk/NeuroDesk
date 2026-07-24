package com.neurodesk.app.neurodesk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Salvataggio di uno scambio (messaggio utente + risposta del companion) in una
 * sessione. Se {@code sessioneId} è null si apre una nuova sessione. Il testo qui
 * arriva in chiaro e viene cifrato dal service prima di salvarlo.
 */
public record SalvaScambioRequest(
        Long sessioneId,
        @Size(max = 120) String titolo,
        @NotBlank @Size(max = 4000) String messaggioUtente,
        @NotBlank @Size(max = 8000) String rispostaCompanion) {
}
