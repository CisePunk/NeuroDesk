package com.neurodesk.app.neurodesk.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dati in ingresso dal form contatti pubblico della landing. Validati con
 * jakarta.validation: il consenso deve essere esplicitamente true (art. 6/7 GDPR).
 */
public record ContattoRequest(

        @NotBlank
        @Size(max = 100)
        String nome,

        @NotBlank
        @Email
        @Size(max = 255)
        String email,

        @NotBlank
        @Size(max = 2000)
        String messaggio,

        @AssertTrue(message = "Il consenso al trattamento dei dati è obbligatorio")
        boolean consenso
) {
}
