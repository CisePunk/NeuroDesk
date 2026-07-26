package com.neurodesk.app.neurodesk.security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limita i tentativi di login per indirizzo IP: dopo troppi fallimenti in una
 * finestra, blocca temporaneamente. Difesa contro il brute-force sui codici
 * (che sono l'unico segreto dei tester) e sulla password admin.
 *
 * In-memory: adeguato a una singola istanza / fase di test. Con piu' istanze
 * servira' uno store condiviso (es. Redis). Il blocco e' per IP e non per
 * codice, per non permettere a un attaccante di bloccare un tester legittimo.
 */
@Component
public class LoginRateLimiter {

    private static final int MAX_FALLIMENTI = 8;
    private static final long FINESTRA_MS = 15 * 60 * 1000L;   // 15 minuti
    private static final long BLOCCO_MS = 15 * 60 * 1000L;     // blocco di 15 minuti
    private static final int MAX_VOCI = 10_000;                // tetto anti-crescita

    private final Map<String, Contatore> contatori = new ConcurrentHashMap<>();

    private static final class Contatore {
        int fallimenti;
        long inizioFinestra;
        long bloccatoFino;
    }

    public boolean consentito(String ip) {
        Contatore c = contatori.get(ip);
        if (c == null) {
            return true;
        }
        synchronized (c) {
            return c.bloccatoFino <= System.currentTimeMillis();
        }
    }

    public void registraFallimento(String ip) {
        long now = System.currentTimeMillis();
        if (contatori.size() > MAX_VOCI) {
            purgaScaduti(now);
        }
        Contatore c = contatori.computeIfAbsent(ip, k -> new Contatore());
        synchronized (c) {
            if (now - c.inizioFinestra > FINESTRA_MS) {
                c.fallimenti = 0;
                c.inizioFinestra = now;
            }
            c.fallimenti++;
            if (c.fallimenti >= MAX_FALLIMENTI) {
                c.bloccatoFino = now + BLOCCO_MS;
                c.fallimenti = 0;
                c.inizioFinestra = now;
            }
        }
    }

    // Un login riuscito azzera il contatore dell'IP. Chi possiede un codice valido
    // puo' cosi' ripulire i propri tentativi falliti dopo ogni successo: ininfluente,
    // perche' per indovinare un altro codice (~80 bit) il freno per-IP e' comunque
    // irrilevante rispetto allo spazio delle chiavi. Serve a non penalizzare l'utente
    // legittimo che ha solo sbagliato a digitare prima di entrare.
    public void registraSuccesso(String ip) {
        contatori.remove(ip);
    }

    /** Rimuove i contatori non piu' bloccati e con la finestra scaduta. */
    private void purgaScaduti(long now) {
        contatori.entrySet().removeIf(e -> {
            Contatore c = e.getValue();
            synchronized (c) {
                return c.bloccatoFino <= now && (now - c.inizioFinestra) > FINESTRA_MS;
            }
        });
    }
}
