package com.neurodesk.app.neurodesk.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Feedback lasciato da un tester durante la fase di prova. Volutamente povero di
 * dati identificanti: si tiene solo l'id dell'{@link Utente} che l'ha inviato
 * (per tracciabilita' tecnica, mai mostrato nei report), le risposte a scelta
 * multipla e due testi liberi. Le domande sono fisse e definite in
 * {@code FeedbackCatalogo}: qui le risposte sono una mappa domanda -> valore,
 * cosi' aggiungere/togliere una domanda non richiede modifiche allo schema.
 */
@Entity
@Table(name = "feedback")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Id dell'utente che ha inviato il feedback. Per tracciabilita', non mostrato nei report. */
    @Column(nullable = false, updatable = false)
    private Long utenteId;

    /** Risposte a scelta multipla: chiave = id domanda, valore = id opzione (vedi FeedbackCatalogo). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "feedback_risposte", joinColumns = @JoinColumn(name = "feedback_id"))
    @MapKeyColumn(name = "domanda", length = 40)
    @Column(name = "valore", length = 40)
    @Builder.Default
    private Map<String, String> risposte = new HashMap<>();

    /** Descrizione libera degli errori/blocchi incontrati. Facoltativa. */
    @Column(columnDefinition = "TEXT")
    private String descrizioneErrori;

    /** Commento libero finale. Facoltativo. */
    @Column(columnDefinition = "TEXT")
    private String commento;

    @Column(updatable = false)
    private LocalDateTime creatoIl;

    @PrePersist
    protected void onCreate() {
        creatoIl = LocalDateTime.now();
    }
}
