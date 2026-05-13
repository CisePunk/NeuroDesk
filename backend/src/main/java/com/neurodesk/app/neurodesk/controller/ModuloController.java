package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.ModuloDto;
import com.neurodesk.app.neurodesk.service.ModuloService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/moduli")
@RequiredArgsConstructor
public class ModuloController {

    private final ModuloService moduloService;

    @GetMapping
    public List<ModuloDto> getAll() {
        return moduloService.findAll();
    }

    @PostMapping
    public ModuloDto create(@RequestBody ModuloDto dto) {
        return moduloService.save(dto);
    }
}
