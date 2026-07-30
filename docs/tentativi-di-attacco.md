# Tentativi di attacco

Registro pubblico di quello che arriva addosso a NeuroDesk e di cosa abbiamo
cambiato di conseguenza.

Esiste per due motivi. Il primo è che un progetto che tratta dati di salute
dovrebbe dire cosa gli succede, non solo cosa promette. Il secondo è più utile:
**ogni voce qui sotto ha prodotto una correzione**, e le correzioni valgono più
del racconto.

Gli indirizzi delle scansioni sono riportati quando appartengono a macchine
noleggiate in un datacenter. Gli indirizzi di visitatori normali non compaiono
mai, in nessuna forma.

---

## 30 luglio 2026 — scansione alla ricerca di credenziali

**Quando.** 00:07:25–00:07:53 UTC. Ventotto secondi.

**Cosa.** 337 richieste da un solo indirizzo, 11,84 al secondo, su due
connessioni HTTP/2. 226 percorsi distinti, applicati a entrambi i domini.

**Da dove.** `34.150.133.136` — Google Cloud, regione `us-east4`, reverse DNS
`136.133.150.34.bc.googleusercontent.com`. Una macchina noleggiata.

**Come si presentava.** Per 273 richieste come `ClaudeBot/1.0`, il crawler di
Anthropic. Per 64 come Chrome su Windows.

> Non possiamo dimostrare che quel nome sia falso: Anthropic non pubblica un
> elenco di intervalli IP per il crawler. Possiamo dire che l'indirizzo **non
> ricade** negli intervalli che Anthropic pubblica per API e chiamate in uscita
> (`160.79.104.0/21`), e che un crawler di indicizzazione non ha motivo di
> chiedere `/.aws/credentials`.

**Cosa cercava.** Nell'ordine: i file di build per capire con che cosa è fatto
il sito (webpack, Vite, Next, Nuxt, Astro), il **source map** del JavaScript,
pannelli di debug di sette framework diversi, endpoint GraphQL, e infine
credenziali — `.aws/credentials`, `service-account.json`,
`firebase-adminsdk.json`, `.npmrc`, `.docker/config.json`, `.env` in undici
varianti.

Otto richieste erano per file di configurazione di **strumenti di sviluppo
basati su AI**: `.claude.json`, `.claude/settings.json`, `.codex/config.toml`,
`.cursor/mcp.json`, `.continue/config.json`, `.aider.conf.yml`,
`.config/anthropic/credentials/default.json`. Sono i file dove chi programma
con questi strumenti si ritrova le chiavi API.

**Cosa ha ottenuto: niente.**

- 128 delle 137 risposte «200» erano **lo stesso file da 511 byte**: la pagina
  vuota dell'applicazione
- le 9 con contenuto reale sono file pubblici per scelta: il bundle JavaScript
  e le pagine del sito
- il **source map non è pubblicato**: `index-CjpTgGBi.js.map` ha risposto con la
  pagina vuota, non con il codice
- tutte le 14 richieste a `/api/*` hanno risposto **401**
- nessun tentativo di autenticazione: l'intestazione `Authorization` era assente
  in tutte e 337 le richieste, e `Cookie` pure

**Non era adattivo.** Ha scaricato il bundle JavaScript, che contiene i nomi
veri degli endpoint (`api/tester`, `api/auth/chiave-ai`, `api/tester/consumo`).
Nelle 324 richieste successive non ne ha chiesto **nemmeno uno**: ha continuato
con la sua lista. Lo si vede anche dal fatto che ha sondato insieme stack
mutuamente incompatibili — WordPress e Spring Boot, cinque impianti di build
alternativi, quattro linguaggi diversi.

**Non conosceva il progetto.** Nessun percorso richiesto è ricavabile dal
codice sorgente pubblico.

---

### Cosa abbiamo cambiato

L'evento non ha causato danni. Ha però mostrato tre difetti nostri, che erano
lì da prima.

**1. Il sito rispondeva «esiste» a qualunque percorso.**
L'applicazione è una single-page: qualunque indirizzo veniva rimandato alla
pagina principale con stato 200. Allo scanner abbiamo risposto **128 volte**
«sì, quel file c'è». Non ha ottenuto niente, ma è il segnale sbagliato.

