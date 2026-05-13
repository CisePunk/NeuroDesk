package com.neurodesk.app.neurodesk.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudenteDto {
    private Long id;
    private String nome;
    private String cognome;
    private String email;
    private Boolean attivo;
    private String profiloNeurodivergente;
    private String livelloEnergiaPreferito;
    private LocalDateTime creatoIl;
}
