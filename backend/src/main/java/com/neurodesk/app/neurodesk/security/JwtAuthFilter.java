package com.neurodesk.app.neurodesk.security;

import com.neurodesk.app.neurodesk.entity.Utente;
import com.neurodesk.app.neurodesk.repository.UtenteRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UtenteRepository utenteRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                Claims claims = jwtService.parse(header.substring(7));
                Long id = Long.valueOf(claims.getSubject());
                utenteRepository.findById(id)
                        .filter(Utente::getAttivo)
                        .ifPresent(utente -> {
                            var auth = new UsernamePasswordAuthenticationToken(
                                    utente, null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + utente.getRuolo().name())));
                            SecurityContextHolder.getContext().setAuthentication(auth);
                        });
            } catch (Exception ignored) {
                // token invalido/scaduto -> resta non autenticato
            }
        }
        chain.doFilter(request, response);
    }
}
