package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.ContattoRequest;
import com.neurodesk.app.neurodesk.entity.Contatto;
import com.neurodesk.app.neurodesk.repository.ContattoRepository;
import com.neurodesk.app.neurodesk.security.ContactRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Endpoint pubblico (anonimo) del form contatti della landing: alternativa alla
 * mail. Riceve nome/email/messaggio + consenso, li valida e li salva come lead.
 * Protetto da rate limiting per IP contro lo spam. Whitelistato in SecurityConfig
 * su POST /api/public/contact; nessun dato personale finisce nei log.
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicContactController {

    private final ContattoRepository contattoRepository;
    private final ContactRateLimiter rateLimiter;

    @PostMapping("/contact")
    @ResponseStatus(HttpStatus.CREATED)
    public void contact(@Valid @RequestBody ContattoRequest req, HttpServletRequest request) {
        // getRemoteAddr() e non X-Forwarded-For: coerente con LoginRateLimiter,
        // per non farsi falsificare l'IP. Dietro reverse proxy, configurare il
        // forwarding a livello di server (vedi note di deploy).
        String ip = request.getRemoteAddr();
        if (!rateLimiter.consenti(ip)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Troppe richieste. Riprova tra qualche minuto o scrivici a hello@neurodesk.it.");
        }
        Contatto contatto = Contatto.builder()
                .nome(req.nome().trim())
                .email(req.email().trim())
                .messaggio(req.messaggio().trim())
                .consenso(req.consenso())
                .build();
        contattoRepository.save(contatto);
    }
}
