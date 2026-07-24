package com.neurodesk.app.neurodesk.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    /** Codice del tester, oppure username dell'admin scuola. */
    @NotBlank
    private String codice;

    /** Password: richiesta solo per l'admin SCUOLA; ignorata per i tester. */
    private String password;
}
