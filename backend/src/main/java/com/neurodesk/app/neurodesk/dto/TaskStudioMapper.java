package com.neurodesk.app.neurodesk.mapper;

import com.neurodesk.app.neurodesk.dto.TaskStudioDto;
import com.neurodesk.app.neurodesk.entity.TaskStudio;
import org.springframework.stereotype.Component;

@Component
public class TaskStudioMapper {

    public TaskStudioDto toDto(TaskStudio entity) {
        return TaskStudioDto.builder()
                .id(entity.getId())
                .titolo(entity.getTitolo())
                .descrizione(entity.getDescrizione())
                .priorita(entity.getPriorita())
                .stato(entity.getStato())
                .durataStimataMinuti(entity.getDurataStimataMinuti())
                .tagFocus(entity.getTagFocus())
                .finestraEnergia(entity.getFinestraEnergia())
                .studenteId(entity.getStudente().getId())
                .studenteNomeCompleto(entity.getStudente().getNome() + " " + entity.getStudente().getCognome())
                .moduloId(entity.getModulo().getId())
                .moduloTitolo(entity.getModulo().getTitolo())
                .creatoIl(entity.getCreatoIl())
                .aggiornatoIl(entity.getAggiornatoIl())
                .build();
    }

    public void updateEntity(TaskStudioDto dto, TaskStudio entity) {
        entity.setTitolo(dto.getTitolo());
        entity.setDescrizione(dto.getDescrizione());
        entity.setPriorita(dto.getPriorita());
        entity.setStato(dto.getStato());
        entity.setDurataStimataMinuti(dto.getDurataStimataMinuti());
        entity.setTagFocus(dto.getTagFocus());
        entity.setFinestraEnergia(dto.getFinestraEnergia());
    }
}