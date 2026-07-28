package com.neurodesk.app.neurodesk.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Una chiamata al provider AI, con quanto e' costata in token.
 *
 * Esiste per rispondere a una domanda che prima non aveva risposta: quanto
 * consuma ciascun accesso, e c'e' qualcuno che sta usando il Companion per
 * fatti suoi invece che per provarlo. Non blocca e non limita nessuno: misura.
 *
 * Qui non passa nessun contenuto. Solo numeri, il provider, il modello e due
 * id: il testo delle conversazioni resta cifrato in {@link CompanionMessage}.
 */
@Entity
@Table(name = "companion_consumo")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConsumoAi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** A chi va imputato. Nessuna relazione JPA: il registro sopravvive alla revoca dell'accesso. */
    @Column(nullable = false)
    private Long utenteId;

    /** La sessione della richiesta, quando la conosciamo. */
    private Long sessioneId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime creatoIl;

    @Column(nullable = false, length = 24)
    private String provider;

    @Column(length = 64)
    private String modello;

    @Column(nullable = false)
    private int tokenInput;

    @Column(nullable = false)
    private int tokenOutput;

    /** Valorizzato solo se ha risposto il provider di ripiego: un guasto invisibile a chi scrive, visibile a noi. */
    @Column(length = 24)
    private String ripiegoDa;

    @PrePersist
    void primaDiSalvare() {
        if (creatoIl == null) creatoIl = LocalDateTime.now();
    }
}
