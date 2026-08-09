# Pubblicare NeuroDesk

Tre casi, tre comandi diversi. Usare quello sbagliato o non funziona o fa
troppo (il 9 agosto 2026 ho suggerito il deploy completo per una modifica al
solo landing: ricompila backend e frontend e puo' rompersi dove non serve).

Tutti si lanciano **dal Mac**, dalla radice del repository.

---

## 1. Ho cambiato solo il landing (pagine di marketing)

Le pagine in `landing/` — home, chi-siamo, contatti, aiuto, nelle tre lingue.
Sono file statici: si copiano e basta, niente da compilare, niente da riavviare.

```bash
rsync -az --delete --exclude='.DS_Store' \
  landing/ root@164.132.198.90:/var/www/neurodesk-landing/
ssh root@164.132.198.90 'chown -R www-data:www-data /var/www/neurodesk-landing'
```

Verifica:
```bash
curl -s -o /dev/null -w '%{http_code}\n' https://neurodesk.it/
```

---

## 2. Ho cambiato il backend o l'app (frontend React)

Serve ricompilare e riavviare i servizi. È quello che fa
[`02-pubblica.sh`](02-pubblica.sh): compila il JAR e il frontend sul Mac,
carica gli artefatti, riavvia backend e companion, verifica che rispondano.

```bash
bash deploy/02-pubblica.sh root@164.132.198.90
```

Richiede l'ambiente di build (Java/Maven, Node) sul Mac. Carica anche il
landing, quindi copre pure il caso 1 — ma per il solo landing è uno spreco.

---

## 3. Ho cambiato le difese (fail2ban, esca, honeypot)

Non passano da `02-pubblica.sh`: sono file di sistema. Gli script dedicati:

| Modifica | Comando |
|---|---|
| Esca + rilevatore honeypot | [`04-aggiorna-esca.sh`](04-aggiorna-esca.sh) |
| Escludere un'origine dai bandi | [`05-escludi-amministratore.sh`](05-escludi-amministratore.sh) |
| Esportare la config difese nel repo | [`06-esporta-difese.sh`](06-esporta-difese.sh) |

Il dettaglio in [DIFESE.md](DIFESE.md) e [DA-FARE-SUL-SERVER.md](DA-FARE-SUL-SERVER.md).

---

## Dove sta cosa, sul server

| Cosa | Percorso |
|---|---|
| Landing (marketing) | `/var/www/neurodesk-landing/` |
| App compilata (React) | `/var/www/neurodesk/` |
| Backend (JAR) | `/opt/neurodesk/backend.jar` |
| Companion (Node) | `/opt/neurodesk/companion-service/` |
| Config difese | `/etc/fail2ban/`, `/etc/caddy/conf.d/` |

Server: `164.132.198.90` · domini: `neurodesk.it` (landing), `app.neurodesk.it` (app).
