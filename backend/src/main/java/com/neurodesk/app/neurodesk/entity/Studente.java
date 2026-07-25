package com.neurodesk.app.neurodesk.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "studenti")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Studente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String cognome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    @Builder.Default
    private Boolean attivo = true;

    private String livelloEnergiaPreferito;

    /** Account-codice ANONIMO collegato (pseudonimizzazione): il nome sta qui, i dati/chat sul codice. */
    private Long utenteId;

    @Column(updatable = false)
    private LocalDateTime creatoIl;

    @PrePersist
    protected void onCreate() {
        creatoIl = LocalDateTime.now();
    }
}