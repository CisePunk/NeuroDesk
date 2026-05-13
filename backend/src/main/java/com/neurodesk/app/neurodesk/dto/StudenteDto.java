package com.neurodesk.app.neurodesk.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudenteDto {
    private Long id;

    @NotBlank
    @Size(max = 100)
    private String nome;

    @NotBlank
    @Size(max = 100)
    private String cognome;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    private Boolean attivo;

    @Size(max = 255)
    private String profiloNeurodivergente;

    @Size(max = 100)
    private String livelloEnergiaPreferito;

    private LocalDateTime creatoIl;
}
