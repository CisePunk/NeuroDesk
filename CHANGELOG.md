# Changelog

Registro delle modifiche, in ordine dalla più recente. Solo fatti.

## 2026-07-30

- Esca canary: `robots.txt` vieta un percorso finto; chi lo sonda fa scattare un allarme dedicato.
- Rilevamento honeypot: condizione A richiede ≥3 percorsi distinti non trovati (prima segnalava file singoli ripetuti).
- Honeypot: le origini note (rete di casa) non fanno partire la mail; restano in archivio marcate.
- Honeypot a due livelli: per richiesta (stato 404) + per sessione (rapporto, ampiezza, cardinalità). Soglie misurate sul traffico reale.
- Normalizzazione URI nell'archivio (`/api/companion-sessions/{id}`); conteggio degli identificativi distinti per l'enumerazione.
- Rotazioni: log Caddy 14 giorni, archivio honeypot 90 giorni, sale delle impronte 30 giorni con epoca.
- Registro pubblico dei tentativi di attacco: `docs/tentativi-di-attacco.md`.
- Caddy: ripiego single-page ristretto a lista bianca; tutto il resto 404 con pagina leggibile (`404.html`).
- `Caddyfile` unificato in un solo file nel repo (`deploy/Caddyfile.template`).
- Trappole estese a tutti i percorsi che iniziano con un punto.
- `deploy/verifica-fallback.sh`: 54 controlli automatici sul comportamento del sito.

### Verifiche eseguite (non committate come test)
- Audit sul modello del caso Baudr: pannello admin 401 da anonimo, 403 per utente non-scuola.
- IDOR: nessun utente legge le conversazioni di un altro; 404 identico per "esiste-ma-non-tuo" e "inesistente".
- 19 rotte estratte dal bundle: tutte 401 da anonimo tranne il login.
- Regressione honeypot sui 337 della scansione del 30/07: 312 riconosciute contro 56 prima.

## Precedenti

Storia completa nei commit. README: sezione "Sicurezza in esercizio".
