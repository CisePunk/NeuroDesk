# Da fare sul server — esca e rilevatore

**Chiuso l'8 agosto 2026.** Fatto sul VPS e verificato dall'esterno: l'esca
risponde 200, il collector annunciato 200, il percorso segreto 401 e ogni altro
sotto-percorso 404.

**Una trappola trovata durante il passaggio.** Lo script scriveva le variabili
`HONEYPOT_PERCORSI_*` in `neurodesk-controllo.service`, ma il rilevatore gira da
`neurodesk-honeypot.service` — un'unità diversa, ogni quindici minuti invece che
ogni tre giorni. Le variabili erano nel posto sbagliato e il nuovo gradino non
sarebbe mai scattato, senza che niente lo segnalasse.

Corretto in due modi. Le unità adesso lo script **le cerca** invece di elencarle:
guarda dentro ogni `.service` e dentro l'eseguibile che lancia. Sul VPS ne trova
quattro — honeypot, sale, controllo, riepilogo — mentre a mano ne avevo sistemata
una. E alla fine **rilegge da systemd** quello che è davvero arrivato, invece di
fidarsi di aver scritto: se una sola unità non ce l'ha, si ferma.

Quello che segue resta per memoria.

## I due comandi

```bash
scp deploy/04-aggiorna-esca.sh root@IP:/root/
ssh root@IP 'cd /opt/neurodesk && git pull && bash /root/04-aggiorna-esca.sh'
```

Lo script chiede quattro valori — percorso base, collector annunciato, percorso
segreto, token civetta — e fa tutto il resto: scrive l'esca, valida la
configurazione di Caddy **prima** di ricaricarla, riscrive le variabili
`HONEYPOT_PERCORSI_*` nell'unità systemd, ricarica, poi verifica con `curl` che
ogni percorso risponda come deve.

Il `git pull` non è facoltativo: serve a portare su `honeypot.py`, che senza
non conosce né il gradino della credenziale né la distinzione fra collector
annunciato e percorso segreto.

## Perché

L'8 agosto 2026, fra le 00:42 e le 00:47 UTC, quattro origini distinte hanno
toccato l'esca e — un secondo dopo — il suo collector. Tutte e quattro sono
state classificate **intrusione tentata**, il livello massimo.

Nessuna aveva indovinato niente: il JSON dell'esca dichiarava quel percorso nel
campo `collector`, e uno scanner che legge la risposta ci arriva da solo. I due
gradini non erano indipendenti, e il più alto scattava quasi sempre.

Niente di reale è stato toccato: `/api/internal/*` — che restituisce le chiavi
API degli utenti decifrate — risponde 404 con zero byte dall'esterno, bloccato
da Caddy prima di arrivare a Spring.

## Cosa cambia dopo il passaggio

| Gradino | Cosa significa |
|---|---|
| **credenziale** | ha presentato il token civetta — intento dimostrato |
| **intrusione** | percorso mai annunciato: l'ha indovinato |
| **seguito** | ha seguito il collector che gli abbiamo dichiarato noi |
| **segnale** | ha trovato l'esca |

E l'esca smette di rispondere 200 a qualunque sotto-percorso: `200` sul base e
sul collector annunciato, `401` con `WWW-Authenticate: Bearer` sul percorso
segreto, `404` su tutto il resto. Un servizio vero si comporta così — e un'esca
che risponde «trovato» a tutto si rivela in due richieste.

## Verifica dopo

Lo script la fa da solo, ma vale la pena rileggere l'esito:

```
/percorso-base              200
/percorso-base/collect      200
/percorso-base/ingest       401     <- se qui esce 404, l'ordine dei
/percorso-base/zzz          404        blocchi handle è da correggere
```

## Riferimenti

- `deploy/04-aggiorna-esca.sh` — lo script
- `deploy/honeypot.py` — i quattro gradini e la guardia sulla sovrapposizione
- Commit: `b39d9af`, `9472ead`, `8b6cd53`, `f0ecd97`

---

# Aperto: escludere l'amministratrice

**9 agosto 2026.** Provando i percorsi di un exploit segnalato dal rilevatore
— sei richieste con `..%252f` in pochi secondi, per accertare che il dev server
di Vite non fosse esposto — l'indirizzo di casa è stato bandito. Non solo dal
web: **anche da SSH**.

```
443   Connection refused
22    Connection refused
DNS   risolve, la rete funziona
```

Un host spento darebbe timeout. Un rifiuto attivo significa che qualcosa c'è e
sta dicendo di no.

La difesa ha funzionato, e ha funzionato contro chi stava provando esattamente
il pattern dell'attacco. Il problema è che chi amministra un server lo prova
anche dall'esterno, ed è l'unico modo per sapere se una difesa regge.

## Quando l'accesso torna

```bash
scp deploy/05-escludi-amministratore.sh root@IP:/root/
ssh root@IP 'bash /root/05-escludi-amministratore.sh 93.38.26.63'
```

Lo script dichiara l'origine nota nel rilevatore — cercando **tutte** le unità
che usano l'honeypot, non elencandone una — e poi va a vedere se c'è un
`fail2ban` che l'ha bandita, la sbanda e la mette in `ignoreip`.

Le mosse dell'amministratrice restano nell'archivio, marcate `[nota]`. Cambia
solo che non generano una mail e non contano come attacco: **non è una difesa
in meno, è smettere di suonare l'allarme a chi ha le chiavi.**

## Da ricordare

Un indirizzo di casa cambia. Se un giorno gli allarmi tornano a parlare di te,
rilancia lo script con quello nuovo — e il vecchio va tolto, perché un
indirizzo dichiarato affidabile che nel frattempo è passato a qualcun altro è
peggio di nessuna esclusione.

## Resta da guardare

L'allarme del 9 agosto su `app.neurodesk.it` (quindici richieste in 0,18s,
file di un pannello bot per WhatsApp) dice **73,3% non trovate**: quattro
richieste su quindici hanno ottenuto altro. Quali, l'estratto non lo dice.

```bash
grep 6787d6f4ad51ae51 /var/log/neurodesk/honeypot-eventi.jsonl
```
