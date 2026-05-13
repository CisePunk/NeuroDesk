package com.neurodesk.app.neurodesk.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModuloDto {
    private Long id;

    @NotBlank
    @Size(max = 255)
    private String titolo;

    @Size(max = 2000)
    private String descrizione;

    @Size(max = 100)
    private String tecnologia;

    @Size(max = 50)
    private String stato;

    @Size(max = 50)
    private String difficolta;

    @Size(max = 50)
    private String caricoCognitivo;

    private LocalDateTime creatoIl;
}