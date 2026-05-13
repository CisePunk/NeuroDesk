package com.neurodesk.app.neurodesk.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskStudioDto {
    private Long id;
    private String titolo;
    private String descrizione;
    private String priorita;
    private String stato;
    private Integer durataStimataMinuti;
    private String tagFocus;
    private String finestraEnergia;
    private Long studenteId;
    private String studenteNomeCompleto;
    private Long moduloId;
    private String moduloTitolo;
    private LocalDateTime creatoIl;
    private LocalDateTime aggiornatoIl;
}
