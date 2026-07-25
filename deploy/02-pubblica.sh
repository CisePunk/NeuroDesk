#!/usr/bin/env bash
#
# NeuroDesk — pubblicazione. SI ESEGUE DAL TUO MAC, ogni volta che vuoi mandare
# online una modifica. Il server dev'essere già stato preparato con 01-prepara-server.sh.
#
#   bash deploy/02-pubblica.sh root@IP_DEL_VPS
#
# Cosa fa: compila backend e frontend qui, carica gli artefatti sul server,
# riavvia i due servizi e verifica che rispondano.
#
# Cosa NON carica mai: i file .env locali, i segreti, node_modules, il database.
#
set -euo pipefail

SERVER="${1:-}"
[ -n "$SERVER" ] || { echo "Uso: bash deploy/02-pubblica.sh root@IP_DEL_VPS"; exit 1; }

RADICE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RADICE"

msg() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
err() { printf '\n\033[1;31m!!\033[0m %s\n' "$1" >&2; exit 1; }

ssh -o BatchMode=yes -o ConnectTimeout=10 "$SERVER" true 2>/dev/null \
    || err "Non riesco a collegarmi a $SERVER. Controlla IP e chiave SSH."

# --- 1. Compilo qui, non sul server -----------------------------------------
# Compilare in locale tiene il server leggero e fa fallire la build sul TUO Mac,
# dove puoi leggere l'errore con calma, invece che in produzione.
msg "Compilo il backend"
(cd backend && ./mvnw -q clean package -DskipTests)
JAR=$(ls -1 backend/target/*.jar | head -1)
[ -f "$JAR" ] || err "Jar non trovato: la build del backend è fallita."

msg "Compilo il frontend"
(cd frontend && npm ci --silent && npm run build --silent)
[ -f frontend/dist/index.html ] || err "Build del frontend non trovata."

# --- 2. Carico ---------------------------------------------------------------
msg "Carico il backend"
rsync -az "$JAR" "$SERVER:/opt/neurodesk/backend.jar"

msg "Carico il companion (senza .env e senza node_modules)"
rsync -az --delete \
    --exclude='.env' --exclude='node_modules' --exclude='.git' \
    companion-service/ "$SERVER:/opt/neurodesk/companion-service/"

msg "Carico il frontend"
rsync -az --delete frontend/dist/ "$SERVER:/var/www/neurodesk/"

msg "Carico la landing (HTML + assets: CSS e JS del menu)"
rsync -az --delete --exclude='.DS_Store' \
    landing/ "$SERVER:/var/www/neurodesk-landing/"

# --- 3. Permessi e riavvio ---------------------------------------------------
msg "Sistemo i permessi e riavvio i servizi"
ssh "$SERVER" bash -euo pipefail <<'REMOTO'
chown -R neurodesk:neurodesk /opt/neurodesk
chown -R www-data:www-data /var/www/neurodesk /var/www/neurodesk-landing
# Il .env del companion viene ricreato da rsync senza permessi: li rimetto.
chmod 600 /opt/neurodesk/companion-service/.env
systemctl restart neurodesk-backend neurodesk-companion
systemctl reload caddy
REMOTO

# --- 4. Verifico che sia davvero vivo ---------------------------------------
msg "Aspetto che il backend finisca di avviarsi"
sleep 12

msg "Verifica"
ssh "$SERVER" bash -euo pipefail <<'REMOTO'
stato() { systemctl is-active "$1" | grep -q '^active$' && echo "  $1: attivo" || { echo "  $1: NON ATTIVO"; journalctl -u "$1" -n 15 --no-pager; }; }
stato neurodesk-backend
stato neurodesk-companion
stato caddy
echo "  backend  ->" $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/actuator/health)
echo "  companion->" $(curl -s http://127.0.0.1:8090/health | tr -d '\n' | cut -c1-90)
REMOTO

cat <<FINE

  Fatto. Controlla dal browser:

    https://neurodesk.it        -> la landing
    https://app.neurodesk.it    -> l'applicazione

  Prova di sicurezza (deve rispondere 401, non una risposta della chat):
    curl -s -o /dev/null -w '%{http_code}\n' -X POST \\
      https://app.neurodesk.it/api/companion/respond \\
      -H 'Content-Type: application/json' -d '{"message":"ciao"}'

FINE
