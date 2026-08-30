#!/usr/bin/env bash
#
# NeuroDesk — runner di manutenzione notturna. NON eseguirlo a mano:
# aggiorna i pacchetti di sistema e RIAVVIA il server. Lo pianifica
# deploy/07-aggiorna-e-riavvia.sh, che lo copia in /opt/neurodesk/deploy/.
#
# Logica, in ordine:
#   1. Controlla che il server sia scarico:
#        - nessuna sessione SSH umana (who),
#        - nessuna richiesta all'app negli ultimi 15 minuti
#          (log di Caddy, host app.neurodesk.it, /api/*, esito 2xx/3xx).
#   2. Se qualcuno c'e': si ripianifica da solo fra 20 minuti, fino alle
#      05:00 UTC. Dopo, rinuncia per stanotte senza toccare niente.
#   3. Se e' scarico: apt-get update && upgrade (solo upgrade, mai
#      dist-upgrade), autoremove, poi verifica che i servizi siano
#      abilitati all'avvio e RIAVVIA.
#
# Tutto finisce in /var/log/neurodesk/manutenzione.log.

set -uo pipefail

LOG=/var/log/neurodesk/manutenzione.log
mkdir -p /var/log/neurodesk
exec >>"$LOG" 2>&1

echo
echo "=== $(date -u +%FT%TZ) — controllo manutenzione ==="

LIMITE_UTC="05:00"          # oltre quest'ora, si rinuncia per stanotte
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

ripianifica() {
    # Riarma la stessa unita' transitoria: nessuna dipendenza da 'at'.
    systemctl reset-failed neurodesk-manutenzione.service 2>/dev/null || true
    systemd-run --unit=neurodesk-manutenzione --on-active=20min \
        /opt/neurodesk/deploy/manutenzione-notturna.sh >/dev/null 2>&1
}

if ! server_scarico; then
    if [[ "$(date -u +%H:%M)" > "$LIMITE_UTC" ]]; then
        echo "  oltre le ${LIMITE_UTC} UTC: rinuncio per stanotte. Niente aggiornamenti, niente reboot."
        exit 0
    fi
    echo "  riprovo fra 20 minuti"
    ripianifica
    exit 0
fi

echo "  procedo con gli aggiornamenti"
export DEBIAN_FRONTEND=noninteractive

echo "--- apt-get update ---"
apt-get -qq update || { echo "  apt-get update FALLITO: mi fermo, niente reboot."; exit 1; }

echo "--- pacchetti che verranno aggiornati ---"
apt-get -s -o Dpkg::Options::="--force-confold" upgrade 2>/dev/null | grep '^Inst' || echo "  (nessuno)"

echo "--- apt-get upgrade ---"
if ! apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade; then
    echo "  apt-get upgrade FALLITO: mi fermo, niente reboot. Da controllare a mano."
    exit 1
fi

echo "--- autoremove ---"
apt-get -y autoremove --purge || true

echo "--- servizi abilitati all'avvio? ---"
for s in "${SERVIZI[@]}"; do
    if systemctl is-enabled --quiet "$s"; then
        echo "  $s: gia' abilitato"
    else
        echo "  $s: NON abilitato — lo abilito ora"
        systemctl enable "$s" || echo "  ATTENZIONE: enable di $s fallito"
    fi
done

echo "=== $(date -u +%FT%TZ) — aggiornamenti completati, riavvio adesso ==="
echo "    dopo il boot, verifica con:"
echo "      systemctl is-active ${SERVIZI[*]}"
echo "      curl -sf http://127.0.0.1:8080/actuator/health && echo OK"
sync
systemctl reboot
