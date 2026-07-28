package com.neurodesk.app.neurodesk.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * Quanto si sta consumando, diviso per modello.
 *
 * Il prezzo NON sta qui: sta nel frontend, in un punto solo. Il motivo e' che i
 * listini cambiano (Sonnet 5 ha un prezzo di lancio fino al 31 agosto 2026) e un
 * cambio di listino non deve costringere a ricompilare e ripubblicare il backend.
 * Qui viaggiano solo i numeri misurati.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ConsumoRiepilogoResponse {

    /** Consumo per modello dall'inizio del registro. */
    private List<Riga> totale;

    /** Consumo per modello negli ultimi sette giorni: e' il ritmo su cui si proietta. */
    private List<Riga> ultimiSetteGiorni;

    /** Da quanti giorni il registro esiste davvero: sotto i sette, la proiezione va presa larga. */
    private double giorniDiStorico;

    /** Richieste servite dal provider di ripiego negli ultimi sette giorni. */
    private long ripieghiSetteGiorni;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Riga {
        private String provider;
        private String modello;
        private long tokenInput;
        private long tokenOutput;
        private long chiamate;
    }
}
