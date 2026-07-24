# NeuroDesk — Checklist di messa online (fase test)

Obiettivo: mettere online NeuroDesk per i tester, su **un VPS a proprietà europea**
(Hetzner CX22, datacenter in Germania) con **Caddy** (HTTPS automatico, niente
Cloudflare), **MySQL**, dati conservati in UE. Dominio **neurodesk.it** su OVH.
Architettura: un solo server, due siti dietro Caddy.

```
                    Internet
        ┌──────────────┴───────────────┐
  https://neurodesk.it          https://app.neurodesk.it
        │                              │
   ┌────▼──────────────────────────────▼────┐
   │                Caddy                   │  (TLS Let's Encrypt automatico)
   └────┬──────────────────────────┬───┬────┘
        │ landing statica          │   │
        │ (3 file HTML)  /api/companion│ │ tutto il resto (SPA + /api/*)
        │                ┌─────────▼┐ ┌▼──────────────┐
        │                │companion │ │ backend Spring│──► MySQL (127.0.0.1)
        │                │  :8090   │ │    :8080      │
        └───             └──────────┘ └───────────────┘
```

Legenda: ⛔ = bloccante prima del lancio · ✅ = già sistemato nel codice · ○ = da fare

---

## 0. Prima di iniziare

- [x] ✅ **Consenso lato server (#2 della revisione).** Fatto: il claim `consenso`
  viaggia firmato nel JWT e il companion rifiuta con **403** uno `STUDENTE` che non
  l'ha dato (la `SCUOLA` è esente). Il consenso Art. 9 non è più imposto solo
  dall'interfaccia. → Nessuna decisione in sospeso.
- [x] ✅ **Robustezza chiamate AI.** Timeout (`AI_TIMEOUT_MS`, default 30s) e **un**
  ritentativo sui soli errori transitori (429 / 529 / 5xx); gli errori "veri"
  (401 chiave sbagliata, 400 modello inesistente) falliscono subito. Il motivo
  tecnico finisce nei log del server — **mai** il testo dell'utente né il profilo —
  e il client riceve **502** con un messaggio comprensibile invece di un 500 muto.

---

## 1. Dominio e DNS (OVH)

- [x] ✅ Dominio registrato: **neurodesk.it** (OVH).
- [ ] ○ Nella zona DNS OVH, tre record **A** verso lo stesso IP del VPS:

  | Record | Punta a | Serve per |
  |---|---|---|
  | `@` | IP del VPS | landing su `neurodesk.it` |
  | `www` | IP del VPS | redirect a `neurodesk.it` |
  | `app` | IP del VPS | l'applicazione su `app.neurodesk.it` |

- [ ] ○ Verifica: `dig +short neurodesk.it` e `dig +short app.neurodesk.it`
  devono dare entrambi l'IP del VPS.
- [ ] ⛔ **Casella `hello@neurodesk.it`.** Tutti i pulsanti della landing sono
  `mailto:hello@neurodesk.it`: se la casella non esiste, ogni richiesta di
  partecipazione si perde nel nulla. Su OVH attiva l'email inclusa nel dominio
  (o un inoltro verso la tua casella) e **manda una prova a te stessa** prima di
  pubblicare.

## 1-bis. Gli script (fanno quasi tutto da soli)

Nella cartella [`deploy/`](../deploy/):

| Script | Dove si lancia | Quando |
|---|---|---|
| `01-prepara-server.sh` | sul VPS, come root | una volta sola |
| `02-pubblica.sh` | dal tuo Mac | a ogni modifica da mandare online |
| `03-installa-controllo.sh` | sul VPS, come root | una volta sola, dopo la prima pubblicazione |
| `controllo-periodico.sh` | (lo lancia il timer) | ogni 3 giorni |

I passi 2-8 qui sotto descrivono **quello che fa lo script 01**: leggili per
capire cosa succede, non per eseguirli a mano.

## 2. VPS — base

- [ ] ○ Debian/Ubuntu aggiornati: `apt update && apt upgrade -y`.
- [ ] ○ Utente non-root con sudo; login SSH a chiave, password SSH disabilitata.
- [ ] ○ Firewall: aprire **solo** 22, 80, 443 (`ufw allow 22,80,443/tcp; ufw enable`).
- [ ] ○ Installare: `openjdk-21-jdk`, `mysql-server`, `nodejs` (>=20), `caddy`.

## 3. MySQL (restiamo su MySQL, niente migrazione a Postgres)

- [ ] ○ `mysql_secure_installation`.
- [ ] ○ Crea DB e utente con **password forte generata** (non quella di dev):
  ```sql
  CREATE DATABASE neurodesk_db CHARACTER SET utf8mb4;
  CREATE USER 'neurodesk_user'@'localhost' IDENTIFIED BY '<PASSWORD_FORTE>';
  GRANT ALL PRIVILEGES ON neurodesk_db.* TO 'neurodesk_user'@'localhost';
  ```
- [ ] ○ MySQL in ascolto solo su `127.0.0.1` (default) — non esporlo su internet.
- [ ] ○ **Backup logico notturno.** Lo snapshot del VPS fotografa un disco in
  scrittura e può risultare incoerente: affiancagli un dump. Crea
  `/etc/cron.daily/neurodesk-dump` (permessi `700`):
  ```bash
  #!/bin/sh
  D=/var/backups/neurodesk; mkdir -p "$D"; chmod 700 "$D"
  mysqldump --single-transaction --quick neurodesk_db \
    | gzip > "$D/neurodesk-$(date +%F).sql.gz"
  find "$D" -name 'neurodesk-*.sql.gz' -mtime +14 -delete
  ```
  `--single-transaction` fa lo snapshot coerente senza bloccare le scritture.
  Le credenziali MySQL vanno in `/root/.my.cnf` (permessi `600`), non nello script.
- [ ] ⚠️ **Il dump NON contiene la chiave di cifratura** (vive in
  `NEURODESK_CRYPTO_SECRET`): rubato da solo è testo cifrato inutile. Ma proprio
  per questo, **un backup senza la chiave non è ripristinabile**: conserva la
  chiave in un password manager, separata dai backup.

## 4. Segreti (generarli TUTTI nuovi)

Genera valori lunghi e casuali (il `SecurityGuard` con `strict=true` rifiuta i default):
```bash
openssl rand -base64 48   # JWT secret  (>=48 byte)
openssl rand -base64 48   # login pepper
openssl rand -base64 24   # password admin
openssl rand -base64 24   # password DB
```
- [ ] ⛔ **Il JWT secret deve essere IDENTICO** tra backend (`neurodesk.jwt.secret`)
  e companion (`JWT_SECRET`), altrimenti la chat dà 401.

## 5. Backend Spring — build e config di produzione

- [ ] ○ Build: `./mvnw -q clean package -DskipTests` → `target/*.jar`.
- [ ] ⛔ **Hardening config (#1 della revisione).** NON mettere i segreti in
  `application.properties`: passali come variabili d'ambiente via systemd.
  Crea `/etc/neurodesk/backend.env` (permessi `600`, owner del servizio):
  ```ini
  NEURODESK_SECURITY_STRICT=true
  NEURODESK_TEST_MODE=false
  NEURODESK_JWT_SECRET=<il JWT secret>
  NEURODESK_CRYPTO_SECRET=<chiave DIVERSA dal JWT: cifra le conversazioni>
  # ⚠️ Se questa manca, la chiave di cifratura deriva dal JWT: ruotare il JWT
  # renderebbe illeggibili per sempre tutte le conversazioni gia' salvate.
  # E questa chiave non si puo' ruotare senza prima ri-cifrare il database.
  NEURODESK_LOGIN_PEPPER=<il pepper>
  NEURODESK_ADMIN_CODICE=<un codice non ovvio, non "scuola">
  NEURODESK_ADMIN_PASSWORD=<password admin forte>
  NEURODESK_CORS_ALLOWED_ORIGINS=https://app.neurodesk.it
  SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:3306/neurodesk_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
  SPRING_DATASOURCE_USERNAME=neurodesk_user
  SPRING_DATASOURCE_PASSWORD=<password DB>
  SERVER_ADDRESS=127.0.0.1
  SERVER_PORT=8080
  SERVER_FORWARD_HEADERS_STRATEGY=NATIVE
  ```
- [ ] ○ Servizio systemd `/etc/systemd/system/neurodesk-backend.service`:
  ```ini
  [Unit]
  Description=NeuroDesk backend
  After=network.target mysql.service
  [Service]
  EnvironmentFile=/etc/neurodesk/backend.env
  ExecStart=/usr/bin/java -jar /opt/neurodesk/backend.jar
  User=neurodesk
  Restart=on-failure
  [Install]
  WantedBy=multi-user.target
  ```
- [ ] ⛔ **Verifica il fail-closed:** avvia con un segreto debole di prova e conferma
  che l'app **si rifiuti di partire**. Poi rimetti i segreti veri.
- [ ] ○ (dopo il lancio) Passare da `ddl-auto=update` a **Flyway** + `validate`.

## 6. Companion Node — config di produzione

- [ ] ○ Copia il servizio in `/opt/neurodesk/companion-service`.
- [ ] ○ Crea `/opt/neurodesk/companion-service/.env` (permessi `600`):
  ```ini
  PORT=8090
  HOST=127.0.0.1
  CORS_ORIGIN=https://app.neurodesk.it
  JWT_SECRET=<LO STESSO JWT secret del backend>
  TRUST_PROXY_HEADER=x-forwarded-for
  AI_PROVIDER=anthropic
  ANTHROPIC_API_KEY=<la tua chiave>
  ANTHROPIC_MODEL=claude-sonnet-5    # scelto dopo confronto A/B — vedi passo 9
  ANTHROPIC_MAX_TOKENS=1024
  AI_TIMEOUT_MS=30000
  ```
- [ ] ○ Servizio systemd analogo al backend, `ExecStart=/usr/bin/node --env-file=.env src/server.js`
  (workdir sul companion-service), `User=neurodesk`, `Restart=on-failure`.
- [ ] ✅ L'endpoint AI ora **richiede JWT valido** e va in **503 se manca JWT_SECRET**
  (fail-closed) — già nel codice.

## 7. Frontend — build di produzione

- [ ] ○ `cp .env.production.example .env.production`; lascia `VITE_API_BASE_URL=`
  (vuoto = stesso dominio, dietro Caddy).
- [ ] ○ `npm ci && npm run build` → copia `dist/` in `/var/www/neurodesk`.

## 8. Caddy — reverse proxy + HTTPS automatico

- [ ] ○ `/etc/caddy/Caddyfile` — **due siti**: la landing sul dominio nudo,
  l'applicazione sul sottodominio. Caddy prende un certificato per ciascuno,
  da solo. Dentro il blocco app l'ordine conta: companion **prima** del backend.
  ```
  # 1) Landing pubblica: solo file statici, nessuna API.
  neurodesk.it {
      encode gzip
      root * /var/www/neurodesk-landing
      file_server
  }

  # 2) www -> dominio nudo, per non avere due indirizzi che rispondono uguale.
  www.neurodesk.it {
      redir https://neurodesk.it{uri} permanent
  }

  # 3) Applicazione: frontend + le due API.
  app.neurodesk.it {
      encode gzip
      root * /var/www/neurodesk

      handle /api/companion/* {
          reverse_proxy 127.0.0.1:8090
      }
      handle /api/* {
          reverse_proxy 127.0.0.1:8080
      }
      handle {
          try_files {path} /index.html   # SPA fallback
          file_server
      }
  }
  ```
- [ ] ○ Copia i tre file della landing (`landing/*.html`) in
  `/var/www/neurodesk-landing`, e la build del frontend in `/var/www/neurodesk`.
- [ ] ○ `systemctl reload caddy`. Caddy ottiene il certificato Let's Encrypt da solo.

## 9. Chiavi AI e credito

**Dove va la chiave, in due posti soltanto:**

| Ambiente | File | Note |
|---|---|---|
| Sviluppo (il tuo Mac) | `companion-service/.env` | già in `.gitignore`; si carica con `node --env-file=.env src/server.js` |
| Produzione (VPS) | `/opt/neurodesk/companion-service/.env` | `chmod 600`, owner `neurodesk`, letto da systemd |

La chiave **non** entra mai nel frontend (tutto ciò che è `VITE_*` finisce nel
bundle ed è pubblico), non entra nel backend Spring, non entra in git.

- [ ] ○ Su console.anthropic.com: **un Workspace per progetto** (NeuroDesk, Rosa
  Segnale…), con la sua chiave e il suo *spend limit*. Una chiave per progetto:
  se una perde, revochi quella senza spegnere l'altro progetto, e vedi la spesa
  divisa per progetto invece di un totale unico. Stessa logica su OpenAI (Projects).
- [ ] ○ Prepaga ~€10: bastano per tutto il pilota (vedi stima costi sotto).
- [ ] ⛔ **DPA (Art. 28) con entrambi i fornitori.** Anthropic e OpenAI sono
  **responsabili del trattamento** — non contitolari: trattano i messaggi solo su
  tua istruzione. Accetta/scarica il *Data Processing Addendum* dalle rispettive
  console e conservalo: senza, il trattamento di dati Art. 9 non è coperto.
  Valuta anche di richiedere la **zero-data-retention** ad Anthropic.
- [x] ✅ Nel consenso ([ConsentPage.jsx](../frontend/src/pages/ConsentPage.jsx))
  entrambi i fornitori sono nominati, con il loro ruolo, il fatto che **non
  addestrano** sui messaggi e il trasferimento extra-UE.

**Stima costi per scambio** (system prompt ~700 token + fino a 12 messaggi di
storia ≈ 1.500 token in ingresso, ~250 in uscita):

| Modello | Prezzo (in/out per 1M) | Per scambio | 1.000 scambi |
|---|---|---|---|
| `claude-haiku-4-5` | $1 / $5 | ~$0,003 | ~$3 |
| `claude-sonnet-5` | $3 / $15 (intro $2/$10 fino al 31/08/2026) | ~$0,008 | ~$8 |

Con 10 tester la differenza è di pochi euro sull'intero pilota: scegli sulla
**qualità del tono**, non sul prezzo. Il ramo Anthropic non invia `temperature`
(giusto così: Sonnet 5 rifiuta i parametri di campionamento non-default) — se in
futuro lo aggiungi, aggiungilo solo al ramo OpenAI.

## 10. Smoke test finale (prima di dare i codici ai tester)

- [ ] ○ `https://neurodesk.it` carica la **landing** in HTTPS (lucchetto ok).
- [ ] ○ `https://app.neurodesk.it` carica l'**applicazione** in HTTPS.
- [ ] ○ Dalla landing, il pulsante "Ho già un codice" porta al login dell'app.
- [ ] ○ Login admin (SCUOLA) → crea un codice tester.
- [ ] ○ Login col codice tester → schermata consenso → chat.
- [ ] ○ La chat risponde (provider `anthropic` nella risposta di `/health` o nel payload).
- [ ] ○ **Prova di sicurezza:** `curl -X POST https://app.neurodesk.it/api/companion/respond`
  **senza** token → deve dare **401** (non deve rispondere né consumare crediti).
- [ ] ○ `curl https://app.neurodesk.it/api/companion/health` mostra `provider: anthropic`
  e `keys.anthropic: true`.

---

## Riepilogo dei bloccanti (dalla revisione pre-lancio)

| # | Cosa | Stato |
|---|---|---|
| Endpoint AI aperto | Gating JWT + override provider solo SCUOLA | ✅ fatto e testato |
| #1 | Config prod: `strict=true`, `test-mode=false`, segreti nuovi | ○ passi 4–5 |
| #2 | Consenso lato server | ✅ fatto (claim `consenso` nel JWT + 403) |
| #4 | Frontend/CORS configurabili per produzione | ✅ fatto (passi 6–8 per usarli) |
| #3 | Rate limiter dietro proxy | ✅ fatto (`TRUST_PROXY_HEADER`, passo 6) |
| #5/#7 | Token senza exp; codice admin nei log | ✅ fatto |
```
