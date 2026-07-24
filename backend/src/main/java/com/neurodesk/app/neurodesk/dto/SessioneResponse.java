package com.neurodesk.app.neurodesk.dto;

import java.time.LocalDateTime;

/** Riga d'elenco delle sessioni dell'utente. Nessun contenuto sensibile: solo titolo e data. */
public record SessioneResponse(
        Long id,
        String titolo,
        LocalDateTime aggiornatoIl) {
}
