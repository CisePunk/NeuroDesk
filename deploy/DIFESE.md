# Le difese del server

Quattro strati, e nessuno di loro fa il lavoro di un altro. Questo documento
dice **cosa c'è, cosa fa, e cosa non è ancora nel repository** — perché la
scoperta che l'ha fatto nascere è proprio che una parte non c'era.

> **Stato al 9 agosto 2026, sera.** I numeri di `fail2ban` qui sotto sono
> **letti dai file** con [`06-esporta-difese.sh`](06-esporta-difese.sh), non più
> ricostruiti dal report. Restano da leggere versione e scenari di CrowdSec —
> segnalati dove mancano.

---

## Gli strati, in ordine di chi incontri per primo

```
   il mondo
      │
   1. ufw          ── apre solo tre porte: 22, 80, 443
      │
   2. CrowdSec     ── reputazione globale: blocca chi è già noto altrove
      │
   3. fail2ban     ── comportamento locale: bandisce chi si comporta male QUI
      │
   4. honeypot     ── osserva e racconta, non blocca
      │
   l'applicazione
```

I primi tre fermano. Il quarto guarda. È una distinzione voluta: un sistema che
blocca e basta non lascia capire *cosa* stava succedendo, e l'honeypot esiste
per quello.

---

## 1. `ufw` — il muro

L'unico strato che sta nel repository, in
[`01-prepara-server.sh`](01-prepara-server.sh):

```
default deny incoming
allow 22/tcp
allow 80,443/tcp
```

Tre porte aperte, tutto il resto chiuso. Non decide *chi* entra: decide *da
dove*.

---

## 2. CrowdSec — la reputazione del mondo

Confronta chi bussa con una lista condivisa fra tutte le installazioni: se un
indirizzo ha già attaccato qualcun altro, arriva qui già bloccato. Nel report
del 9 agosto:

```
IP malevoli bloccati al firewall (dal mondo): 22.222
rilevazioni LOCALI nelle 24 ore:                  13
```

I 22.222 sono **rumore già fermato**: reputazione, non attacchi a te. Le tredici
rilevazioni locali sono quelle che contano — qualcuno che ha puntato *questo*
server. Il 9 agosto erano quasi tutte forza bruta su SSH da un indirizzo di
Alibaba Cloud (`47.107.112.39`), e una di *path-traversal-probing*
(`34.178.47.95`).

Gli scenari che il report nomina, per sapere cosa leggono:

| Scenario | Cosa riconosce |
|---|---|
| `crowdsecurity/ssh-bf` | forza bruta classica su SSH |
| `crowdsecurity/ssh-bf_user-enum` | tentativi con molti nomi utente diversi |
| `crowdsecurity/ssh-slow-bf` | forza bruta lenta, pensata per non far scattare le soglie |
| `crowdsecurity/http-path-traversal-probing` | percorsi tipo `../../.env`, la stessa famiglia dei `/@fs/` |

**Non verificato dai file.** Versione, bouncer installato (è il pezzo che
esegue davvero il blocco al firewall), e scenari abilitati stanno sulla
macchina. Da recuperare con `06-esporta-difese.sh`.

---

## 3. `fail2ban` — chi si comporta male qui

Legge i log e bandisce all'ingresso. Quattro jail, letti da
`/etc/fail2ban/jail.d/neurodesk.local` (copiato in
[`fail2ban/`](fail2ban/) qui accanto):

| Jail | Scatta a | Finestra | Durata bando | Blocca |
|---|---|---|---|---|
| `sshd` | forza bruta su SSH | — | default | SSH |
| `caddy-neurodesk-scanner` | 2 richieste ostili | 10 min | 24 ore | **web + telnet, mai SSH** |
| `caddy-404-flood` | 50 richieste 404 | 60 sec | 1 ora | **web + telnet, mai SSH** |
| `recidive` | 5 bandi | 1 giorno | 1 settimana | ufw: tutte le porte |

I due `caddy-*` sono **scritti su misura per questo server**. Il filtro di
`caddy-neurodesk-scanner` conta come attacco `..%2f`, `/etc/passwd`, `${…}`,
`<script`, i marcatori OGNL e simili — la firma delle scansioni, non il traffico
normale.

