# Audit di sicurezza — 30 luglio 2026

Verifica condotta **dall'esterno**, sull'applicazione in produzione, prendendo
come modello il difetto del caso *Baudr* (app pubblicata con un pannello di
amministrazione raggiungibile senza autenticazione, da cui lettura e scarico dei
dati di tutti gli utenti). La domanda non è «è sicura?» ma «ha *quel* buco?».

Ogni riga qui sotto è un esito misurato con una richiesta HTTP reale, non una
convinzione. I comandi sono quelli di un pentest black-box: nessuna conoscenza
interna, solo ciò che vede chi arriva da fuori.

## Il difetto di Baudr — cercato, non trovato

**Pannello di amministrazione senza credenziali.** Sette funzioni riservate,
chiamate da anonimo:

| endpoint | atteso | esito |
|---|---|---|
| `/api/tester` (lista codici) | 401 | **401** |
| `/api/tester/consumo` | 401 | **401** |
| `/api/feedback/report` | 401 | **401** |
| `/api/feedback/export.csv` | 401 | **401** |
| `/api/companion-sessions` | 401 | **401** |
| `/api/companion-sessions/{id}` | 401 | **401** |
| `/api/auth/me` | 401 | **401** |

Provato anche a **indovinare** il pannello con i nomi tipici (`/admin`,
`/administrator`, `/dashboard`, `/panel`, `/api/admin`): 404 o 401. Nessun
pannello nascosto raggiungibile.

## Lettura incrociata tra utenti (IDOR)

In Baudr, entrati una volta, si leggevano i dati di tutti. Prova diretta: l'utente
A tenta di leggere la conversazione dell'utente B cambiando il numero nell'URL.

- B salva una conversazione con un marcatore segreto
- A chiede `/api/companion-sessions/<id di B>` → **404**, il marcatore **non
  compare**
- la lista di A contiene **0** sessioni, non quelle di B
- una sessione esistente-ma-di-un-altro e una inesistente rispondono **entrambe
  404**: nessun oracolo che riveli quali id esistono

Un utente autenticato che tenta un endpoint di amministrazione riceve **403**:
non basta essere loggati, serve il ruolo giusto.

**Perché regge.** Ogni query sui dati sensibili cerca *per id e per proprietario
insieme* (`findByIdAndUtenteId`): la conversazione di un altro non viene «trovata
e poi negata», non viene proprio trovata. Verificato con `grep` che nessuna query
sui dati utente usi `findById` senza il vincolo del proprietario.

## Superficie completa, non a campione

Le **19 rotte** dell'API sono state estratte dal bundle JavaScript pubblico (non
indovinate: la lista vera, comprese quelle non documentate). Chiamate tutte da
anonimo, in GET e POST: **tutte 401**, tranne `/api/auth/login`, che deve essere
aperto — è la porta d'ingresso, non un dato.

## Dati dell'articolo 9

I contenuti (blocco, difficoltà, gestione) sono **dati relativi alla salute**,
categoria particolare ex art. 9 GDPR, a prescindere dal fatto che il servizio sia
un tutor e non un medico.

- **Pseudonimizzati, non anonimi.** L'accesso è con un codice, non con nome ed
  email; ma il legame codice↔persona esiste ancora (nell'etichetta e nella
  conoscenza di chi gestisce). È pseudonimizzazione **con la chiave di
  re-identificazione tenuta separata** — l'esempio che l'art. 32 GDPR cita come
  misura adeguata. Chi «bucasse» il sito troverebbe un soprannome e testo
  cifrato, non un'identità.
- **Cifrati a riposo** (AES-256-GCM). Con un confine preciso, dichiarato: la
  cifratura protegge da un dump del database o dal furto di un backup. **Non**
  protegge da un'applicazione già compromessa — a quel punto il processo ha la
  chiave in memoria. È una protezione reale, con un perimetro reale.
- **Cancellati a 30 giorni.**

## Il canale interno

`/api/internal/*` (che decifra la chiave AI di un tester per il servizio
companion) risponde **404 dal web**: Caddy lo chiude verso internet, ed è protetto
da un token con confronto a tempo costante. Non raggiungibile da fuori.

---

## Cosa resta scoperto, detto onestamente

- La cifratura non copre un **server già compromesso** (vedi sopra).
- Gli id delle risorse sono **interi progressivi**: un utente, vedendo il numero
  della propria sessione, può stimare il volume totale. Non è un dato di
  nessuno, ma è un'informazione di scala. Su un'applicazione dove l'id puntasse a
  una persona identificata andrebbero resi opachi.
- Il livello **host** del server (integrità dei file, forza bruta su SSH) è
  coperto solo dal controllo periodico ogni 3 giorni, non in tempo reale.

Questo documento è la fotografia del 30 luglio 2026. Va rifatto quando cambia la
superficie o quando un occhio esterno indipendente conduce un test proprio.
