# Configurazione fail2ban del server

Copia **fedele** di ciò che gira sul VPS, portata qui il 9 agosto 2026 con
`06-esporta-difese.sh`. Serve perché il giorno che il server va rifatto da zero,
`01-prepara-server.sh` ricostruisce solo `ufw`: senza questi file, i jail su
misura — quelli che hanno fermato gli scanner — sparirebbero.

| File | Dove va sul server |
|---|---|
| `jail.d/neurodesk.local` | `/etc/fail2ban/jail.d/` |
| `filter.d/caddy-neurodesk-scanner.conf` | `/etc/fail2ban/filter.d/` |
| `filter.d/caddy-404.conf` | `/etc/fail2ban/filter.d/` |

Dopo averli copiati: `systemctl reload fail2ban`.

> **Nota, non ancora applicata.** I due jail `caddy-*` usano `banaction = ufw`,
> che chiude l'indirizzo su TUTTE le porte, SSH compreso, per 24 ore. Una
> scansione web costa quindi l'accesso amministrativo. La correzione — bandire
> solo su 80 e 443 — è descritta in [../DIFESE.md](../DIFESE.md), sezione «Cosa
> andrebbe cambiato». Questi file sono la copia dello stato attuale, difetto
> incluso: la correzione va decisa, non applicata di nascosto.
