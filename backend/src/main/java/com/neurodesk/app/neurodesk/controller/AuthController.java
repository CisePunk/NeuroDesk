package com.neurodesk.app.neurodesk.controller;

import com.neurodesk.app.neurodesk.dto.LoginRequest;
import com.neurodesk.app.neurodesk.dto.LoginResponse;
import com.neurodesk.app.neurodesk.dto.MeResponse;
import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.security.LoginRateLimiter;
import com.neurodesk.app.neurodesk.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final LoginRateLimiter rateLimiter;
    private final com.neurodesk.app.neurodesk.service.TesterService testerService;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req, HttpServletRequest request) {
        String ip = clientIp(request);
        if (!rateLimiter.consentito(ip)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Troppi tentativi di accesso. Riprova tra qualche minuto.");
        }
        try {
            LoginResponse resp = authService.login(req);
            rateLimiter.registraSuccesso(ip);
            return resp;
        } catch (ResponseStatusException e) {
            rateLimiter.registraFallimento(ip);
            throw e;
        }
    }

    /**
     * La persona imposta LA PROPRIA chiave API ("bring your own token").
     *
     * Sta qui e non fra le funzioni di amministrazione apposta: la chiave e' sua,
     * e deve poterla mettere lei senza passarla a nessuno. Cosi' non transita mai
     * dal browser di chi gestisce NeuroDesk, che ne vede solo l'esistenza.
     *
     * Arriva in chiaro solo in questa richiesta, su HTTPS, viene cifrata prima di
     * toccare il database e non torna mai indietro: nemmeno a lei.
     */
    @PutMapping("/chiave-ai")
    public void impostaChiaveAi(@AuthenticationPrincipal Utente utente,
                                @RequestBody Map<String, String> body) {
        if (body == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Corpo della richiesta mancante.");
        }
        testerService.impostaChiaveAi(utente.getId(), body.get("provider"), body.get("chiave"));
    }

    /** Toglie la propria chiave: si torna a usare il credito comune. */
    @DeleteMapping("/chiave-ai")
    public void rimuoviChiaveAi(@AuthenticationPrincipal Utente utente) {
        testerService.rimuoviChiaveAi(utente.getId());
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal Utente utente) {
        return new MeResponse(utente.getRuolo(), utente.getConsensoIl() != null,
                utente.getChiaveAiCifrata() != null, utente.getChiaveAiProvider());
    }

    @PostMapping("/consenso")
    public LoginResponse consenso(@AuthenticationPrincipal Utente utente) {
        // Ritorna un token rinnovato (consenso=true) che il frontend deve salvare.
        return authService.registraConsenso(utente);
    }

    @DeleteMapping("/consenso")
    public LoginResponse revocaConsenso(@AuthenticationPrincipal Utente utente) {
        // Art. 7(3) GDPR: revocare dev'essere facile quanto dare il consenso.
        // Ritorna un token con consenso=false che il frontend deve salvare.
        return authService.revocaConsenso(utente);
    }

    /**
     * IP reale della connessione. NON usiamo X-Forwarded-For preso dal client:
     * sarebbe falsificabile e permetterebbe di aggirare il rate limiting cambiando
     * header a ogni richiesta. Dietro un proxy/CDN fidato (es. Cloudflare, nginx)
     * si imposta {@code server.forward-headers-strategy=NATIVE} con i proxy fidati,
     * cosi' e' Tomcat a riscrivere getRemoteAddr() con il vero IP client.
     */
    private String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
