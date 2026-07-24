package com.neurodesk.app.neurodesk.controller;

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

    /** Attiva/disattiva un tester. Disattivarlo revoca subito l'accesso (il filtro JWT ricontrolla attivo). */
    @PutMapping("/{id}/stato")
    public void impostaStato(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Boolean attivo = body == null ? null : body.get("attivo");
        if (attivo == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campo 'attivo' (true/false) richiesto.");
        }
        testerService.impostaStato(id, attivo);
    }
}
