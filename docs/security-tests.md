# NeuroDesk — Report dei test di sicurezza

| Campo | Valore |
|---|---|
| Data esecuzione | 2026-06-29 · aggiornato 2026-07-26 |
| Branch | `main` |
| Commit HEAD | `main` (26 luglio 2026 — dopo audit sicurezza/accessibilità, Ascolta, continuazione automatica) |
| Runtime | Node v24.14.1, npm 11.11.0 |
| Tipo di verifica | Live + analisi statica (nessuna modifica al codice durante i test) |
| Esito complessivo | **48/48 test superati** |

Questo documento elenca i test di sicurezza condotti sul progetto NeuroDesk
(frontend React, companion-service Node.js, backend Spring Boot) e il loro esito.
I test sono stati eseguiti dal vivo contro il companion-service in esecuzione su
`127.0.0.1:8090` e tramite analisi statica del codice e delle dipendenze.

---

## 1. Dipendenze e CVE

| # | Test | Comando | Esito |
|---|------|---------|-------|
| 1 | CVE dipendenze frontend | `npm audit` (frontend) | **0 vulnerabilità** |
| 2 | CVE dipendenze companion-service | analisi `package.json` | **Nessuna dipendenza esterna** (solo built-in Node: `http`, `node:http`). Superficie di attacco minima |

Note:
- `axios` (20+ CVE, era dipendenza fantasma mai importata) è stato rimosso dal frontend.
- `react-router-dom` e `vite` aggiornati a versioni patchate via `npm audit fix`.

---

## 2. Companion-service — test dinamici (live)

Tutti eseguiti con `curl` contro l'endpoint `POST /api/companion/respond`.

| # | Test | Input | Atteso | Esito |
|---|------|-------|--------|-------|
| 1 | Prototype pollution (`__proto__`) | `{"mode":"__proto__"}` | fallback a `crisis_mode` | ✅ `crisis_mode` |
| 2 | Prototype pollution (`constructor`) | `{"mode":"constructor"}` | fallback a `crisis_mode` | ✅ `crisis_mode` |
| 3 | Limite lunghezza messaggio | messaggio 3000 char | rifiuto 400 | ✅ `message_too_long`, `maxLength: 2000` |
| 4 | Payload oversize | body > 1 MB | connessione chiusa | ✅ payload rifiutato dal server |
| 5 | JSON malformato | `{"message": broken` | errore generico, nessun leak | ✅ `companion_request_failed` (500), nessun dettaglio interno |
| 6 | Messaggio vuoto | `{"message":""}` | rifiuto 400 | ✅ `message is required` |
| 7 | Echo XSS | `<script>alert(1)</script>` | testo grezzo, non eseguibile | ✅ rimandato come testo; React lo renderizza come stringa, non HTML |
| 8 | CORS origin non consentita | `Origin: https://evil.example.com` | non riflessa | ✅ `Access-Control-Allow-Origin: http://localhost:5173` |
| 9 | Metodi HTTP non consentiti | `PUT`, `DELETE`, `GET` su endpoint POST | 404 | ✅ tutti 404 |
| 10 | Path traversal / path inesistenti | `/../../etc/passwd`, `/admin` | 404 generico | ✅ `not_found`, nessun leak |

### Dettaglio rilevante

- **Test 5 — nessun information disclosure**: in caso di errore interno il server
  restituisce solo `{"error":"companion_request_failed"}` senza `error.message`,
  così non espone stack trace, path di sistema o dettagli del provider AI.
- **Test 7 — XSS**: il mock rimanda parte del messaggio utente nella risposta.
  Non è sfruttabile perché il frontend React inserisce il testo come contenuto
  testuale (non `dangerouslySetInnerHTML`), quindi eventuali tag non vengono
  interpretati come markup.

---

## 3. Backend Spring Boot — analisi statica

| # | Test | Verifica | Esito |
|---|------|----------|-------|
| 11 | Input validation sui controller | `@Valid @RequestBody` presente | ✅ in tutti e 3 i controller (Studente, Modulo, TaskStudio) |
| 12 | Vincoli sui DTO | `@NotBlank` / `@Email` / `@Size` / `@Min`/`@Max` | ✅ presenti in tutti e 3 i DTO |
| 13 | Log SQL in produzione | `spring.jpa.show-sql` | ✅ `false` (query non stampate nei log) |
| 14 | CORS backend | `CorsConfig` | ✅ ristretto a `http://localhost:5173` |

---

## 4. Gestione segreti

| # | Test | Verifica | Esito |
|---|------|----------|-------|
| 15 | Password DB in git | `git log -S "<password-db>"` | ✅ assente dalla history (application.properties è gitignored) |
| 16 | `application.properties` tracciato | `git ls-files` | ✅ solo il template `.example` (con placeholder `YOUR_DB_PASSWORD`); il file reale è gitignored |
| 17 | `.env` companion-service tracciato | `git ls-files` | ✅ NON tracciato (gitignored) |
| 18 | `.env` frontend tracciato | `git ls-files frontend/` | ✅ nessuno |
| 19 | Chiave API esposta in risposta | scansione body risposta | ✅ nessun pattern di chiave API esposto |
| 20 | Segreti nei file tracciati | `git grep` su pattern chiavi/password | ✅ nessun segreto reale (solo placeholder nei template) |

