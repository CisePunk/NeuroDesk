# NeuroDesk — panoramica del progetto

*Fotografia al 31 luglio 2026.*

Questo documento raccoglie **tutto ciò che c'è nel progetto**, diviso per
categorie. Per ogni categoria: **come ci siamo arrivati** (il ragionamento, non
solo il risultato) e **cosa è stato fatto** (l'elenco concreto). In fondo: il
disegno dell'infrastruttura e il wireframe.

Non serve leggerlo tutto in una volta. Ogni categoria si regge da sola.

---

## Cos'è

NeuroDesk è un compagno digitale per persone neurodivergenti: un *Companion*
conversazionale che aiuta a sbloccarsi su un compito, più una parte di
amministrazione per chi segue i tester (codici d'accesso, feedback, consumo).
È un prototipo didattico, ma è **in produzione reale** su un server, con utenti
veri — quindi le scelte di privacy e sicurezza sono trattate come se lo fosse a
tutti gli effetti.

---

## 1. Infrastruttura

Due domini, un solo server. `neurodesk.it` serve la landing statica;
`app.neurodesk.it` serve l'applicazione e l'API. Davanti a tutto c'è Caddy, che
fa da portiere: cifratura HTTPS automatica, e decide cosa può entrare.

```mermaid
flowchart TB
    U["Tester / visitatore<br/>(browser)"]
    A["Amministratore<br/>(login scuola)"]

    subgraph VPS["VPS OVH · 164.132.198.90 · Ubuntu"]
        direction TB
        C["Caddy<br/>reverse proxy + HTTPS automatico<br/>whitelist: tutto ciò che non è rotta reale → 404"]
        L["Landing statica<br/>neurodesk.it"]
        F["Frontend React (SPA)<br/>app.neurodesk.it"]
        B["Backend Spring Boot<br/>API /api/*"]
        CS["companion-service<br/>(Node, zero dipendenze)"]
        DB[("MySQL 8.4<br/>dati cifrati a riposo")]
        H["Honeypot<br/>legge il log di Caddy"]
        CP["Controllo periodico<br/>(ogni 3 giorni, systemd timer)"]
    end

    OA["OpenAI API"]
    MAC["Mac di casa<br/>backup giornaliero"]

    U -->|HTTPS| C
    A -->|HTTPS| C
    C --> L
    C --> F
    C -->|/api/*| B
    B --> DB
    B --> CS
    CS -->|chiave del tester| OA
    C -. access.log .-> H
    CP -. controlla .-> VPS
    DB -. dump notturno .-> MAC
```

**Come ci siamo arrivati.** Un solo server tiene tutto: è un prototipo, non
serve un'architettura distribuita. Ma la separazione dei ruoli è netta — Caddy
non serve mai file che non siano rotte vere, il backend non parla mai con OpenAI
(lo fa solo il companion-service, e solo con la chiave del singolo tester), il
database non è raggiungibile da fuori.

**Cosa c'è:**
- **Caddy** — reverse proxy, HTTPS automatico (Let's Encrypt), whitelist dei
  percorsi (vedi §4).
- **Backend Spring Boot 4** (Java 21) — API sotto `/api/*`, autenticazione,
  logica di dominio.
- **companion-service** (Node, nessuna dipendenza esterna) — l'unico che chiama
  OpenAI, usando la chiave del tester.
- **MySQL 8.4** — dati cifrati a riposo (AES-256-GCM), non esposto a internet.
- **systemd** — ogni servizio è un'unità gestita, riparte da solo.
- **Honeypot + controllo periodico** — difesa e sorveglianza (vedi §5, §8).

---

## 2. L'applicazione

**Come ci siamo arrivati.** Il cuore è il Companion: una conversazione che
sblocca. Intorno, il minimo per gestirlo — chi sono i tester, cosa serve loro,
cosa hanno detto.

**Cosa è stato fatto:**
- **Companion** conversazionale ([CompanionPage](../frontend/src/pages/CompanionPage.jsx)),
  con cronologia salvata e cifrata.
- **Aree di amministrazione**: codici d'accesso, feedback e report, moduli,
  task, consumo — le pagine sotto [frontend/src/pages/](../frontend/src/pages/).
- **API REST** documentata in [docs/api-contract.md](api-contract.md), con
  controller separati per ruolo (`AuthController`, `CompanionSessionController`,
  `TesterController`, `FeedbackController`, `InternalController`…).
- **Aiuto in-app** (il "?"): spiegazioni contestuali, senza uscire dall'app.
- **Bersagli tattili** ingranditi su mobile (accessibilità).

---

## 3. Accesso e privacy (GDPR)

**Come ci siamo arrivati.** I contenuti del Companion (blocco, difficoltà,
gestione) sono **dati sulla salute** — categoria particolare, art. 9 GDPR — anche
se il servizio è un tutor, non un medico. Quindi: nessun nome, nessuna email.
Si entra con un **codice**. Ma il legame codice↔persona esiste ancora (chi
gestisce lo conosce): quindi è **pseudonimo, non anonimo**. La parola giusta,
sulle superfici tecniche, è "pseudonimo" — è più corretta e non promette
un'anonimizzazione che non c'è.

**Cosa è stato fatto:**
- **Accesso pseudonimo tramite codice** — niente dati anagrafici.
- **Cifratura a riposo** (AES-256-GCM): un dump del database o un backup rubato
  restituisce testo cifrato. *Perimetro dichiarato:* non protegge da un'app già
  compromessa (a quel punto la chiave è in memoria).
- **Cancellazione a 30 giorni** delle conversazioni.
- **Chiave separata** codice↔persona (l'esempio che l'art. 32 cita come misura
  adeguata).
- Terminologia allineata a "pseudonimo" su README, test di sicurezza e
  descrizione del repo (il testo rivolto all'utente resta semplice).

> ⚠️ La chiave crittografica `neurodesk.crypto.secret` **non è ruotabile**:
> ruotarla renderebbe illeggibili per sempre le conversazioni salvate.

---

## 4. Sicurezza applicativa

**Come ci siamo arrivati.** Il modello è una classe nota di broken access
control (caso *Baudr*): un'app pubblicata con un pannello di amministrazione
raggiungibile senza login, da cui si scaricavano i dati di tutti. La domanda non è "è sicura?" ma "ha *quel* buco?". Ogni verifica
è una richiesta HTTP reale, dall'esterno — non una convinzione.

**Cosa è stato fatto** (dettaglio in [audit-sicurezza-30-luglio-2026.md](audit-sicurezza-30-luglio-2026.md)):
- **Nessun pannello admin anonimo**: le 7 funzioni riservate rispondono **401**
  da anonimo; un utente loggato ma senza ruolo riceve **403**.
- **Nessun IDOR**: ogni query sui dati sensibili cerca *per id e proprietario
  insieme* (`findByIdAndUtenteId`). La conversazione altrui non viene "trovata e
  poi negata": non viene proprio trovata. Verificato con `grep` che nessuna query
  usi `findById` senza il vincolo del proprietario.
- **Superficie completa**: le 19 rotte dell'API (estratte dal bundle pubblico,
  non indovinate) provate da anonimo → tutte 401 tranne `/api/auth/login`.
- **Canale interno** `/api/internal/*`: **404 dal web** (Caddy lo chiude),
  protetto da token con confronto a tempo costante.
- **Whitelist 404 in Caddy**: solo rotte reali, asset e file di root noti
  rispondono 200; tutto il resto → 404 (con una pagina 404 leggibile). Questo
  riduce la superficie e alimenta l'honeypot (§5).

---

## 5. Difesa attiva — honeypot

**Come ci siamo arrivati.** Un sito pubblico viene scansionato ogni giorno: il
rumore di fondo di internet. All'inizio l'honeypot "osservava e basta". L'ho
portato al livello successivo dopo che un pentester volontario si è offerto di
guardarlo da fuori. Il problema di ogni allarme è il **falso positivo**: un
allarme che scatta su un iPhone che chiede la propria icona non serve a niente.
Così ogni regola è stata **tarata sul traffico vero** del 30 luglio, e i tre
falsi positivi trovati dal vivo sono ora bloccati da test automatici.

**Cosa è stato fatto** ([deploy/honeypot.py](../deploy/honeypot.py)):
- **Due livelli di rilevamento**: per-richiesta (un 404 fuori whitelist) e
  per-sessione (soglie A = scansione ampia, B = sonda mirata, C = enumerazione).
  Le soglie sono **misurate**, non intuite.
- **Impronte salate**: gli IP non si salvano in chiaro nell'archivio — si salva
  un hash con sale a rotazione mensile. IPv6 raggruppato per /64.
- **Intelligence**: reverse DNS ed euristica "è un datacenter?" per distinguere
  una persona da uno scanner in cloud.
- **Log operativo separato** (`/var/log/neurodesk/sicurezza.log`) con gli IP
  veri, da leggere insieme al pentester — a parte dall'archivio anonimizzato.
- **Origini note e pentester esentati**: la rete di casa e (quando ci sarà) l'IP
  del pentester non fanno scattare la mail.
- **18 test automatici** ([tests/test_honeypot_logica.py](../tests/test_honeypot_logica.py)):
  girano da soli, senza rete, in un decimo di secondo; bloccano le tre tarature
  contro le regressioni.

---

## 6. Multilingua (IT / EN / FR)

**Come ci siamo arrivati.** I tester non sono tutti italiani; e le domande di
feedback, se non capite, danno risposte inutili.

**Cosa è stato fatto:**
- Interfaccia completa in italiano, inglese e francese
  ([frontend/src/i18n/](../frontend/src/i18n/)).
- Anche le domande di feedback tradotte.

---

## 7. "Bring your own token" (BYOT)

**Come ci siamo arrivati.** Il credito OpenAI condiviso è limitato. Un tester che
vuole usare di più deve poter mettere **la propria chiave** — in autonomia, dalle
opzioni del Companion, senza passare dall'amministratore. Regola di ferro: una
chiave personale **non deve mai** ricadere sul credito condiviso.

**Cosa è stato fatto:**
- Il tester aggiunge la propria chiave API dalle opzioni del Companion.
- La chiave è cifrata; la decifra solo il companion-service, via canale interno.
- **Canary/tripwire sul login**: se la chiave viene usata dove non dovrebbe,
  si vede.
- Nessun fallback silenzioso sul credito condiviso.

---

## 8. Operatività

**Come ci siamo arrivati.** Un prototipo in produzione va comunque tenuto in
piedi: i dati vanno salvati, il server va controllato, le vulnerabilità nuove
vanno intercettate — senza doverlo fare a mano ogni giorno.

**Cosa è stato fatto:**
- **Backup giornaliero** dal server al Mac di casa
  ([deploy/scarica-backup.py](../deploy/scarica-backup.py), schedulato via
  `launchd`).
- **Controllo periodico ogni 3 giorni**
  ([deploy/controllo-periodico.sh](../deploy/controllo-periodico.sh), systemd
  timer): integrità, accessi SSH, aggiornamenti di sicurezza pendenti, e il
  riepilogo honeypot (sezione A7).
- **Verifica CVE / aggiornamenti**: openssl aggiornato; la CVE HIGH di
  react-router valutata **non applicabile** (siamo una SPA client, niente RSC).
- **Rotazione del sale** dell'honeypot mensile
  ([deploy/ruota-sale.sh](../deploy/ruota-sale.sh)).
- **Cronologia** in [CHANGELOG.md](../CHANGELOG.md); tracce degli attacchi in
  [docs/tentativi-di-attacco.md](tentativi-di-attacco.md).

---

## 9. Wireframe

Struttura delle schermate principali. È volutamente schematico — serve a
ragionare sul layout, non a definire i colori.

### Companion (la schermata centrale)

```
┌──────────────────────────────────────────────┐
│  NeuroDesk          [IT/EN/FR ▾]   [?]  [esci] │  ← intestazione
├──────────────────────────────────────────────┤
│                                                │
│   ┌────────────────────────────────────────┐  │
│   │  Ciao. Su cosa sei bloccato/a?          │  │  ← messaggio del Companion
│   └────────────────────────────────────────┘  │
│                    ┌─────────────────────────┐ │
│                    │  Devo scrivere una mail │ │  ← messaggio del tester
│                    └─────────────────────────┘ │
│   ┌────────────────────────────────────────┐  │
│   │  Ok. Partiamo dalla prima riga...       │  │
│   └────────────────────────────────────────┘  │
│                                                │
│   (cronologia scorrevole, cifrata)             │
│                                                │
├──────────────────────────────────────────────┤
│  [ scrivi qui... ]                    [ invia ]│  ← barra di input
│  ⚙ opzioni · usa la mia chiave API (BYOT)      │  ← accesso a BYOT
└──────────────────────────────────────────────┘
```

### Login (accesso pseudonimo)

```
┌──────────────────────────────────────────────┐
│                  NeuroDesk                     │
│                                                │
│            ┌──────────────────────┐            │
│            │  codice: [_________] │            │  ← nessun nome, nessuna email
│            │  password:[________] │            │
│            │       [  entra  ]    │            │
│            └──────────────────────┘            │
│         accesso pseudonimo tramite codice      │
└──────────────────────────────────────────────┘
```

### Codici (amministrazione — chi ha usato il Companion)

```
┌──────────────────────────────────────────────┐
│  Codici                          3 hanno usato │
├──────────────────────────────────────────────┤
│  nd-a1b2c3d4  ✓ ha usato il Companion          │
│               12 messaggi · dal 28/07 al 31/07 │
│  nd-9f3a...   — mai entrato                     │
│  nd-71c2...   ✓ 4 messaggi · 30/07             │
└──────────────────────────────────────────────┘
```

### Come rigenerare questi wireframe come immagine

Se ti serve una versione grafica (PNG/SVG) da mettere in una slide:

1. **Excalidraw** (excalidraw.com) — gratis, stile a mano libera. Ricrea i tre
   riquadri sopra e esporta in PNG/SVG. È il più veloce.
2. **tldraw** (tldraw.com) — stesso scopo, se preferisci l'interfaccia.
3. **Figma** con il plugin "Wireframe", o anche solo un frame con rettangoli
   grigi: basta e avanza. (Mermaid no — fa diagrammi di flusso, non wireframe.)

Consiglio: parti da Excalidraw, tre frame (Login, Companion, Codici), 15 minuti.

---

## 10. Come ci siamo arrivati — in breve

La linea del tempo, per capire l'ordine delle scelte:

1. App funzionante (Companion + amministrazione).
2. Accesso pseudonimo + cifratura art. 9.
3. Contact form e rate-limiting sistemati; aiuto in-app; mobile.
4. Multilingua e BYOT.
5. Backup automatico.
6. Audit su broken access control (modello *Baudr*): nessun pannello anonimo, nessun IDOR.
7. Whitelist 404 in Caddy.
8. Honeypot passivo → due livelli → intelligence → log operativo.
9. Tarature bloccate in test automatici.
10. Verifica vulnerabilità e questo documento.

---

*Documenti collegati:*
[audit-sicurezza-30-luglio-2026.md](audit-sicurezza-30-luglio-2026.md) ·
[api-contract.md](api-contract.md) ·
[security-tests.md](security-tests.md) ·
[tentativi-di-attacco.md](tentativi-di-attacco.md) ·
[CHANGELOG.md](../CHANGELOG.md)
