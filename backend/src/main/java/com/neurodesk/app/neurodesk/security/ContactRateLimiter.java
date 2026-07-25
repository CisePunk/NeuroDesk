package com.neurodesk.app.neurodesk.security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limita gli invii del form contatti pubblico per indirizzo IP: al massimo
 * {@code MAX_INVII} in una finestra di {@code FINESTRA_MS}. Difesa anti-spam su
 * un endpoint anonimo. In-memory, adeguato a una singola istanza (come
 * {@link LoginRateLimiter}); con piu' istanze servira' uno store condiviso.
 */
@Component
public class ContactRateLimiter {

    private static final int MAX_INVII = 5;
    private static final long FINESTRA_MS = 15 * 60 * 1000L;   // 15 minuti
    private static final int MAX_VOCI = 10_000;                // tetto anti-crescita

    private final Map<String, Contatore> contatori = new ConcurrentHashMap<>();

    private static final class Contatore {
        int invii;
        long inizioFinestra;
    }

    /** Registra un tentativo di invio: true se consentito, false se oltre la soglia. */
    public boolean consenti(String ip) {
        long now = System.currentTimeMillis();
        if (contatori.size() > MAX_VOCI) {
            purgaScaduti(now);
            // Tetto RIGIDO alla memoria: se dopo la pulizia siamo ancora oltre il cap
            // (es. flood da IP rotanti su un blocco IPv6), svuota. Valvola anti-OOM: il
            // conteggio per-IP riparte da zero, ma la memoria resta limitata.
            if (contatori.size() > MAX_VOCI) {
                contatori.clear();
            }
        }
        Contatore c = contatori.computeIfAbsent(ip, k -> new Contatore());
        synchronized (c) {
            if (now - c.inizioFinestra > FINESTRA_MS) {
                c.invii = 0;
                c.inizioFinestra = now;
            }
            if (c.invii >= MAX_INVII) {
                return false;
            }
            c.invii++;
            return true;
        }
    }

    private void purgaScaduti(long now) {
        contatori.entrySet().removeIf(e -> {
            Contatore c = e.getValue();
            synchronized (c) {
                return (now - c.inizioFinestra) > FINESTRA_MS;
            }
        });
    }
}
