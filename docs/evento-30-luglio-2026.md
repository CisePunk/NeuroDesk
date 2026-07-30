# Evento del 30 luglio 2026 — registro delle affermazioni e delle ritrattazioni

Documento di lavoro per il testo pubblico. Serve a distinguere ciò che i log
dimostrano da ciò che era una mia inferenza. Le ritrattazioni sono elencate
per prime, di proposito.

Prova congelata: `34.150.133.136-337-richieste.jsonl` (337 righe, sha256
`bd1faef3fdd950adf702431b0fa385a4…`) e `access-30luglio-integrale.log.gz`
(sha256 `89e7560e5af4e3772a53eee3037ef8e1…`), fuori dal VPS, escluse da
qualunque rotazione.

---

## Ritrattazioni

### 1. Il doppio user agent NON è una prova di falsificazione

**Cosa avevo scritto:** che due user agent dallo stesso indirizzo nella stessa
sessione dimostravano che il nome dichiarato era falso.

**Perché è sbagliato:** su 338 sessioni del log, **16 hanno più di uno user
agent**, e 15 sono traffico legittimo (`151.37.134.101` con il 4% di 404,
`135.232.20.19`, `37.161.111.30` con zero 404). Un browser che aggiorna, o
la stessa persona che apre sito e app, produce lo stesso segnale.

**Non usare nel testo pubblico.**

### 2. Il numero di header non prova niente

Un crawler legittimo manda pochi header per costruzione. Le 273 richieste con
UA ClaudeBot avevano solo `User-Agent`, `Accept`, `Accept-Encoding`: è
esattamente quello che manderebbe anche un crawler vero.

**Non usare nel testo pubblico.**

### 3. Il tasso di 3,2 richieste/s era calcolato sul perimetro sbagliato

Numeratore di un insieme (85 richieste «sospette») diviso per il denominatore
di un altro. **Il valore corretto è 11,84 richieste/s** su 337 richieste in
28,471 secondi.

### 4. «Nessuna rotta di NeuroDesk espone un identificativo nel percorso»

Falso. Ce ne sono cinque: `/api/tester/{id}`, `/api/tester/{id}/stato`,
`/api/tester/{id}/etichetta`, `/api/tester/{id}/chiave`,
`/api/companion-sessions/{id}`. Nel log ci sono 46 righe che ne contengono uno.

---

## Ciò che i log dimostrano

| Affermazione | Fonte |
|---|---|
| 337 richieste dallo stesso indirizzo in 28,471 s (11,84/s) | timestamp primo/ultimo al microsecondo |
| unico indirizzo attivo in quella finestra | 1 IP distinto su 337 righe |
| l'indirizzo è Google Cloud, regione `us-east4` | `gstatic.com/ipranges/cloud.json`, prefisso `34.150.128.0/17` |
| non ricade negli intervalli Anthropic pubblicati | `platform.claude.com/docs/en/api/ip-addresses`: inbound `160.79.104.0/23`, outbound `160.79.104.0/21` |
| 226 percorsi distinti, 104 richiesti più di una volta su due host | conteggio sulle URI |
| nessun contenuto privato ottenuto | 128 risposte 200 identiche da 511 byte (index.html); le 9 con dimensione diversa sono file pubblici |
| il source map non era pubblicato | `/assets/index-CjpTgGBi.js.map` → 511 byte, cioè index.html |
| tutte le richieste a `/api/*` respinte | 14 risposte 401, dimensione 0 |
| nessun tentativo di autenticazione | header `Authorization` presente in 0/337; header `Cookie` in 0/337 |
| nessuna adattività | ha scaricato il bundle JS che contiene `api/tester` (6 occorrenze), `api/auth/chiave-ai` (2), `api/tester/consumo` (1); nelle 324 richieste successive **non ne ha chiesto nessuno** |
| nessuna conoscenza della repo | i soli percorsi contenenti «neurodesk» sono `/z9x8c7v6b5-debug-trigger-{host}`, stringa di controllo con host interpolato |
| stack mutuamente incompatibili sondati insieme | WordPress/PHP con Spring Boot; Next.js, Nuxt, Astro, Vite, Webpack; Symfony, Laravel, Django, ASP.NET |
| ha cercato credenziali di strumenti di sviluppo AI | 8 richieste: `.claude.json`, `.claude/settings.json`, `.codex/config.toml`, `.cursor/mcp.json`, `.continue/config.json`, `.aider.conf.yml`, `.config/anthropic/credentials/default.json` |

