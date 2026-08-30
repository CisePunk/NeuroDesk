#!/usr/bin/env bash
#
# NeuroDesk — aggiornamenti di sistema + reboot, di notte, solo a server scarico.
# SI ESEGUE DAL MAC:
#
#   bash deploy/07-aggiorna-e-riavvia.sh root@IP_DEL_VPS [HH:MM]
#
# HH:MM e' l'ora UTC del reboot. Default 01:30 UTC = ~03:30 in Italia (CEST).
# Se quell'ora e' gia' passata oggi, parte la notte che viene.
#
# Cosa fa:
#   1. Si collega adesso e mostra chi e' connesso (SSH + attivita' app).
#   2. Copia sul server il runner deploy/manutenzione-notturna.sh.
#   3. Lo pianifica per stanotte con una unita' systemd transitoria
#      (niente 'at', niente cron: nome fisso, ri-lanciabile).
#   4. All'ora X il runner RICONTROLLA che nessuno sia connesso: se scarico
#      aggiorna e riavvia, se occupato rimanda di 20' fino alle 05:00 UTC.
#   Log sul server: /var/log/neurodesk/manutenzione.log
#
# Annulla la pianificazione:
#   ssh root@IP 'systemctl stop neurodesk-manutenzione.timer; systemctl reset-failed neurodesk-manutenzione.*'
set -euo pipefail

SERVER="${1:-}"
ORA_UTC="${2:-01:30}"
[ -n "$SERVER" ] || { echo "Uso: bash deploy/07-aggiorna-e-riavvia.sh root@IP_DEL_VPS [HH:MM_UTC]"; exit 1; }

RADICE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RADICE"

msg() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
err() { printf '\n\033[1;31m!!\033[0m %s\n' "$1" >&2; exit 1; }

ssh -o BatchMode=yes -o ConnectTimeout=10 "$SERVER" true 2>/dev/null \
    || err "Non riesco a collegarmi a $SERVER. Controlla IP e chiave SSH."

# --- 1. Chi c'e' adesso -----------------------------------------------------
msg "Chi e' connesso adesso"
ssh "$SERVER" FINESTRA=15 bash -s <<'REMOTO'
echo "  --- sessioni SSH ---"
who || echo "    (nessuna)"
echo "  --- richieste all'app negli ultimi ${FINESTRA} minuti ---"
python3 - "$FINESTRA" <<'PY'
import json, sys, time
soglia = time.time() - int(sys.argv[1]) * 60
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
    if req.get("host") != "app.neurodesk.it" or o.get("ts", 0) < soglia:
        continue
    uri, st = req.get("uri", ""), o.get("status", 0)
    if uri.startswith("/api/") and uri != "/api/public/contact" and 200 <= st < 400:
        n += 1
print(f"    {n} richieste app 2xx/3xx")
PY
echo "  --- aggiornamenti in attesa ---"
apt-get -s -o Dpkg::Options::="--force-confold" upgrade 2>/dev/null | grep -c '^Inst' | sed 's/^/    /'
REMOTO

# --- 2. Copio il runner ---------------------------------------------------
msg "Copio il runner in /opt/neurodesk/deploy/"
ssh "$SERVER" 'mkdir -p /opt/neurodesk/deploy /var/log/neurodesk'
scp -q deploy/manutenzione-notturna.sh "$SERVER:/opt/neurodesk/deploy/manutenzione-notturna.sh"
ssh "$SERVER" 'chmod +x /opt/neurodesk/deploy/manutenzione-notturna.sh'

# --- 3. Pianifico per stanotte ------------------------------------------
msg "Pianifico il reboot per le $ORA_UTC UTC"
ssh "$SERVER" ORA="$ORA_UTC" bash -s <<'REMOTO'
set -euo pipefail
now=$(date -u +%s)
tgt=$(date -u -d "today $ORA" +%s)
[ "$tgt" -le "$now" ] && tgt=$(date -u -d "tomorrow $ORA" +%s)
delay=$((tgt - now))

# Ripulisco una pianificazione precedente, poi (ri)creo l'unita'.
systemctl stop neurodesk-manutenzione.timer 2>/dev/null || true
systemctl reset-failed 'neurodesk-manutenzione.*' 2>/dev/null || true

systemd-run --unit=neurodesk-manutenzione \
    --on-active="${delay}s" \
    --timer-property=AccuracySec=1min \
    /opt/neurodesk/deploy/manutenzione-notturna.sh

echo "  parte fra $((delay / 3600))h $(((delay % 3600) / 60))m — $(date -u -d "@$tgt" +%FT%TZ)"
systemctl list-timers 'neurodesk-manutenzione*' --all --no-pager || true
REMOTO

msg "Fatto"
cat <<FINE

  Domattina, il resoconto:
    ssh $SERVER 'cat /var/log/neurodesk/manutenzione.log'

  Stato dei servizi dopo il reboot:
    ssh $SERVER 'systemctl is-active neurodesk-backend neurodesk-companion caddy'

  Per annullare adesso:
    ssh $SERVER 'systemctl stop neurodesk-manutenzione.timer; systemctl reset-failed neurodesk-manutenzione.*'

FINE
