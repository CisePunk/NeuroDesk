package com.neurodesk.app.neurodesk.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "moduli")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Modulo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titolo;

    @Column(columnDefinition = "TEXT")
    private String descrizione;

    @Column(nullable = false)
    private String tecnologia;

    @Column(nullable = false)
    private String stato;

    @Column(nullable = false)
    private String difficolta;

    private String caricoCognitivo;

    @Column(updatable = false)
    private LocalDateTime creatoIl;

    @PrePersist
    protected void onCreate() {
        creatoIl = LocalDateTime.now();
    }
}