---

## 5. Note operative emerse durante i test

- **Il companion-service va avviato con il flag `--env-file`** per leggere la
  configurazione del provider AI:
  ```bash
  node --env-file=companion-service/.env companion-service/src/server.js
  ```
  Avviato senza il flag, il service ignora `.env` e resta in modalità `mock`
  (verificabile con `GET /health` → `"provider": "mock"`).

- Al momento del test la chiave AI reale nel `.env` non era configurata:
  l'integrazione LLM reale non è quindi stata esercitata end-to-end.
  Una volta inserita una chiave valida, ripetere il **Test 12** (risposta LLM reale)
  per confermare il provider configurato.

---

## 6. Modifiche recenti — form contatti pubblico + gestionale utenti (luglio 2026)

Analisi statica adversariale sulle modifiche successive al consolidamento: nuovo
endpoint pubblico `POST /api/public/contact` e gestionale "Utenti" (registrazione con
nome + generazione di un codice di accesso anonimo collegato).

### 6.1 Endpoint pubblico contatti (non autenticato)

| # | Test | Verifica | Esito |
|---|------|----------|-------|
| 23 | Whitelist minima | in `SecurityConfig` è `permitAll` **solo** `POST /api/public/contact`; ogni altro metodo/rotta resta protetto | ✅ |
| 24 | Consenso obbligatorio | `@AssertTrue` sul boolean `consenso` → 400 se assente o `false` | ✅ |
| 25 | Limiti di lunghezza input | `messaggio ≤ 2000`, `nome ≤ 100`, `email ≤ 255` (+ colonne DB coerenti) | ✅ |
| 26 | Injection SQL/JPA | solo Spring Data parametrizzato (`save`, `existsByEmail`); nessuna concatenazione di stringhe | ✅ |
| 27 | Rate limiting per IP | `ContactRateLimiter`: max 5 invii / 15 min per IP; `getRemoteAddr()` (no `X-Forwarded-For` spoofabile) | ✅ |
| 28 | Tetto memoria rate-limiter | cap rigido: oltre `MAX_VOCI` la mappa viene svuotata → nessun OOM sotto flood di IP rotanti (**fix applicato**) | ✅ |
| 29 | Nessun information disclosure | codice/email/messaggio/IP non finiscono nei log | ✅ |

### 6.2 Gestionale utenti (ruolo SCUOLA)

| # | Test | Verifica | Esito |
|---|------|----------|-------|
| 30 | Autorizzazione | `POST /api/tester` e `PUT /api/tester/{id}/stato` → `hasRole("SCUOLA")` (401 senza token). Vale anche per `/api/studenti`, che resta nel backend ma non ha piu' pagina | ✅ |
| 31 | Codice non esposto in lista | il codice in chiaro è **solo** nella risposta di creazione; `GET /api/tester` non lo restituisce; nel DB solo l'hash con pepper | ✅ |
| 32 | Rimozione dato art. 9 | `profiloNeurodivergente` rimosso da entity, DTO e mapper; nessun residuo nel codice | ✅ |
| 33 | Revoca accesso | `PUT .../stato {attivo:false}` disattiva l'account-codice collegato; il filtro JWT ricontrolla `attivo` → accesso revocato subito | ✅ |
| 34 | Nessun dato identificante | dal 27 luglio 2026 la pagina che raccoglieva nome, cognome ed email è stata **rimossa**: l'unico dato accanto a un codice è un'etichetta scelta da chi amministra, e resta nel gestionale | ✅ |
| 35 | Pulizia account orfani | la rimozione utenti di test elimina anche gli account-codice collegati | ✅ |

### Finding aperti (da chiudere prima del go-live)

- **[MEDIA] Rate-limiter dietro reverse proxy** — con Caddy davanti, `getRemoteAddr()` vede l'IP del proxy: tutti gli invii finirebbero in un unico bucket (blocco funzionale). **Mitigazione:** in produzione impostare `server.forward-headers-strategy` (nel `backend.env` della checklist: `SERVER_FORWARD_HEADERS_STRATEGY=NATIVE`) e **verificare** che l'IP client reale venga risolto. Vale anche per il preesistente `LoginRateLimiter`.
- **[BASSA / latente] Stored XSS** — `messaggio`/`nome` sono salvati grezzi, ma **nessun endpoint li rilegge oggi** e il frontend React escapa. Attenzione se si aggiungerà una vista "contatti/CRM" lato SCUOLA: rendering solo testuale, mai `dangerouslySetInnerHTML`.
- **[GDPR] DROP COLUMN** — rimuovere il campo JPA `profiloNeurodivergente` non cancella l'eventuale colonna/dati storici. Ora è fattibile in modo pulito: dal 28 luglio 2026 lo schema è governato da Flyway, quindi basta una migrazione `V2__drop_profilo.sql` (la colonna non risulta presente nello schema di produzione fotografato in `V1`, quindi probabilmente non c'e' niente da eliminare: verificare prima).

---

