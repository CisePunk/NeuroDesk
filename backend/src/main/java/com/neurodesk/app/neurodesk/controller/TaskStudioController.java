package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.TaskStudioDto;
import com.neurodesk.app.neurodesk.service.TaskStudioService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/task")
@RequiredArgsConstructor
public class TaskStudioController {

    private final TaskStudioService taskStudioService;

    @GetMapping
    public List<TaskStudioDto> getAll() {
        return taskStudioService.findAll();
    }

    @PostMapping
    public TaskStudioDto create(@RequestBody TaskStudioDto dto) {
        return taskStudioService.save(dto);
    }
}