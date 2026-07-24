package com.neurodesk.app.neurodesk.config;

import com.neurodesk.app.neurodesk.entity.Ruolo;
import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import com.neurodesk.app.neurodesk.security.HashService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * All'avvio crea l'unico account SCUOLA (la gestrice) se non esiste ancora.
 * "La scuola sei tu": un solo admin, che poi crea i codici dei tester.
 */
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UtenteRepository utenteRepository;
    private final HashService hashService;
    private final PasswordEncoder passwordEncoder;

    @Value("${neurodesk.admin.codice}")
    private String adminCodice;

    @Value("${neurodesk.admin.password}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (utenteRepository.existsByRuolo(Ruolo.SCUOLA)) {
            return;
        }
        Utente admin = Utente.builder()
                .loginHash(hashService.loginHash(adminCodice))
                .passwordHash(passwordEncoder.encode(adminPassword))
                .ruolo(Ruolo.SCUOLA)
                .attivo(true)
                .etichetta("scuola")
                .build();
        utenteRepository.save(admin);
        // Non logghiamo il codice di accesso: e' un valore di login (in produzione i log
        // possono essere letti da terzi). Chi installa lo conosce gia' dalla config.
        log.info("Account SCUOLA creato. Cambia il codice/password di default appena possibile.");
    }
}
