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

    /** Messaggi REALI scritti dall'utente al Companion (fonte: conversazioni, non token). */
    private long messaggiUsati;

    /** Prima volta che ha scritto al Companion. */
    private LocalDateTime primaAttivita;

    /** Ultima volta che ha scritto al Companion. */
    private LocalDateTime ultimaAttivita;

    /** Ha una chiave API propria? La chiave in se' non esce mai da qui. */
    private boolean chiavePropria;

    /** Per quale fornitore vale, se c'e'. */
    private String chiaveProvider;
}