Ora esiste una **lista bianca**: le dieci rotte reali, gli asset, tre file di
radice. Tutto il resto risponde **404**, con una pagina leggibile invece di una
risposta muta — chi ha solo sbagliato a digitare deve capire cosa fare.

Una lista bianca e non l'ennesimo ampliamento di una lista nera, perché se
dimentichiamo una rotta la pagina non si apre e ce ne accorgiamo; se
dimentichiamo un percorso in una lista nera, non se ne accorge nessuno. In più
un controllo automatico confronta la lista con le rotte dell'applicazione a ogni
verifica.

**2. Il rilevamento guardava solo un elenco di percorsi noti.**
Delle 337 richieste ne aveva riconosciute **56**. Tutta la parte di mappatura,
i pannelli di debug e i file di credenziali che non erano nell'elenco sono
passati senza essere registrati.

Un elenco di cose vietate resta sempre indietro. Con la correzione precedente il
segnale arriva gratis: se il sito risponde 404 a tutto ciò che non esiste,
allora **lo stato 404 è già la lista bianca**, e non c'è nessun secondo elenco
da tenere allineato.

**3. Il log degli accessi non esisteva.**
Prima del 29 luglio 2026 il server non registrava chi bussava. Di tutto quello
che è arrivato prima di quella data **non sappiamo niente, e non lo scopriremo**.

### Il risultato, misurato

La stessa scansione, **rigiocata identica** contro il sito corretto (337
richieste vere, riprodotte dal log congelato):

| | prima | dopo |
|---|---|---|
| risposte «esiste» (200) | 137 | **11** |
| non trovato (404) | 184 | **312** |
| respinte dalle API (401) | 14 | 14 |
| riconosciute dal rilevamento | **56 su 337** | **312 su 337** per richiesta, più la sessione intera |

Le 11 risposte 200 rimaste sono esattamente i file pubblici: il bundle
JavaScript, le pagine del sito, e la pagina vuota dell'app per le due sole
rotte reali che aveva toccato.

Al livello sessione la scansione fa scattare due condizioni su tre —
«scansione ampia» e «sonda mirata» — con 92,6% di percorsi non trovati su 217
distinti.

---

### Nota sul metodo, per chi legge da tecnico

Le soglie di rilevamento sono state tarate misurando il traffico reale, non
scelte a intuito. La misura ha smentito due ipotesi:

- **le richieste al secondo non separano niente.** Il traffico legittimo arriva
  a 25,8 richieste al secondo (un browser che carica una pagina fa molte
  richieste in parallelo); le scansioni misurate si fermano a 15,7. Una soglia
  su questa metrica avrebbe colpito i tester e lasciato passare lo scanner
- **una soglia sui percorsi non trovati segnalava un iPhone.** Dieci richieste,
  100% di errori, tutte per `apple-touch-icon.png` e `favicon.ico`, che il sito
  non serve. I percorsi che un client chiede per convenzione, senza sapere
  niente del sito, non contano

Due limiti dichiarati: la taratura poggia su **un solo caso ostile reale**, e
chi distanzia le richieste oltre due minuti resta invisibile al conteggio per
sessione.

---

## Altre attività registrate

**29 luglio 2026, 22:13 UTC** — `185.8.106.162`, tre richieste, user agent
`vuln_scanner/3.0.0 (CVE-2026-4020)`. Cercava una vulnerabilità di un plugin
WordPress. NeuroDesk non è WordPress. Nessun effetto.

**Rumore di fondo continuo** — richieste singole a `/wp-login.php`, `/.env`,
`/phpmyadmin` da indirizzi sempre diversi. È quello che riceve qualunque cosa
esposta su internet.

---

## Cosa non troverai qui

Non pubblichiamo indirizzi di visitatori normali, contenuti di conversazioni,
né dettagli che aiuterebbero a evitare i controlli. I percorsi-trappola sono
invece nel codice, pubblico: sono la lista standard di qualunque scanner
automatico, e tenerli segreti non proteggerebbe da niente.
