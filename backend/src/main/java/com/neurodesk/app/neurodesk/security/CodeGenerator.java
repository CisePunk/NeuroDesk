package com.neurodesk.app.neurodesk.security;

import org.springframework.stereotype.Component;
import java.security.SecureRandom;

/**
 * Genera codici di accesso anonimi ad alta entropia con {@link SecureRandom}.
 * Formato: "neuro-xxxx-xxxx-xxxx-xxxx" (16 caratteri casuali su alfabeto di 32
 * = ~80 bit). Alfabeto senza caratteri ambigui (niente 0/o, 1/l/i) e tutto
 * minuscolo, coerente con la normalizzazione di {@link HashService}.
 */
@Component
public class CodeGenerator {

    private static final char[] ALFABETO = "abcdefghijkmnpqrstuvwxyz23456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int GRUPPI = 4;
    private static final int LUNGHEZZA_GRUPPO = 4;

    public String generaCodice() {
        StringBuilder sb = new StringBuilder("neuro");
        for (int g = 0; g < GRUPPI; g++) {
            sb.append('-');
            for (int i = 0; i < LUNGHEZZA_GRUPPO; i++) {
                sb.append(ALFABETO[RANDOM.nextInt(ALFABETO.length)]);
            }
        }
        return sb.toString();
    }
}
