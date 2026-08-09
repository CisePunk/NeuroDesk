#!/usr/bin/env bash
#
# NeuroDesk — porta nel repository la configurazione delle difese che oggi vive
# solo sul server. SUL VPS, come root.
#
#   scp deploy/06-esporta-difese.sh root@IP:/root/
#   ssh root@IP 'bash /root/06-esporta-difese.sh' > deploy/difese-sul-server.txt
#
# Poi, in locale, si guarda difese-sul-server.txt e si versiona quello che ha
# senso versionare (i jail su misura, i filtri, gli scenari CrowdSec).
#
# Perché esiste
# -------------
# fail2ban e CrowdSec sono i due strati che il 9 agosto 2026 hanno fermato gli
# attacchi — e sono gli unici NON nel repository. Se il VPS va rifatto da zero,
# 01-prepara-server.sh ricostruisce ufw e nient'altro: le difese migliori
# sparirebbero. Vedi DIFESE.md.
#
# Questo script SOLO LEGGE. Non tocca niente, non riavvia niente: si può
# lanciare in qualunque momento senza rischi. È il contrario degli altri, che
# modificano — qui la sicurezza è che non modifica.

set -uo pipefail   # non -e: se un comando manca, si continua e lo si annota

titolo() { printf '\n========== %s ==========\n' "$1"; }
manca()  { printf '  (%s non presente su questa macchina)\n' "$1"; }

printf '# Difese del server NeuroDesk — esportate il %s\n' "$(date -u '+%Y-%m-%d %H:%M UTC')"
printf '# host: %s\n' "$(hostname)"
printf '# Generato da 06-esporta-difese.sh. Da leggere, non da eseguire.\n'

# --- ufw: già nel repository, ma si verifica che coincida --------------------
titolo "ufw — stato reale (atteso: 22, 80, 443)"
command -v ufw >/dev/null && ufw status verbose 2>/dev/null || manca ufw

# --- fail2ban: i jail su misura sono la parte che manca ----------------------
titolo "fail2ban — stato"
if command -v fail2ban-client >/dev/null; then
    fail2ban-client status 2>/dev/null
    for jail in $(fail2ban-client status 2>/dev/null | sed -n 's/.*Jail list:\s*//p' | tr ',' ' '); do
        titolo "fail2ban — jail '$jail'"
        fail2ban-client status "$jail" 2>/dev/null
    done

    titolo "fail2ban — jail.local e jail.d (soglie, durate, ignoreip)"
    for f in /etc/fail2ban/jail.local /etc/fail2ban/jail.d/*.conf; do
        [ -f "$f" ] && { printf '\n----- %s -----\n' "$f"; cat "$f"; }
    done

    titolo "fail2ban — filtri su misura (le righe che contano come attacco)"
    # Solo i filtri non standard: i caddy-* e simili, non i duecento di serie.
    for f in /etc/fail2ban/filter.d/caddy*.conf /etc/fail2ban/filter.d/neurodesk*.conf; do
        [ -f "$f" ] && { printf '\n----- %s -----\n' "$f"; cat "$f"; }
    done
else
    manca fail2ban
fi

# --- CrowdSec: reputazione mondiale + scenari --------------------------------
titolo "CrowdSec — versione e stato"
if command -v cscli >/dev/null; then
    cscli version 2>/dev/null | head -3
    titolo "CrowdSec — bouncer (chi esegue davvero il blocco)"
    cscli bouncers list 2>/dev/null || manca "nessun bouncer"
    titolo "CrowdSec — collezioni e scenari abilitati"
    cscli collections list 2>/dev/null
    cscli scenarios list 2>/dev/null | head -40
    titolo "CrowdSec — decisioni attive (chi è bloccato adesso)"
    cscli decisions list 2>/dev/null | head -30
else
    manca CrowdSec
fi

# --- Quale servizio pubblica il report giornaliero ---------------------------
titolo "Report giornaliero — timer e unità"
systemctl list-timers --all --no-pager 2>/dev/null | grep -iE "report|riepilogo|sicurezza|crowdsec|fail2ban" || echo "  nessun timer riconoscibile"

printf '\n# Fine. Copia in locale con:\n'
printf '#   ssh root@IP '\''bash /root/06-esporta-difese.sh'\'' > deploy/difese-sul-server.txt\n'
