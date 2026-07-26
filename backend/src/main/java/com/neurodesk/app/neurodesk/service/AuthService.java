package com.neurodesk.app.neurodesk.service;

import com.neurodesk.app.neurodesk.dto.LoginRequest;
import com.neurodesk.app.neurodesk.dto.LoginResponse;
import com.neurodesk.app.neurodesk.entity.Ruolo;
import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import com.neurodesk.app.neurodesk.security.HashService;
import com.neurodesk.app.neurodesk.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UtenteRepository utenteRepository;
    private final HashService hashService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    // Hash BCrypt "civetta" (di una stringa casuale) usato per pareggiare i tempi
    // di risposta quando l'utente non esiste o non ha password: evita l'oracolo
    // di timing che distinguerebbe un codice valido da uno inesistente.
    private static final String DUMMY_HASH =
            "$2a$10$7EqJtq98hPqEX7fNZaFWoOa8kZbT2j9m6oQx5c3s1kUe0v9YmS0Zu";

    public LoginResponse login(LoginRequest req) {
        Utente utente = utenteRepository.findByLoginHash(hashService.loginHash(req.getCodice()))
                .filter(Utente::getAttivo)
                .orElse(null);

        if (utente == null) {
            // Esegue comunque un confronto BCrypt per non rivelare, dal tempo di
            // risposta, che il codice non esiste.
            passwordEncoder.matches(req.getPassword() == null ? "" : req.getPassword(), DUMMY_HASH);
            throw unauthorized();
        }

        // L'admin SCUOLA ha una password; i tester entrano col solo codice.
        if (utente.getPasswordHash() != null) {
            if (req.getPassword() == null || !passwordEncoder.matches(req.getPassword(), utente.getPasswordHash())) {
                throw unauthorized();
            }
        } else {
            // Tester (solo codice): confronto civetta per tempo costante.
            passwordEncoder.matches("", DUMMY_HASH);
        }

        boolean consensoRichiesto = utente.getRuolo() == Ruolo.STUDENTE && utente.getConsensoIl() == null;
        return new LoginResponse(jwtService.generate(utente), utente.getRuolo(), consensoRichiesto);
    }

    /**
     * Registra il consenso e restituisce un token NUOVO col claim consenso=true,
     * cosi' il companion (che valida il claim firmato) accetta la chat. Senza il
     * rinnovo, il vecchio token porterebbe ancora consenso=false.
     */
    @Transactional
    public LoginResponse registraConsenso(Utente utente) {
        if (utente.getConsensoIl() == null) {
            utente.setConsensoIl(LocalDateTime.now());
            utenteRepository.save(utente);
        }
        return new LoginResponse(jwtService.generate(utente), utente.getRuolo(), false);
    }

    /**
     * Revoca il consenso (Art. 7(3) GDPR: dev'essere facile quanto darlo). Azzera
     * consensoIl e restituisce un token NUOVO col claim consenso=false, cosi' il
     * companion blocca la chat subito (oltre al controllo live entro ~60s). Le
     * conversazioni gia' salvate NON vengono toccate: le cancella l'utente col
     * proprio pulsante "Cancella la mia cronologia".
     */
    @Transactional
    public LoginResponse revocaConsenso(Utente utente) {
        if (utente.getConsensoIl() != null) {
            utente.setConsensoIl(null);
            utenteRepository.save(utente);
        }
        boolean consensoRichiesto = utente.getRuolo() == Ruolo.STUDENTE;
        return new LoginResponse(jwtService.generate(utente), utente.getRuolo(), consensoRichiesto);
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenziali non valide");
    }
}
