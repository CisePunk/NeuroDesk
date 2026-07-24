package com.neurodesk.app.neurodesk.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/** Restituito UNA SOLA VOLTA alla creazione: contiene il codice in chiaro da consegnare al tester. */
@Data
@AllArgsConstructor
public class TesterCreatoResponse {
    private Long id;
    private String codice;
    private String etichetta;
}
