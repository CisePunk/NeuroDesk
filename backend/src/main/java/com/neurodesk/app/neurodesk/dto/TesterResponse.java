package com.neurodesk.app.neurodesk.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;

/** Vista elenco per l'admin. NON contiene il codice (è solo hash) né dati identificanti. */
@Data
@AllArgsConstructor
public class TesterResponse {
    private Long id;
    private String etichetta;
    private boolean attivo;
    private boolean consensoDato;
    private LocalDateTime creatoIl;

    // Consumo AI. Non limita niente: serve a vedere se un accesso consuma molto
    // piu' degli altri, cioe' se qualcuno lo sta usando per fatti suoi invece
    // che per provarlo. La decisione su cosa farne resta a una persona.
    private long chiamate;
    private long tokenInput;
    private long tokenOutput;
    private LocalDateTime ultimoUso;
}
