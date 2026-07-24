package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.SalvaScambioRequest;
import com.neurodesk.app.neurodesk.dto.ScambioSalvatoResponse;
import com.neurodesk.app.neurodesk.dto.SessioneDettaglioResponse;
import com.neurodesk.app.neurodesk.dto.SessioneResponse;
import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.service.CompanionMemoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Memoria delle conversazioni Companion. Ogni utente vede e gestisce SOLO le proprie
 * sessioni: l'id utente arriva dal token, mai dal client. La scuola non ha accesso
 * ai contenuti sensibili dei singoli (qui non c'è nessun endpoint per ruolo SCUOLA).
 */
@RestController
@RequestMapping("/api/companion-sessions")
@RequiredArgsConstructor
public class CompanionSessionController {

    private final CompanionMemoryService memory;

    /** Salva uno scambio (messaggio utente + risposta). Apre una sessione nuova se sessioneId è null. */
    @PostMapping("/scambio")
    @ResponseStatus(HttpStatus.CREATED)
    public ScambioSalvatoResponse salva(@AuthenticationPrincipal Utente utente,
                                        @Valid @RequestBody SalvaScambioRequest req) {
        return memory.salvaScambio(utente.getId(), req);
    }

    @GetMapping
    public List<SessioneResponse> lista(@AuthenticationPrincipal Utente utente) {
        return memory.listaSessioni(utente.getId());
    }

    @GetMapping("/{id}")
    public SessioneDettaglioResponse dettaglio(@AuthenticationPrincipal Utente utente,
                                               @PathVariable Long id) {
        return memory.dettaglio(utente.getId(), id);
    }

    /** Cancella tutta la propria cronologia (diritto all'oblio). */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancellaTutte(@AuthenticationPrincipal Utente utente) {
        memory.cancellaTutte(utente.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancellaUna(@AuthenticationPrincipal Utente utente, @PathVariable Long id) {
        memory.cancellaUna(utente.getId(), id);
    }
}
