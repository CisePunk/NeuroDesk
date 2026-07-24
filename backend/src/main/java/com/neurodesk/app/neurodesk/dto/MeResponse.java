package com.neurodesk.app.neurodesk.dto;

import com.neurodesk.app.neurodesk.entity.Ruolo;
import lombok.AllArgsConstructor;
import lombok.Data;

/** "Chi sono": solo ruolo e stato consenso. Nessun nome, email o identificativo. */
@Data
@AllArgsConstructor
public class MeResponse {
    private Ruolo ruolo;
    private boolean consensoDato;
}
