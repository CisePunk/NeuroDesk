package com.neurodesk.app.neurodesk.dto;

import jakarta.validation.constraints.Size;

/**
 * Imposta o toglie l'etichetta di un messaggio. {@code etichetta} vuoto o
 * assente TOGLIE l'etichetta, non è un errore: è il modo per tornare indietro.
 * Corta apposta (60 caratteri): è un punto di riferimento, non un secondo
 * messaggio.
 */
public record ImpostaEtichettaRequest(@Size(max = 60) String etichetta) {
}
