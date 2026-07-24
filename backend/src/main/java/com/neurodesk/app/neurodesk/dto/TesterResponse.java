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
}
