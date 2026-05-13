package com.neurodesk.app.neurodesk.mapper;

import com.neurodesk.app.neurodesk.dto.ModuloDto;
import com.neurodesk.app.neurodesk.entity.Modulo;
import org.springframework.stereotype.Component;

@Component
public class ModuloMapper {

    public ModuloDto toDto(Modulo entity) {
        return ModuloDto.builder()
                .id(entity.getId())
                .titolo(entity.getTitolo())
                .descrizione(entity.getDescrizione())
                .tecnologia(entity.getTecnologia())
                .stato(entity.getStato())
                .difficolta(entity.getDifficolta())
                .caricoCognitivo(entity.getCaricoCognitivo())
                .creatoIl(entity.getCreatoIl())
                .build();
    }

    public Modulo toEntity(ModuloDto dto) {
        return Modulo.builder()
                .titolo(dto.getTitolo())
                .descrizione(dto.getDescrizione())
                .tecnologia(dto.getTecnologia())
                .stato(dto.getStato())
                .difficolta(dto.getDifficolta())
                .caricoCognitivo(dto.getCaricoCognitivo())
                .build();
    }

    public void updateEntity(ModuloDto dto, Modulo entity) {
        entity.setTitolo(dto.getTitolo());
        entity.setDescrizione(dto.getDescrizione());
        entity.setTecnologia(dto.getTecnologia());
        entity.setStato(dto.getStato());
        entity.setDifficolta(dto.getDifficolta());
        entity.setCaricoCognitivo(dto.getCaricoCognitivo());
    }
}
