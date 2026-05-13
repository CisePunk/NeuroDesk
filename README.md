# NeuroDesk

NeuroDesk e' una piattaforma full stack nata come progetto finale per un corso Full Stack Developer e poi evoluta in un sistema di supporto per persone neurodivergenti, con particolare attenzione ad ADHD, carico cognitivo alto, difficolta' di memoria, difficolta' di sintesi, studio non lineare, energia variabile e blocchi pratici.

Il progetto e' stato pensato e curato da Cinzia Cipri.

## Nota sullo stato dell'AI (importante)

Il Companion funziona **da subito in modalita' demo (`mock`)**: risponde in locale,
in modo deterministico, senza chiavi e senza consumare token. Questa modalita' e'
pensata per mostrare l'architettura completa, i flussi e l'interfaccia senza costi.

Le **risposte AI reali** (generate da un modello linguistico) richiedono di collegare
una chiave API OpenAI compatibile. Basta inserire la chiave nel file
`companion-service/.env` e avviare il
servizio con il flag che carica le variabili d'ambiente:

```bash
node --env-file=companion-service/.env companion-service/src/server.js
```

Senza chiave, il servizio resta volutamente in `mock` (verificabile con
`GET /health` -> `"provider": "mock"`). Questa e' una scelta progettuale: il
gancio AI e' l'ultimo passo di configurazione, non una parte mancante del codice.

## Da cosa e' nato

La prima versione di NeuroDesk nasceva come gestionale didattico: una piattaforma per organizzare studenti, moduli di studio e task. L'idea iniziale era mostrare competenze full stack attraverso un'applicazione concreta, non una semplice lista di cose da fare.

Fin dall'inizio il progetto aveva una direzione precisa: trattare lo studio come un processo influenzato da energia, attenzione, difficolta', carico cognitivo e priorita'. Per questo le entita' non sono generiche:

- uno studente ha un profilo neurodivergente e un livello di energia preferito
- un modulo ha difficolta', tecnologia, stato e carico cognitivo
- un task ha priorita', stato, durata stimata, tag focus e finestra di energia

Questa struttura permette di rappresentare uno studio piu' realistico: non tutti i task pesano allo stesso modo, non tutte le persone funzionano nello stesso modo, e non tutte le giornate hanno la stessa energia.

## A cosa e' arrivato

Il progetto oggi e' composto da tre parti:

1. Backend Spring Boot
2. Frontend React + Vite
3. Companion Service Node.js per funzioni AI

La prima parte resta un gestionale di studio. La seconda parte rende il gestionale navigabile da interfaccia web. La terza parte aggiunge un servizio AI separato, pensato per trasformare blocchi, confusione e sovraccarico in micro-azioni sostenibili.

Il Companion non e' ancora integrato come pagina React definitiva. Al momento espone API funzionanti e documentate, pronte per essere collegate al frontend.

## Perche' e' stato esteso con AI

Dopo la prima versione, il progetto e' stato riletto alla luce di un caso reale: una persona adulta con ADHD, difficolta' cognitive, problemi fisici, terapie, difficolta' con studio, lavoro, burocrazia, soldi, memoria e autostima.

Da questa analisi e' emerso che un semplice task manager non basta.

Una persona in forte sovraccarico spesso non ha bisogno di una dashboard piu' ricca. Ha bisogno di una domanda piu' piccola:

> Cosa non riesci a fare adesso?

NeuroDesk Companion nasce per questo: non per sostituire professionisti, tutor, medici o servizi sociali, ma per aiutare a ridurre il caos a un prossimo passo concreto.

## Cosa fa oggi

### Gestionale principale

- gestione studenti
- gestione moduli
- gestione task di studio
- dashboard con contatori
- progressione task completati
- tema chiaro/scuro
- interfaccia responsive
- campi specifici per energia, focus e carico cognitivo

### Companion Service

- endpoint `GET /health`
- endpoint `POST /api/companion/respond`
- modalita' operative:
  - `crisis_mode`
  - `study_mode`
  - `bureaucracy_mode`
  - `work_mode`
  - `autonomy_mode`