## 7. Novità 26 luglio 2026 — accessibilità, Ascolta, irrigidimenti da audit

Controlli sulle funzioni aggiunte dopo il 25 luglio. Le voci client (36–39) sono
analisi statica del codice; le voci infrastruttura/backend (40–48) sono state
verificate **dal vivo** in produzione durante l'audit (Playwright, `curl`).

### 7.1 Lettura vocale ("Ascolta") e accessibilità (client)

| # | Test | Verifica | Esito |
|---|------|----------|-------|
| 36 | TTS solo locale (privacy) | `ascolta()` usa **solo** `window.speechSynthesis`; nessun `fetch`/XHR/WebSocket nel percorso. Nessun dato della conversazione lascia il browser | ✅ |
| 37 | TTS nessuna injection | `SpeechSynthesisUtterance` pronuncia testo grezzo: nessuna interpretazione di HTML/script | ✅ |
| 38 | TTS nessun audio residuo | `speechSynthesis.cancel()` allo smontaggio della pagina e a "Nuova conversazione" | ✅ |
| 39 | Accessibilità: nessuna nuova superficie | attributi `aria-*`/`label`/`for`/anchor inerti; **nessun** `dangerouslySetInnerHTML` nel frontend; skip-link = fragment interno (`#contenuto-principale`) | ✅ |

### 7.2 Irrigidimenti da audit (infrastruttura / backend), verificati live

| # | Test | Verifica | Esito |
|---|------|----------|-------|
| 40 | CSP stretta sull'app | Playwright: **zero violazioni**; `connect-src 'self'` blocca l'esfiltrazione via pagina; hash `sha256` per il solo script inline del tema | ✅ |
| 41 | Header di sicurezza | HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` su app e landing (`curl -I`) | ✅ |
| 42 | Endpoint interno non esposto | Caddy: `/api/internal/*` → **404** dall'esterno; raggiungibile solo in loopback dal companion | ✅ |
| 43 | Token interno dedicato | `X-Internal-Token` ≠ segreto JWT; assente/errato → **401**; confronto a tempo costante (`MessageDigest.isEqual`) | ✅ |
| 44 | Revoca live sul Companion | il companion interroga lo stato dal backend (cache 60s, tetto sulla cache scaduta 5 min → poi **fail-closed**): revoca effettiva entro ~60s invece che dopo la scadenza del token (24h) | ✅ |
| 45 | Consenso revocabile (Art. 7(3)) | `DELETE /api/auth/consenso` azzera `consensoIl` e rilascia token `consenso=false`; il companion blocca (403) sia via claim sia via controllo live | ✅ |
| 46 | Chiave di cifratura obbligatoria | `SecurityGuard` rifiuta l'avvio se `neurodesk.crypto.secret` è vuota, < 32 caratteri o uguale al JWT | ✅ |
| 47 | Conversazione fuori da `localStorage` | cache attiva in `sessionStorage` (muore con la scheda) + bonifica una-tantum delle copie legacy; `logout` pulisce entrambe | ✅ |
| 48 | Continuazione automatica: costo limitato | max 1 continuazione = **2 chiamate/richiesta** (tetto rigido); il loop termina sempre; il "nudge" di continuazione è una stringa fissa (nessuna injection) | ✅ |

Nota — **rilevatore di crisi rimosso**: `safety.js` non c'è più (scelta di prodotto). Le
frasi di rischio vanno all'AI, che ha i propri filtri; sparisce anche la classe di falsi
positivi ("farla finita con questa pratica INPS" → risposta di crisi). Non è un test di
sicurezza in senso stretto, ma cambia il comportamento e va registrato.

---

## 8. Sintesi

| Area | Test | Superati |
|------|------|----------|
| Dipendenze / CVE | 2 | 2 |
| Companion-service (dinamici) | 10 | 10 |
| Backend Spring Boot (statici) | 4 | 4 |
| Gestione segreti | 6 | 6 |
| Form contatti pubblico (statici) | 7 | 7 |
| Gestionale utenti (statici) | 6 | 6 |
| Ascolta + accessibilità (client) | 4 | 4 |
| Irrigidimenti da audit (live) | 9 | 9 |
| **Totale** | **48** | **48** |

Nessuna vulnerabilità **critica** né aperta bloccante.

**Chiuso il 26 luglio:** il finding [MEDIA] sul rate-limiting dietro reverse proxy —
`SERVER_FORWARD_HEADERS_STRATEGY=NATIVE` è impostato in produzione e l'IP client reale
viene risolto (rate limiting per-IP funzionante dietro Caddy). Aggiunti inoltre header di
sicurezza (CSP/HSTS/…), token interno dedicato e revoca live sul Companion (§7.2).

**Chiuso il 28 luglio 2026:** migrazioni schema esplicite — `ddl-auto` è passato da
`update` a `validate` e lo schema è governato da Flyway (`V1` è la fotografia della
produzione, registrata come baseline sul database esistente).

**Ancora aperti (non bloccanti):** vigilanza XSS su una futura vista contatti (rendering
solo testuale), eventuale `DROP COLUMN` per `profiloNeurodivergente`, e DPA con i
fornitori AI.
