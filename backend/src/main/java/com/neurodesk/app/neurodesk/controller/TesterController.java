package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.ConsumoRiepilogoResponse;
import com.neurodesk.app.neurodesk.dto.CreaTesterRequest;
import com.neurodesk.app.neurodesk.dto.TesterCreatoResponse;
import com.neurodesk.app.neurodesk.dto.TesterResponse;
import com.neurodesk.app.neurodesk.service.TesterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Gestione dei codici tester. Solo l'admin SCUOLA (imposto in SecurityConfig).
 */
@RestController
@RequestMapping("/api/tester")
@RequiredArgsConstructor
public class TesterController {

    private final TesterService testerService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TesterCreatoResponse crea(@Valid @RequestBody(required = false) CreaTesterRequest req) {
        String etichetta = req != null ? req.getEtichetta() : null;
        return testerService.crea(etichetta);
    }

    @GetMapping
    public List<TesterResponse> lista() {
        return testerService.lista();
    }

    /**
     * Consumo aggregato per modello, in tutto e negli ultimi sette giorni.
     * Serve alla pagina Codici per dire quanto si e' speso e fra quanti giorni
     * finisce il credito al ritmo attuale.
     */
    @GetMapping("/consumo")
    public ConsumoRiepilogoResponse consumo() {
        return testerService.riepilogoConsumo();
    }

    /**
     * Attiva/disattiva un tester. Disattivarlo revoca l'accesso: sul backend e' immediato
     * (JwtAuthFilter ricontrolla 'attivo' a ogni richiesta); sul Companion (servizio Node,
     * che si fida del solo JWT) ha effetto entro ~60s, perche' interroga l'endpoint interno
     * /api/internal/utente/{id}/stato con una cache di 60s.
     */
    @PutMapping("/{id}/stato")
    public void impostaStato(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Boolean attivo = body == null ? null : body.get("attivo");
        if (attivo == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campo 'attivo' (true/false) richiesto.");
        }
        testerService.impostaStato(id, attivo);
    }
}
