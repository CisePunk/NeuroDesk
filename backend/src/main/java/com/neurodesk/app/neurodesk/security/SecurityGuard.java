package com.neurodesk.app.neurodesk.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Controllo all'avvio: rifiuta di partire (o avvisa in sviluppo) se i segreti
 * di sicurezza sono ancora i valori di default/deboli. Con
 * {@code neurodesk.security.strict=true} (produzione) un segreto debole
 * IMPEDISCE l'avvio, cosi' non si va mai online con chiavi indovinabili.
 */
@Component
public class SecurityGuard {

    private static final Logger log = LoggerFactory.getLogger(SecurityGuard.class);

    public SecurityGuard(
            @Value("${neurodesk.jwt.secret}") String jwtSecret,
            // Vuota di default: cosi' possiamo distinguere "assente" (fallback debole
            // in CryptoService) da "impostata". Il controllo sotto la rende obbligatoria.
            @Value("${neurodesk.crypto.secret:}") String cryptoSecret,
            @Value("${neurodesk.login.pepper}") String pepper,
            @Value("${neurodesk.admin.password}") String adminPassword,
            // Default TRUE: se la proprieta' manca del tutto, si fallisce chiusi
            // (in dev e' impostata esplicitamente a false in application.properties).
            @Value("${neurodesk.security.strict:true}") boolean strict) {

        boolean segretiDeboli =
                jwtSecret.length() < 32
                || jwtSecret.contains("cambia-in-produzione")
                || pepper.contains("cambia-in-produzione")
                || "CambiaMi123!".equals(adminPassword)
                // Chiave di cifratura conversazioni (AES-256-GCM). Se assente, CryptoService
                // deriva la chiave da un valore noto (SHA-256 di stringa vuota): chiave
                // pubblica. Se uguale al JWT, ruotare il JWT rende illeggibili tutte le
                // conversazioni gia' salvate.
                || cryptoSecret.isBlank()
                || cryptoSecret.length() < 32
                || cryptoSecret.equals(jwtSecret);

        if (segretiDeboli) {
            String msg = "Segreti di sicurezza deboli o di default (neurodesk.jwt.secret / neurodesk.crypto.secret / login.pepper / admin.password). "
                    + "La chiave di cifratura deve esistere, essere lunga almeno 32 caratteri ed essere diversa dal JWT. "
                    + "Impostane di forti (variabili d'ambiente) prima della produzione.";
            if (strict) {
                throw new IllegalStateException(msg + " [neurodesk.security.strict=true -> avvio bloccato]");
            }
            log.warn("*** SICUREZZA: {} ***", msg);
        }
    }
}
