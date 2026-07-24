package com.neurodesk.app.neurodesk.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Una conversazione Companion di un utente. I messaggi sono figli con cascata:
 * cancellando la sessione (a mano, per scadenza a 30 giorni, o alla rimozione del
 * tester) spariscono anche i messaggi. Nessun dato identificante: solo l'id
 * dell'{@link Utente} proprietario. Il titolo è un riassunto breve NON cifrato
 * (serve solo a riconoscere la sessione nell'elenco): tienilo generico.
 */
@Entity
@Table(name = "companion_sessioni")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanionSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Id dell'utente proprietario. Un utente vede SOLO le proprie sessioni. */
    @Column(nullable = false)
    private Long utenteId;

    /** Riassunto breve/generico per l'elenco (non cifrato). Es. "burocrazia". */
    @Column(length = 120)
    private String titolo;

    @Column(updatable = false)
    private LocalDateTime creatoIl;

    /** Aggiornato a ogni nuovo scambio: guida sia l'ordinamento sia la scadenza a 30 giorni. */
    private LocalDateTime aggiornatoIl;

    @OneToMany(mappedBy = "sessione", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("creatoIl ASC, id ASC")
    @Builder.Default
    private List<CompanionMessage> messaggi = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        creatoIl = LocalDateTime.now();
        if (aggiornatoIl == null) {
            aggiornatoIl = creatoIl;
        }
    }

    public void aggiungi(CompanionMessage messaggio) {
        messaggio.setSessione(this);
        messaggi.add(messaggio);
        aggiornatoIl = LocalDateTime.now();
    }
}
