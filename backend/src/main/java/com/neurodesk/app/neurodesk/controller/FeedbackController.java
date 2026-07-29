package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.FeedbackReportResponse;
import com.neurodesk.app.neurodesk.dto.InviaFeedbackRequest;
import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.service.FeedbackCatalogo;
import com.neurodesk.app.neurodesk.service.FeedbackCatalogo.Domanda;
import com.neurodesk.app.neurodesk.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Feedback dei tester. L'invio e lo schema delle domande sono per ogni utente
 * autenticato (i tester); report ed export CSV sono riservati all'admin SCUOLA
 * (imposto in SecurityConfig sui path /report ed /export.csv).
 */
@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    /**
     * Domande fisse da mostrare nel form (pulsanti). Fonte unica: FeedbackCatalogo.
     *
     * <p>{@code lang} cambia SOLO le etichette mostrate: i valori salvati restano gli
     * stessi in tutte le lingue, quindi il report aggregato continua a sommare
     * insieme la risposta di chi ha cliccato "Molto facile" e quella di chi ha
     * cliccato "Very easy". Lingua sconosciuta o assente: italiano.
     */
    @GetMapping("/schema")
    public List<Domanda> schema(@RequestParam(required = false) String lang) {
        return FeedbackCatalogo.in(lang);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public void invia(@AuthenticationPrincipal Utente utente,
                      @Valid @RequestBody InviaFeedbackRequest req) {
        feedbackService.invia(utente.getId(), req);
    }

    /** Report aggregato. Solo SCUOLA. */
    @GetMapping("/report")
    public FeedbackReportResponse report() {
        return feedbackService.report();
    }

    /** Export CSV di tutti i feedback. Solo SCUOLA. */
    @GetMapping("/export.csv")
    public ResponseEntity<byte[]> esportaCsv() {
        // BOM UTF-8 iniziale: cosi' Excel apre correttamente le accentate.
        byte[] bom = new byte[] {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] corpo = feedbackService.esportaCsv().getBytes(StandardCharsets.UTF_8);
        byte[] out = new byte[bom.length + corpo.length];
        System.arraycopy(bom, 0, out, 0, bom.length);
        System.arraycopy(corpo, 0, out, bom.length, corpo.length);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"feedback-neurodesk.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(out);
    }
}
