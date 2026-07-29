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

    /**
     * Ha impostato una chiave API propria? Solo SE, mai quale: serve alla pagina
     * del Companion per mostrare "stai usando la tua chiave" invece del modulo
     * per inserirla.
     */
    private boolean chiavePropria;

    /** Per quale fornitore, se c'e'. */
    private String chiaveProvider;
}
