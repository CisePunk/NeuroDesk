package com.neurodesk.app.neurodesk.security;

import com.neurodesk.app.neurodesk.entity.Utente;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/** Emette e verifica i token JWT (firma HS256). Il subject e' l'id utente; nessun dato identificante nel token. */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${neurodesk.jwt.secret}") String secret,
            @Value("${neurodesk.jwt.expiration-ms:86400000}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generate(Utente utente) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(utente.getId()))
                .claim("ruolo", utente.getRuolo().name())
                // Il consenso viaggia FIRMATO nel token: il companion lo verifica
                // senza dover interrogare il DB. Falso finche' non e' registrato.
                .claim("consenso", utente.getConsensoIl() != null)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                // Algoritmo PINNATO a HS256: niente auto-selezione per lunghezza chiave,
                // niente agilita' di algoritmo lato verifica.
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
