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

    /**
     * Etichetta CIFRATA, facoltativa (AES-GCM come il contenuto). NULL finché
     * nessuno la imposta. È testo libero scritto dalla persona — non va
     * trattata come {@code titolo} della sessione, che resta in chiaro solo
     * perché arriva da un vocabolario chiuso, mai da quello che scrive l'utente.
     */
    @Column(columnDefinition = "TEXT")
    private String etichettaCifrata;

    @Column(updatable = false)
    private LocalDateTime creatoIl;

    @PrePersist
    protected void onCreate() {
        creatoIl = LocalDateTime.now();
    }
}
