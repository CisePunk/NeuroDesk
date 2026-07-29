package com.neurodesk.app.neurodesk.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Account con credenziali di accesso. Volutamente ANONIMO: non contiene ne'
 * nome, ne' cognome, ne' email. L'accesso avviene con un codice; nel database
 * ne resta solo l'hash ({@code loginHash}), mai il codice in chiaro. La mappa
 * "codice -> persona reale" la tiene la scuola fuori dal sistema (pseudonimizzazione).
 */
@Entity
@Table(name = "utenti")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Utente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Hash deterministico del codice/username di accesso. Chiave di ricerca al login. */
    @Column(nullable = false, unique = true)
    private String loginHash;

    /** BCrypt della password. Valorizzato per l'admin SCUOLA; null per i tester (accesso a solo codice). */
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Ruolo ruolo;

    @Column(nullable = false)
    @Builder.Default
    private Boolean attivo = true;

    /** Etichetta breve NON identificante, solo per l'admin (es. "tester 3"). Facoltativa. */
    private String etichetta;

    /**
     * Chiave API personale del tester, CIFRATA (mai in chiaro nel database).
     *
     * "Bring your own token": chi ce l'ha paga le proprie risposte sul proprio
     * conto. Chi non ce l'ha usa il credito comune e non cambia niente per lui.
     *
     * Non esce mai verso il browser: la pagina Codici mostra solo se c'e'.
     */
    @Column(length = 512)
    private String chiaveAiCifrata;

    /** Per quale fornitore vale la chiave: 'anthropic' oppure 'openai'. */
    @Column(length = 24)
    private String chiaveAiProvider;

    /** Da quando e' li'. Se un giorno quella chiave trapela, e' la prima domanda. */
    private java.time.LocalDateTime chiaveAiImpostataIl;

    /** Momento in cui l'utente ha dato il consenso informato. Null = non ancora dato. */
    private LocalDateTime consensoIl;

    @Column(updatable = false)
    private LocalDateTime creatoIl;

    @PrePersist
    protected void onCreate() {
        creatoIl = LocalDateTime.now();
    }
}
