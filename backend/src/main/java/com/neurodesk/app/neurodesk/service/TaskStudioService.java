package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.TaskStudioDto;
import com.neurodesk.app.neurodesk.entity.Modulo;
import com.neurodesk.app.neurodesk.entity.Studente;
import com.neurodesk.app.neurodesk.entity.TaskStudio;
import com.neurodesk.app.neurodesk.mapper.TaskStudioMapper;
import com.neurodesk.app.neurodesk.repository.ModuloRepository;
import com.neurodesk.app.neurodesk.repository.StudenteRepository;
import com.neurodesk.app.neurodesk.repository.TaskStudioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskStudioService {

    private final TaskStudioRepository taskStudioRepository;
    private final StudenteRepository studenteRepository;
    private final ModuloRepository moduloRepository;
    private final TaskStudioMapper taskStudioMapper;

    public List<TaskStudioDto> findAll() {
        return taskStudioRepository.findAll()
                .stream()
                .map(taskStudioMapper::toDto)
                .toList();
    }

    public TaskStudioDto save(TaskStudioDto dto) {
        Studente studente = studenteRepository.findById(dto.getStudenteId())
                .orElseThrow(() -> new RuntimeException("Studente non trovato"));

        Modulo modulo = moduloRepository.findById(dto.getModuloId())
                .orElseThrow(() -> new RuntimeException("Modulo non trovato"));

        TaskStudio task = TaskStudio.builder()
                .titolo(dto.getTitolo())
                .descrizione(dto.getDescrizione())
                .priorita(dto.getPriorita())
                .stato(dto.getStato())
                .durataStimataMinuti(dto.getDurataStimataMinuti())
                .tagFocus(dto.getTagFocus())
                .finestraEnergia(dto.getFinestraEnergia())
                .studente(studente)
                .modulo(modulo)
                .build();

        return taskStudioMapper.toDto(taskStudioRepository.save(task));
    }
}