package com.neurodesk.app.neurodesk.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Hash deterministico (SHA-256 con "pepper" server-side) del codice/username di
 * accesso. Deterministico perche' serve per la ricerca al login; con il pepper
 * un eventuale dump del database non permette di risalire ai codici.
 */
@Component
public class HashService {

    private final String pepper;

    public HashService(@Value("${neurodesk.login.pepper}") String pepper) {
        this.pepper = pepper;
    }

    public String loginHash(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest((pepper + ":" + input.trim().toLowerCase()).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 non disponibile", e);
        }
    }
}
