package com.neurodesk.app.neurodesk.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreaTesterRequest {
    /** Etichetta breve NON identificante per l'admin (es. "tester 3"). Facoltativa. */
    @Size(max = 60)
    private String etichetta;
}
