package com.neurodesk.app.neurodesk.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Richiesta di contatto inviata dal form pubblico della landing (alternativa
 * alla mail). Salvata come "lead" a disposizione dell'admin SCUOLA: di fatto un
 * piccolo CRM interno, senza dipendere da servizi di terzi. Contiene solo i dati
 * che la persona fornisce volontariamente + il consenso al trattamento.
 */
@Entity
@Table(name = "contatto")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contatto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String messaggio;

    /** Consenso al trattamento dei dati per rispondere alla richiesta (obbligatorio). */
    @Column(nullable = false)
    private boolean consenso;

    /** Stato di gestione lato SCUOLA (NUOVO, GESTITO, ...). Comodo per il follow-up. */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String stato = "NUOVO";

    @Column(updatable = false)
    private LocalDateTime creatoIl;

    @PrePersist
    protected void onCreate() {
        creatoIl = LocalDateTime.now();
    }
}
