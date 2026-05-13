package com.neurodesk.app.neurodesk.mapper;

import com.neurodesk.app.neurodesk.dto.StudenteDto;
import com.neurodesk.app.neurodesk.entity.Studente;
import org.springframework.stereotype.Component;

@Component
public class StudenteMapper {

    public StudenteDto toDto(Studente entity) {
        return StudenteDto.builder()
                .id(entity.getId())
                .nome(entity.getNome())
                .cognome(entity.getCognome())
                .email(entity.getEmail())
                .attivo(entity.getAttivo())
                .profiloNeurodivergente(entity.getProfiloNeurodivergente())
                .livelloEnergiaPreferito(entity.getLivelloEnergiaPreferito())
                .creatoIl(entity.getCreatoIl())
                .build();
    }

    public Studente toEntity(StudenteDto dto) {
        return Studente.builder()
                .nome(dto.getNome())
                .cognome(dto.getCognome())
                .email(dto.getEmail())
                .attivo(dto.getAttivo() != null ? dto.getAttivo() : true)
                .profiloNeurodivergente(dto.getProfiloNeurodivergente())
                .livelloEnergiaPreferito(dto.getLivelloEnergiaPreferito())
                .build();
    }

    public void updateEntity(StudenteDto dto, Studente entity) {
        entity.setNome(dto.getNome());
        entity.setCognome(dto.getCognome());
        entity.setEmail(dto.getEmail());
        if (dto.getAttivo() != null) {
            entity.setAttivo(dto.getAttivo());
        }
        entity.setProfiloNeurodivergente(dto.getProfiloNeurodivergente());
        entity.setLivelloEnergiaPreferito(dto.getLivelloEnergiaPreferito());
    }
}
