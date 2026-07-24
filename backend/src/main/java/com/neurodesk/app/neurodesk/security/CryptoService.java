package com.neurodesk.app.neurodesk.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifratura simmetrica del contenuto delle conversazioni Companion, che sono dati
 * sensibili (Art. 9): nel database non deve finire testo in chiaro. Usa AES-256-GCM
 * (riservatezza + integrità) con IV casuale per messaggio. Formato memorizzato:
 * base64(IV[12] || ciphertext+tag). La chiave AES deriva via SHA-256 dal segreto
 * {@code neurodesk.crypto.secret} (in produzione impostane uno dedicato e forte;
 * in sviluppo ripiega sul segreto JWT).
 */
@Service
public class CryptoService {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;      // 96 bit, raccomandato per GCM
    private static final int TAG_LENGTH_BIT = 128;

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public CryptoService(
            @Value("${neurodesk.crypto.secret:${neurodesk.jwt.secret}}") String secret) {
        try {
            byte[] keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(secret.getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Impossibile inizializzare la cifratura", e);
        }
    }

    public String cifra(String testoInChiaro) {
        if (testoInChiaro == null) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BIT, iv));
            byte[] cifrato = cipher.doFinal(testoInChiaro.getBytes(StandardCharsets.UTF_8));

            byte[] out = new byte[iv.length + cifrato.length];
            System.arraycopy(iv, 0, out, 0, iv.length);
            System.arraycopy(cifrato, 0, out, iv.length, cifrato.length);
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("Errore di cifratura", e);
        }
    }

    public String decifra(String testoCifrato) {
        if (testoCifrato == null) {
            return null;
        }
        try {
            byte[] all = Base64.getDecoder().decode(testoCifrato);
            byte[] iv = new byte[IV_LENGTH];
            System.arraycopy(all, 0, iv, 0, IV_LENGTH);
            byte[] cifrato = new byte[all.length - IV_LENGTH];
            System.arraycopy(all, IV_LENGTH, cifrato, 0, cifrato.length);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BIT, iv));
            return new String(cipher.doFinal(cifrato), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Errore di decifratura", e);
        }
    }
}
