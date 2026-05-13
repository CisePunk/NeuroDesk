package com.neurodesk.app.neurodesk.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModuloDto {
    private Long id;
    private String titolo;
    private String descrizione;
    private String tecnologia;
    private String stato;
    private String difficolta;
    private String caricoCognitivo;
    private LocalDateTime creatoIl;
}