- modalita' `mock` senza consumo token
- modalita' `openai` predisposta tramite API key lato server
- prompt di sistema dedicato al target neurodivergente/adulto fragile
- filtro safety base prima della chiamata AI
- stima token in modalita' mock
- documentazione API in `docs/api-contract.md`

## Stack tecnico

### Backend

- Java 21
- Spring Boot 4
- Spring Web MVC
- Spring Data JPA
- Hibernate
- MySQL
- Jakarta Validation
- Maven

Cartella:

```text
backend
```

API principali:

```text
GET  /api/studenti
POST /api/studenti

GET  /api/moduli
POST /api/moduli

GET  /api/task
POST /api/task
```

### Frontend

- React 19
- Vite
- React Router
- CSS custom con variabili tema
- dark/light mode con `localStorage`
- proxy Vite per il Companion Service

Cartella:

```text
frontend
```

### Companion Service

- Node.js >= 20.6
- moduli nativi Node
- nessuna dipendenza esterna
- `node --env-file=.env`
- provider mock
- provider OpenAI compatibile

Cartella:

```text
companion-service
```

## Accessibilita' e design

L'interfaccia e' stata rivista per ridurre alcuni stimoli visivi non adatti al target:

- i blob animati della dashboard sono statici
- il pattern a puntini e' stato reso piu' leggero
- i glow sul testo sono stati rimossi
- e' stata aggiunta la media query `prefers-reduced-motion`
- il tema chiaro/scuro resta disponibile

Questa scelta nasce dal fatto che movimento periferico, rumore visivo e testo sfocato possono aumentare il carico percettivo per persone con ADHD, difficolta' di lettura o sovraccarico cognitivo.

## Privacy, token e limiti

Il Companion Service puo' funzionare in due modi:

- `AI_PROVIDER=mock`: nessun dato viene inviato a provider AI esterni
- `AI_PROVIDER=openai`: il messaggio e il profilo fornito possono essere inviati al provider configurato

In modalita' AI reale, l'utente finale deve collegare una propria API key o sottoscrivere un piano che copra il costo dei token.

Prima di inviare dati sensibili, l'interfaccia dovra' informare chiaramente l'utente. Dati come diagnosi, invalidita', terapie, salute, difficolta' cognitive, burocrazia e situazione economica sono dati delicati.

NeuroDesk Companion non:

- fa diagnosi
- interpreta QI, invalidita' o referti
- consiglia farmaci
- sostituisce medico, psicologo, tutor, CAF, patronato, universita' o consulente legale
- promette lavoro, benefici, guarigione o risultati universitari

In caso di rischio immediato per la sicurezza personale, il servizio invita a contattare il 112 o una persona fidata.

## Stato attuale

Verifiche eseguite il 20 giugno 2026:

- frontend `npm run lint`: passato
- frontend `npm run build`: passato
- backend `./mvnw test`: passato
- Companion Service `GET /health`: passato
- Companion Service `POST /api/companion/respond`: passato in modalita' mock
- pagina React `/companion`: integrata nel frontend

## Documentazione

- HOWTO operativo: `docs/HOWTO_USO.md`
- MVP Companion: `docs/neurodesk-companion-mvp.md`
- Prompt di sistema: `docs/system-prompt.md`
- Contratto API: `docs/api-contract.md`
- Piano di integrazione: `docs/integration-plan.md`
- Esempi di flussi: `docs/example-flows.md`

## Struttura progetto

```text
neurodesk
├── backend
├── frontend
├── companion-service
├── docs
├── screenshots
└── README.md
```

## Prossimi passi tecnici

1. Migliorare la pagina Companion con storico conversazioni.
2. Salvare le sessioni Companion nel backend Spring Boot.
3. Aggiungere una tabella `CompanionSession`.
4. Aggiungere una tabella `MicroAction`.
5. Aggiungere rate limiting prima di qualsiasi deploy remoto.
6. Valutare provider AI alternativi oltre OpenAI compatibile.
7. Aggiungere consenso esplicito persistente per dati sensibili e token.

## Autrice

Progetto ideato, sviluppato e curato da Cinzia Cipri come progetto finale full stack, poi ampliato come piattaforma neurodivergent-friendly con estensione AI.
