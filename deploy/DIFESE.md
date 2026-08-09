# Le difese del server

Quattro strati, e nessuno di loro fa il lavoro di un altro. Questo documento
dice **cosa c'è, cosa fa, e cosa non è ancora nel repository** — perché la
scoperta che l'ha fatto nascere è proprio che una parte non c'era.

> **Stato al 9 agosto 2026.** Le configurazioni di `fail2ban` e CrowdSec vivono
> solo sulla macchina. Quello che segue è ricostruito dal report giornaliero e
> dal comportamento osservato, **non letto dai file**: dove non ho potuto
> verificare, è scritto. Lo script [`06-esporta-difese.sh`](06-esporta-difese.sh)
> porta la configurazione vera nel repository al primo accesso utile.

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

Legge i log e bandisce all'ingresso, **su tutte le porte**. Dal report del 9
agosto risultano **quattro jail**:

| Jail | Cosa intercetta | Verificato |
|---|---|---|
| `sshd` | forza bruta su SSH | standard di fail2ban |
| `caddy-404-flood` | molti 404 in poco tempo | dal nome e dal report |
| `caddy-neurodesk-scanner` | scansione mirata sui log di Caddy | **su me stessa**, vedi sotto |
| `recidive` | chi è già stato bandito e torna | standard di fail2ban |

I due `caddy-*` sono **scritti su misura per questo server**: non esistono nella
distribuzione di fail2ban, e non esistono in questo repository. Il filtro (quali
righe di log contano come attacco), la soglia e la durata del bando si leggono
solo in `/etc/fail2ban/jail.d/` e `/etc/fail2ban/filter.d/` sulla macchina.

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
  93.38.26.63     (io)
```

Il sistema **non ha sbagliato**: ha visto il pattern di un attacco e l'ha
trattato come tale, accanto a due scanner reali presi per la stessa cosa. Non
poteva sapere che dietro c'era chi ha le chiavi.

**Il difetto che ha rivelato è un altro, e resta aperto.** Un jail che nasce
dallo *scanning web* bandisce all'ingresso su **tutte le porte, SSH compreso**.
Una richiesta HTTP sospetta costa l'accesso amministrativo: chi stava
verificando le proprie difese si ritrova fuori dal proprio server, senza il modo
di rientrare per sbandarsi — perché SSH è chiuso dalla stessa regola.

Peggiora se l'indirizzo è condiviso. Il 9 agosto ero sulla rete di un parente:
mettere `93.38.26.63` in `ignoreip` avrebbe dichiarato affidabile a tempo
indeterminato una rete non mia, su cui non ho controllo. La risposta giusta non
è escludere l'indirizzo, è **non far bandire SSH da un jail che guarda il web**.

### Cosa andrebbe cambiato

- `caddy-neurodesk-scanner` e `caddy-404-flood` dovrebbero agire **solo su 80 e
  443** (`action` con `port="http,https"`), non sull'intera macchina. Un
  attacco al web si respinge dal web; l'accesso amministrativo è un'altra porta.
- `ignoreip` deve contenere solo reti **davvero controllate** — non l'indirizzo
  del posto in cui ci si trova oggi.

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
| Jail `caddy-*` (filtro, soglia, durata) | `/etc/fail2ban/*.d/` | scritti a mano sul server |
| `ignoreip` di fail2ban | `/etc/fail2ban/jail.d/` | dipende da reti che cambiano |
| CrowdSec: versione, bouncer, scenari | configurazione di CrowdSec | installato a mano |
| Durata dei bandi | dentro i jail | non deducibile da fuori |

Finché restano fuori, il giorno che questo VPS va rifatto da zero
[`01-prepara-server.sh`](01-prepara-server.sh) ricostruisce `ufw` e null'altro:
**le difese che hanno funzionato meglio di tutte sparirebbero.**

Lo colma [`06-esporta-difese.sh`](06-esporta-difese.sh): al primo accesso legge
la configurazione vera dalla macchina e la porta qui, così che questo documento
smetta di essere «ricostruito dal report» e diventi «letto dai file».
