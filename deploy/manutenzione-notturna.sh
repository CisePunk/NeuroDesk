#!/usr/bin/env bash
#
# NeuroDesk — runner di manutenzione notturna. NON eseguirlo a mano:
# aggiorna i pacchetti di sistema e, se serve, RIAVVIA il server. Lo lancia
# ogni notte neurodesk-manutenzione.timer, installato da
# deploy/07-aggiorna-e-riavvia.sh, che copia questo file in /opt/neurodesk/deploy/.
#
# Il timer scatta ogni 20 minuti fra le 01:30 e le 04:50 UTC. A ogni scatto:
#   1. Se stanotte la manutenzione e' gia' stata fatta: esce senza scrivere niente.
#   2. Controlla che il server sia scarico:
#        - nessuna sessione SSH umana (who),
#        - nessuna richiesta all'app negli ultimi 15 minuti
#          (log di Caddy, host app.neurodesk.it, /api/*, esito 2xx/3xx).
#      Se qualcuno c'e', esce: ci riprova lo scatto successivo. Dopo l'ultimo
#      (04:50) rinuncia per stanotte senza toccare niente.
#   3. Se e' scarico: apt-get update && upgrade (solo upgrade, mai
#      dist-upgrade), autoremove, riavvio dei servizi rimasti con librerie
#      vecchie (needrestart), verifica che i servizi siano abilitati all'avvio.
#      RIAVVIA il server solo se Ubuntu lo chiede (/var/run/reboot-required:
#      kernel, libc, ...). Altrimenti resta acceso.
#
# Tutto finisce in /var/log/neurodesk/manutenzione.log.

set -uo pipefail

LOG=/var/log/neurodesk/manutenzione.log
FATTA=/var/lib/neurodesk/manutenzione-ultima   # data UTC dell'ultima manutenzione riuscita
mkdir -p /var/log/neurodesk /var/lib/neurodesk

oggi=$(date -u +%F)
[ "$(cat "$FATTA" 2>/dev/null)" = "$oggi" ] && exit 0

exec >>"$LOG" 2>&1

echo
echo "=== $(date -u +%FT%TZ) — controllo manutenzione ==="

ULTIMO_UTC="04:45"          # dopo quest'ora e' l'ultimo scatto della notte
FINESTRA_MIN=15             # "attivo" = richieste all'app negli ultimi N minuti
SERVIZI=(neurodesk-backend neurodesk-companion caddy)

richieste_app_recenti() {
    python3 - "$FINESTRA_MIN" <<'PY'
import json, sys, time
finestra = int(sys.argv[1]) * 60
soglia = time.time() - finestra
n = 0
try:
    righe = open("/var/log/caddy/access.log", encoding="utf-8",
                 errors="replace").read().splitlines()[-4000:]
except FileNotFoundError:
    righe = []
for r in righe:
    try:
        o = json.loads(r)
    except ValueError:
        continue
    req = o.get("request", {})
    if req.get("host") != "app.neurodesk.it":
        continue
    if o.get("ts", 0) < soglia:
        continue
    uri = req.get("uri", "")
    st = o.get("status", 0)
    if uri.startswith("/api/") and uri != "/api/public/contact" and 200 <= st < 400:
        n += 1
print(n)
PY
}

server_scarico() {
    local ssh_n app_n
    ssh_n=$(who 2>/dev/null | grep -c .)
    if [ "${ssh_n:-0}" -gt 0 ]; then
        echo "  OCCUPATO: $ssh_n sessioni SSH attive"
        who 2>/dev/null | sed 's/^/    /'
        return 1
    fi
    app_n=$(richieste_app_recenti)
    if [ "${app_n:-0}" -gt 0 ]; then
        echo "  OCCUPATO: $app_n richieste all'app negli ultimi ${FINESTRA_MIN} minuti"
        return 1
    fi
    echo "  scarico: 0 sessioni SSH, 0 richieste app negli ultimi ${FINESTRA_MIN} minuti"
    return 0
}

if ! server_scarico; then
    if [[ "$(date -u +%H:%M)" > "$ULTIMO_UTC" ]]; then
        echo "  ultimo tentativo della notte: rinuncio. Niente aggiornamenti, niente reboot."
    else
        echo "  riprovo al prossimo scatto del timer (20 minuti)"
    fi
    exit 0
fi

echo "  procedo con gli aggiornamenti"
export DEBIAN_FRONTEND=noninteractive

echo "--- apt-get update ---"
APT_LOCK=(-o DPkg::Lock::Timeout=600)   # unattended-upgrades potrebbe avere il lock
apt-get -qq "${APT_LOCK[@]}" update || { echo "  apt-get update FALLITO: mi fermo, niente reboot."; exit 1; }

echo "--- pacchetti che verranno aggiornati ---"
apt-get -s -o Dpkg::Options::="--force-confold" upgrade 2>/dev/null | grep '^Inst' || echo "  (nessuno)"

echo "--- apt-get upgrade ---"
if ! apt-get -y "${APT_LOCK[@]}" -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade; then
    echo "  apt-get upgrade FALLITO: mi fermo, niente reboot. Da controllare a mano."
    exit 1
fi

echo "--- autoremove ---"
apt-get -y "${APT_LOCK[@]}" autoremove --purge || true

echo "--- servizi con librerie vecchie ---"
needrestart -r a -q 2>/dev/null || true

echo "--- servizi abilitati all'avvio? ---"
for s in "${SERVIZI[@]}"; do
    if systemctl is-enabled --quiet "$s"; then
        echo "  $s: gia' abilitato"
    else
        echo "  $s: NON abilitato — lo abilito ora"
        systemctl enable "$s" || echo "  ATTENZIONE: enable di $s fallito"
    fi
done

echo "$oggi" > "$FATTA"

if [ ! -f /var/run/reboot-required ]; then
    echo "=== $(date -u +%FT%TZ) — aggiornamenti completati, nessun riavvio richiesto ==="
    for s in "${SERVIZI[@]}"; do echo "  $s: $(systemctl is-active "$s")"; done
    exit 0
fi

echo "--- riavvio richiesto da ---"
sed 's/^/  /' /var/run/reboot-required.pkgs 2>/dev/null | sort -u
echo "=== $(date -u +%FT%TZ) — aggiornamenti completati, riavvio adesso ==="
echo "    dopo il boot, verifica con:"
echo "      systemctl is-active ${SERVIZI[*]}"
echo "      curl -sf http://127.0.0.1:8080/actuator/health && echo OK"
sync
systemctl reboot
