#!/usr/bin/env bash
#
# NeuroDesk — aggiornamenti di sistema ogni notte, solo a server scarico.
# SI ESEGUE DAL MAC, una volta (o dopo aver cambiato il runner):
#
#   bash deploy/07-aggiorna-e-riavvia.sh root@IP_DEL_VPS
#
# Cosa fa:
#   1. Si collega adesso e mostra chi e' connesso (SSH + attivita' app).
#   2. Copia sul server il runner deploy/manutenzione-notturna.sh.
#   3. Installa e attiva neurodesk-manutenzione.timer (unita' permanente,
#      sopravvive ai reboot): scatta ogni 20 minuti fra le 01:30 e le 04:50
#      UTC (~03:30-06:50 in Italia d'estate, un'ora prima d'inverno).
#   4. A ogni scatto il runner controlla che nessuno sia connesso: se scarico
#      aggiorna, e riavvia solo se Ubuntu lo chiede; se occupato ci riprova
#      lo scatto dopo. Una manutenzione riuscita per notte, non di piu'.
#   Log sul server: /var/log/neurodesk/manutenzione.log
#
# Sospendi la manutenzione:
#   ssh root@IP 'systemctl disable --now neurodesk-manutenzione.timer'
set -euo pipefail

SERVER="${1:-}"
[ -n "$SERVER" ] || { echo "Uso: bash deploy/07-aggiorna-e-riavvia.sh root@IP_DEL_VPS"; exit 1; }

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

# --- 3. Timer permanente ------------------------------------------------
msg "Installo neurodesk-manutenzione.timer (ogni notte, 01:30-04:50 UTC)"
ssh "$SERVER" bash -s <<'REMOTO'
set -euo pipefail
# Tolgo l'eventuale unita' transitoria delle versioni precedenti di questo
# script: ha lo stesso nome e impedirebbe di caricare quella permanente.
if [ -f /run/systemd/transient/neurodesk-manutenzione.timer ]; then
    systemctl stop neurodesk-manutenzione.timer 2>/dev/null || true
fi
systemctl reset-failed 'neurodesk-manutenzione.*' 2>/dev/null || true

cat > /etc/systemd/system/neurodesk-manutenzione.service <<'UNIT'
[Unit]
Description=NeuroDesk - manutenzione notturna (aggiornamenti, reboot se richiesto)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/neurodesk/deploy/manutenzione-notturna.sh
UNIT

cat > /etc/systemd/system/neurodesk-manutenzione.timer <<'UNIT'
[Unit]
Description=NeuroDesk - manutenzione notturna, un tentativo ogni 20 minuti

[Timer]
OnCalendar=*-*-* 01:30,50:00 UTC
OnCalendar=*-*-* 02..04:10,30,50:00 UTC
AccuracySec=1min
Persistent=false

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now neurodesk-manutenzione.timer
systemctl list-timers 'neurodesk-manutenzione*' --all --no-pager || true
REMOTO

msg "Fatto"
cat <<FINE

  Il resoconto delle notti:
    ssh $SERVER 'cat /var/log/neurodesk/manutenzione.log'

  Stato dei servizi:
    ssh $SERVER 'systemctl is-active neurodesk-backend neurodesk-companion caddy'

  Per sospendere la manutenzione:
    ssh $SERVER 'systemctl disable --now neurodesk-manutenzione.timer'

FINE
