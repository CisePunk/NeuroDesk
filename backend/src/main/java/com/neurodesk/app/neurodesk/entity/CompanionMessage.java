package com.neurodesk.app.neurodesk.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Un singolo messaggio di una {@link CompanionSession}. Il contenuto è SEMPRE
 * cifrato ({@code contenutoCifrato}) perché sensibile: la cifratura/decifratura
 * la fa il service con {@code CryptoService}, l'entità conserva solo il testo cifrato.
 * {@code ruolo} vale "user" (l'utente) o "assistant" (il companion), coerente con
 * ciò che si invia all'AI.
 */
@Entity
@Table(name = "companion_messaggi")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanionMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sessione_id", nullable = false)
    private CompanionSession sessione;

    /** "user" oppure "assistant". */
    @Column(nullable = false, length = 16)
    private String ruolo;

    /** Testo del messaggio CIFRATO (AES-GCM). Mai in chiaro nel database. */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String contenutoCifrato;

    @Column(updatable = false)
    private LocalDateTime creatoIl;

    @PrePersist
    protected void onCreate() {
        creatoIl = LocalDateTime.now();
    }
}
