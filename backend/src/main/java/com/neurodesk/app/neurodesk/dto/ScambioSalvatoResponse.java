package com.neurodesk.app.neurodesk.dto;

/**
 * Esito del salvataggio: l'id della sessione (nuova o esistente), e gli id dei
 * due messaggi appena salvati. Servono al frontend per poterli etichettare
 * subito, senza dover ricaricare la sessione solo per scoprirli.
 */
public record ScambioSalvatoResponse(
        Long sessioneId,
        Long messaggioUtenteId,
        Long messaggioCompanionId) {
}
