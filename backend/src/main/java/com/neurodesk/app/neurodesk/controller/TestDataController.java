package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.StudenteDto;
import com.neurodesk.app.neurodesk.service.TestDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Endpoint SOLO per l'ambiente di test: genera/rimuove utenti FITTIZI.
 *
 * In produzione {@code neurodesk.test-mode=false}: ogni rotta di scrittura
 * risponde 404, come se il controller non esistesse. Non c'e' alcuna
 * registrazione pubblica di utenti reali: in produzione gli utenti li inserisce
 * soltanto la scuola (che ha firmato l'accordo privacy) tramite /api/studenti.
 */
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestDataController {

    @Value("${neurodesk.test-mode:false}")
    private boolean testMode;

    private final TestDataService testDataService;

    /**
     * Dice al frontend se mostrare i comandi di test. NON e' pubblico: come tutto
     * /api/test/** richiede il ruolo SCUOLA, quindi per chiunque altro risponde 401.
     * Il frontend tratta l'errore come "test-mode spento" (nessun comando mostrato).
     */
    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("enabled", testMode);
    }

    @PostMapping("/seed/studenti")
    public List<StudenteDto> seedStudenti(@RequestParam(defaultValue = "5") int count) {
        requireTestMode();
        if (count < 1 || count > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "count deve essere tra 1 e 50");
        }
        return testDataService.seedStudenti(count);
    }

    @DeleteMapping("/seed/studenti")
    public Map<String, Integer> rimuoviStudenti() {
        requireTestMode();
        return Map.of("rimossi", testDataService.rimuoviStudentiDiTest());
    }

    private void requireTestMode() {
        if (!testMode) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }
}
