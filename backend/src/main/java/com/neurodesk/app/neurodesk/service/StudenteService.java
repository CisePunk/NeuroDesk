package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.StudenteDto;
import com.neurodesk.app.neurodesk.entity.Studente;
import com.neurodesk.app.neurodesk.mapper.StudenteMapper;
import com.neurodesk.app.neurodesk.repository.StudenteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudenteService {

    private final StudenteRepository studenteRepository;
    private final StudenteMapper studenteMapper;

    public List<StudenteDto> findAll() {
        return studenteRepository.findAll()
                .stream()
                .map(studenteMapper::toDto)
                .toList();
    }

    public StudenteDto save(StudenteDto dto) {
        Studente studente = studenteMapper.toEntity(dto);
        return studenteMapper.toDto(studenteRepository.save(studente));
    }
}
