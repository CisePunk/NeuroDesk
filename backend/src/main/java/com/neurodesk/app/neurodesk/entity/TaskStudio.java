package com.neurodesk.app.neurodesk.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_studio")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskStudio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titolo;

    @Column(columnDefinition = "TEXT")
    private String descrizione;

    @Column(nullable = false)
    private String priorita;

    @Column(nullable = false)
    private String stato;

    private Integer durataStimataMinuti;

    private String tagFocus;

    private String finestraEnergia;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "studente_id", nullable = false)
    private Studente studente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "modulo_id", nullable = false)
    private Modulo modulo;

    @Column(updatable = false)
    private LocalDateTime creatoIl;

    private LocalDateTime aggiornatoIl;

    @PrePersist
    protected void onCreate() {
        creatoIl = LocalDateTime.now();
        aggiornatoIl = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        aggiornatoIl = LocalDateTime.now();
    }
}
