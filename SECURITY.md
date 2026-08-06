# Sicurezza

NeuroDesk tratta dati di categoria particolare (neurodivergenza, salute,
difficoltà cognitive — Art. 9 GDPR): dati che, se escono, fanno un danno reale a
chi li ha affidati. Questo file dice come segnalare un problema e dove trovare la
documentazione di sicurezza; il lavoro completo è nei documenti qui sotto.

## Segnalare una vulnerabilità

Scrivi a **hello@neurodesk.it**. Descrivi cosa hai trovato e come riprodurlo.

- Non aprire una issue pubblica per una vulnerabilità non ancora corretta.
- Rispondiamo entro pochi giorni. Ogni segnalazione confermata produce una
  correzione, e la correzione viene registrata pubblicamente (vedi sotto).
- È un progetto piccolo, in fase di test con un gruppo ristretto: non c'è un
  programma di bug bounty, ma il merito di chi segnala viene riconosciuto.

## Come è difeso, in breve

- **Accesso**: nessuna registrazione pubblica. Codici pseudonimi ad alta entropia
  (~80 bit), JWT firmato HS256, ruolo riletto dal database a ogni richiesta.
  Rate limiting per IP su login e form pubblici. Confronto a tempo costante per
  non rivelare dai tempi di risposta se un codice esiste.
- **Dati**: conversazioni cifrate (AES-256-GCM) con chiave dedicata, distinta dal
  segreto JWT. Consenso informato obbligatorio e revocabile. Segreti fuori dal
  codice, in variabili d'ambiente; l'app rifiuta di partire con segreti deboli.
- **Rete**: solo chiavi su SSH (niente password), HTTPS con HSTS, CSP,
  X-Frame-Options DENY. Canale interno servizio-a-servizio chiuso all'esterno.
- **Osservazione e blocco**: un honeypot riconosce le scansioni e avvisa;
  fail2ban e CrowdSec bloccano attivamente gli IP che insistono.

## La documentazione di sicurezza

Il lavoro completo, con il rischio residuo dichiarato riga per riga:

- [Modello di minaccia](docs/modello-di-minaccia.md) — analisi STRIDE e LINDDUN,
  rischio residuo su ogni voce, e una sezione che dichiara cosa resta scoperto.
- [La difesa, a più livelli](docs/difesa-a-livelli.md) — come gli strati si
  coprono a vicenda.
- [Prove di sicurezza svolte](docs/security-tests.md) — test dinamici, analisi
  statica, gestione dei segreti, dipendenze e CVE.
- [Audit di sicurezza — 30 luglio 2026](docs/audit-sicurezza-30-luglio-2026.md).
- [Tentativi di attacco e cosa abbiamo cambiato](docs/tentativi-di-attacco.md) —
  il registro pubblico: ogni voce ha prodotto una correzione.

## Ambito

Riguarda il codice di questo repository e il servizio ospitato su
`neurodesk.it` / `app.neurodesk.it`. La configurazione operativa del server
(SSH, firewall, fail2ban, CrowdSec) non è codice e non risiede qui, ma è
descritta nei documenti sopra.
