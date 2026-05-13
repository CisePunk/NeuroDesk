package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.ModuloDto;
import com.neurodesk.app.neurodesk.entity.Modulo;
import com.neurodesk.app.neurodesk.mapper.ModuloMapper;
import com.neurodesk.app.neurodesk.repository.ModuloRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ModuloService {

    private final ModuloRepository moduloRepository;
    private final ModuloMapper moduloMapper;

    public List<ModuloDto> findAll() {
        return moduloRepository.findAll()
                .stream()
                .map(moduloMapper::toDto)
                .toList();
    }

    public ModuloDto save(ModuloDto dto) {
        Modulo modulo = moduloMapper.toEntity(dto);
        return moduloMapper.toDto(moduloRepository.save(modulo));
    }
}
