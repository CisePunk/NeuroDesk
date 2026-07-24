package com.neurodesk.app.neurodesk.dto;

import com.neurodesk.app.neurodesk.entity.Ruolo;
import lombok.AllArgsConstructor;
import lombok.Data;

/** Risposta al login. Non contiene alcun dato identificante, solo ruolo e stato consenso. */
@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private Ruolo ruolo;
    /** true se e' uno STUDENTE che non ha ancora dato il consenso (il frontend mostra la schermata). */
    private boolean consensoRichiesto;
}
