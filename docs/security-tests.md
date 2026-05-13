# NeuroDesk — Report dei test di sicurezza

| Campo | Valore |
|---|---|
| Data esecuzione | 2026-06-29 |
| Branch | `main` |
| Commit HEAD | `4dd692e` |
| Runtime | Node v24.14.1, npm 11.11.0 |
| Tipo di verifica | Sola lettura (nessuna modifica al codice durante i test) |
| Esito complessivo | **14/14 test superati** |

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
| 15 | Password DB in git | `git log -S "NeuroDesk123"` | ✅ assente dalla history |
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

## 6. Sintesi

| Area | Test | Superati |
|------|------|----------|
| Dipendenze / CVE | 2 | 2 |
| Companion-service (dinamici) | 10 | 10 |
| Backend Spring Boot (statici) | 4 | 4 |
| Gestione segreti | 6 | 6 |
| **Totale** | **22** | **22** |

Nessuna vulnerabilità aperta al momento del test. Le aree non ancora coperte
(autenticazione utente, conformità GDPR per i dati di categoria speciale,
rate limiting sulle API REST del backend, migrazioni schema con `ddl-auto`)
restano da affrontare prima del go-live e sono tracciate separatamente.
