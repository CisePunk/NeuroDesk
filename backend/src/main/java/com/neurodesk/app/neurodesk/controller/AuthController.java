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
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final LoginRateLimiter rateLimiter;

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

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal Utente utente) {
        return new MeResponse(utente.getRuolo(), utente.getConsensoIl() != null);
    }

    @PostMapping("/consenso")
    public LoginResponse consenso(@AuthenticationPrincipal Utente utente) {
        // Ritorna un token rinnovato (consenso=true) che il frontend deve salvare.
        return authService.registraConsenso(utente);
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
