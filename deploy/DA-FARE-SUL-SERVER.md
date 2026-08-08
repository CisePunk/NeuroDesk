# Da fare sul server — esca e rilevatore

**Chiuso l'8 agosto 2026.** Fatto sul VPS e verificato dall'esterno: l'esca
risponde 200, il collector annunciato 200, il percorso segreto 401 e ogni altro
sotto-percorso 404.

**Una trappola trovata durante il passaggio.** Lo script scriveva le variabili
`HONEYPOT_PERCORSI_*` in `neurodesk-controllo.service`, ma il rilevatore gira da
`neurodesk-honeypot.service` — un'unità diversa, ogni quindici minuti invece che
ogni tre giorni. Le variabili erano nel posto sbagliato e il nuovo gradino non
sarebbe mai scattato, senza che niente lo segnalasse. Corretto a mano; lo script
va sistemato prima del prossimo uso.

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