`ignoreip` contiene già `127.0.0.1/8`, `::1` e due reti `/64` IPv6 (la casa
dell'amministratrice e il server stesso). **Nessun indirizzo IPv4 domestico**,
ed è giusto così: cambiano.

### La prova che funziona, e il difetto che ha rivelato

Il 9 agosto il rilevatore ha segnalato una scansione con percorsi
`/@fs/..%252f..%252f…/.env` — la firma degli exploit sul dev server di Vite,
che cercano `.env` e `/proc/self/environ`.

Per accertare che quel dev server non fosse esposto in produzione ho provato
quei percorsi dall'esterno. Rispondono **404 con zero byte**: in produzione Vite
non gira, il frontend è compilato in file statici e Caddy non conosce quel
prefisso. Nessuna esposizione — la verifica ha dato l'esito giusto.

Ma dopo sei richieste con `..%252f` in pochi secondi, `caddy-neurodesk-scanner`
mi ha bandita. Il report lo conferma:

```
caddy-neurodesk-scanner: 2 bannati ora
nuovi ban nelle 24 ore: 3
  34.178.47.95    (path-traversal-probing — uno scanner vero)
  47.107.112.39   (forza bruta SSH — uno scanner vero)
  203.0.113.42     (io — indirizzo reale sostituito con uno di documentazione)
```

Il sistema **non ha sbagliato**: ha visto il pattern di un attacco e l'ha
trattato come tale, accanto a due scanner reali presi per la stessa cosa. Non
poteva sapere che dietro c'era chi ha le chiavi.

**Il difetto che aveva rivelato — corretto il 9 agosto, sera.** I jail usavano
`banaction = ufw`, che chiudeva l'indirizzo su **tutte le porte, SSH compreso**,
per un giorno intero. Bastavano **due** richieste ostili in dieci minuti.

Ora usano `nftables[type=multiport]` con `port = http,https,telnet`: bandiscono
su 80, 443 e 23 (telnet), **mai sulla 22**. Una scansione web costa l'accesso al
web e a telnet, non l'accesso amministrativo. La 22 resta difesa dal jail `sshd`,
che è dove un attacco a SSH *deve* essere fermato.

Verificato dopo la modifica: la regola nftables è `tcp dport { 23, 80, 443 }`, la
22 non compare, un ban di prova non tocca SSH, e una connessione SSH nuova
funziona. La scelta senza IP statico: non si può escludere un indirizzo che
cambia, quindi si tiene aperta *la porta*, non *l'indirizzo*.

*(Come è stato trovato che serviva un secondo tentativo: la prima stesura usava
`nftables-multiport[port="…"]`, che è obsoleto e ignora il parametro. La regola
risultava `tcp dport 0-65535` — tutte le porte, SSH compresa: l'opposto
dell'intento. Preso guardando la regola vera con `nft list`, non fidandosi del
fatto che la configurazione «sembrava giusta» e fail2ban dicesse «bandito».)*

Una scansione web, quindi, costa l'accesso amministrativo per ventiquattro ore.
Chi stava verificando le proprie difese si ritrova fuori dal proprio server,
senza il modo di rientrare per sbandarsi — perché SSH è chiuso dalla stessa
regola. È successo esattamente così il 9 agosto.

Peggiora se l'indirizzo è condiviso. Il 9 agosto ero sulla rete di un parente:
mettere `203.0.113.42` in `ignoreip` avrebbe dichiarato affidabile a tempo
indeterminato una rete non mia, su cui non ho controllo. La risposta giusta non
è escludere l'indirizzo, è **non far bandire SSH da un jail che guarda il web**.

### Cosa è stato cambiato, e cosa resta

Fatto il 9 agosto: i due `caddy-*` bandiscono su web + telnet, mai su SSH
(`nftables[type=multiport]`, `port = http,https,telnet`). Verificato sulla
regola vera.

Resta un margine, dichiarato: `recidive` — chi accumula cinque bandi — usa
ancora `ufw`, tutte le porte. È per i recidivi confermati, e SSH è comunque
coperto dal jail `sshd`; ma in teoria cinque scansioni web ripetute potrebbero
ancora chiudere SSH. Con un IP che cambia è un rischio remoto. Da valutare se
dare anche a `recidive` la stessa esclusione della 22.

Sbandarsi resta comunque un'operazione reversibile: lo fa
[`05-escludi-amministratore.sh`](05-escludi-amministratore.sh), che sbanda
subito e rende l'esclusione permanente **solo se richiesto esplicitamente**
(`PERMANENTE=si`), proprio per non scrivere per sbaglio un permesso in un file
di sicurezza.

---

## 4. L'honeypot — osserva, non blocca

Il quarto strato non ferma nessuno: legge il log di Caddy, riconosce chi
scansiona e chi tocca le esche, e manda **una mail al giorno** invece di una per
ogni evento. È l'unico strato interamente nel repository:
[`honeypot.py`](honeypot.py), con la sua storia in
[`DA-FARE-SUL-SERVER.md`](DA-FARE-SUL-SERVER.md).

Serve a una cosa che i primi tre non fanno: **capire cosa cercava** chi ha
bussato. Un firewall dice «bloccato»; l'honeypot dice «cercava `/proc/self/environ`,
seguendo la firma di un exploit su Vite». La differenza fra sapere che c'è stato
un attacco e sapere che attacco era.

---

## Cosa non è ancora nel repository

Questa è la lista che rende onesto il documento.

| | Dove vive | Perché non è versionato |
|---|---|---|
| ~~Jail `caddy-*` (filtro, soglia, durata)~~ | ora in [`fail2ban/`](fail2ban/) | **portati nel repository il 9 agosto** |
| `ignoreip` di fail2ban | `/etc/fail2ban/jail.d/` | dipende da reti che cambiano |
| CrowdSec: versione, bouncer, scenari | configurazione di CrowdSec | installato a mano |
| Durata dei bandi | dentro i jail | non deducibile da fuori |

Finché restano fuori, il giorno che questo VPS va rifatto da zero
[`01-prepara-server.sh`](01-prepara-server.sh) ricostruisce `ufw` e null'altro:
**le difese che hanno funzionato meglio di tutte sparirebbero.**

Lo colma [`06-esporta-difese.sh`](06-esporta-difese.sh): al primo accesso legge
la configurazione vera dalla macchina e la porta qui, così che questo documento
smetta di essere «ricostruito dal report» e diventi «letto dai file».