## Ciò che NON è determinabile dai log

| Domanda | Perché |
|---|---|
| l'indirizzo è o non è ClaudeBot | Anthropic non pubblica un elenco di intervalli per il crawler: la pagina documenta API e chiamate MCP in uscita |
| eventi da intervalli cloud prima del 29/07 01:55 UTC | il log degli accessi di Caddy non esisteva: l'ho attivato quella notte |
| chi c'è dietro l'indirizzo | è un'istanza noleggiata |

## Nota di metodo, da riportare se il testo entra nel merito statistico

Le due classi «legittimo» e «scansione» sono state definite con la stessa
metrica che poi le convalida (404 ≤ 10% e 404 ≥ 50%). Il vuoto osservato fra
4,17% e 54,6% è quindi in parte un artefatto della selezione. La formulazione
corretta è **«su questo log nessuna sessione con almeno 5 richieste cade nella
banda intermedia»**, non «la metrica separa». Va rimisurata quando il traffico
cresce.

## Il campione ostile reale è n=1

Delle cinque sessioni che innescavano le soglie proposte:

| origine | cosa era |
|---|---|
| `34.150.133.136` | la scansione del 30 luglio — **unico caso ostile reale** |
| `188.26.192.150` | raccoglitore di contatti commerciale (26 richieste a `/contact`, `/about`, `/privacy`, `/impressum`, `/sitemap.xml` in cinque lingue) |
| `2a01:e11:800f:ad00::/64` ×3 | **mie prove** |

Le tre IPv6 sono quattro identificativi di interfaccia dello **stesso /64**: curl
8.7.1 (la scansione simulata del 29), Chrome su Macintosh (Playwright e il
browser di Cinzia), Safari su iPhone (il suo telefono).

**Da scrivere nel testo pubblico:** la taratura poggia su **un solo caso ostile
reale**. Va rimisurata quando il traffico cresce.

## Due limiti noti del metodo, dichiarati e non scoperti dopo

**Raggruppamento delle origini.** Gli IPv6 vanno raggruppati per **/64**, non per
indirizzo pieno: un singolo abbonato cambia identificativo di interfaccia e si
spezzerebbe in più attori. Verificato: raggruppando per indirizzo pieno le mie
prove risultavano quattro origini distinte.

**Finestra di sessione a 120 secondi.** Chi distanzia le richieste oltre due
minuti diventa invisibile al livello sessione, per costruzione. Non è
risolvibile con questa metrica: va dichiarato come limite, non trovato dopo.

## Un falso positivo che la misura ha evitato

Le soglie che avevo proposto per prime avrebbero classificato come scansione:

- un **iPhone** (`2a09:bac2:421e:4f0::7e:4a`): 10 richieste, 100% di 404, tutte
  per `apple-touch-icon*.png` e `favicon.ico`, che il sito non serve
- 25 sessioni composte **solo** da richieste di quel tipo

Da qui la regola: i percorsi che un client chiede per convenzione senza sapere
niente del sito **non contano nel rapporto dei 404**.

La lista è deliberatamente **chiusa e minima**, quattro voci, perché in un
repository pubblico ogni percorso escluso è un punto ciec:o pubblicato:

```
favicon.ico   favicon.png   apple-touch-icon*.png   robots.txt   browserconfig.xml
```

Criterio per aggiungerne: *il client lo chiede senza che nessuno gliel'abbia
detto?* Sono state **escluse dalla lista** `manifest.json` e `site.webmanifest`
(un browser li chiede solo se linkati nell'HTML), `sitemap.xml`, `ads.txt` e
`security.txt` (convenzioni di crawler, non di browser). Anche `/.well-known/`
è stato ristretto ad `acme-challenge/*`: il jolly rendeva invisibile un intero
spazio dei nomi.

Verificato che la restrizione non costa copertura: con quattro voci l'iPhone
resta comunque escluso (10 sessioni svuotate invece di 25) e il traffico
legittimo scende a **zero** percorsi 404 distinti.
