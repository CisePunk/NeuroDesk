package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.StudenteDto;
import com.neurodesk.app.neurodesk.service.StudenteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/studenti")
@RequiredArgsConstructor
public class StudenteController {

    private final StudenteService studenteService;

    @GetMapping
    public List<StudenteDto> getAll() {
        return studenteService.findAll();
    }

    @PostMapping
    public StudenteDto create(@Valid @RequestBody StudenteDto dto) {
        return studenteService.save(dto);
    }

    /** Attiva/revoca l'accesso dell'utente (agisce sul codice-account collegato). */
    @PutMapping("/{id}/stato")
    public void impostaStato(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Boolean attivo = body == null ? null : body.get("attivo");
        if (attivo == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campo 'attivo' (true/false) richiesto.");
        }
        studenteService.impostaStato(id, attivo);
    }
}
