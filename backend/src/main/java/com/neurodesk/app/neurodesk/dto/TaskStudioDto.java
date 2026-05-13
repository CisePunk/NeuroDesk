package com.neurodesk.app.neurodesk.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskStudioDto {
    private Long id;

    @NotBlank
    @Size(max = 255)
    private String titolo;

    @Size(max = 2000)
    private String descrizione;

    @Size(max = 50)
    private String priorita;

    @Size(max = 50)
    private String stato;

    @Min(1) @Max(480)
    private Integer durataStimataMinuti;

    @Size(max = 100)
    private String tagFocus;

    @Size(max = 100)
    private String finestraEnergia;

    private Long studenteId;
    private String studenteNomeCompleto;
    private Long moduloId;
    private String moduloTitolo;
    private LocalDateTime creatoIl;
    private LocalDateTime aggiornatoIl;
}
