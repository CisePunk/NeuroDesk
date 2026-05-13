package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.StudenteDto;
import com.neurodesk.app.neurodesk.service.StudenteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public StudenteDto create(@RequestBody StudenteDto dto) {
        return studenteService.save(dto);
    }
}
