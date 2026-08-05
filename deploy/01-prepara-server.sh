#!/usr/bin/env bash
#
# NeuroDesk — preparazione del server. SI ESEGUE UNA VOLTA SOLA, sul VPS, come root.
#
#   scp deploy/01-prepara-server.sh root@IP_DEL_VPS:/root/
#   ssh root@IP_DEL_VPS
#   bash /root/01-prepara-server.sh
#
# Cosa fa: installa Java/MySQL/Node/Caddy, crea l'utente di servizio, chiude il
# firewall, prepara il database, GENERA QUI i segreti di produzione (non arrivano
# mai da fuori), scrive i due servizi systemd e la configurazione di Caddy.
#
# Cosa NON fa: non pubblica il codice. Quello lo fa 02-pubblica.sh dal tuo Mac.
#
set -euo pipefail

DOMINIO="neurodesk.it"
APP="app.${DOMINIO}"
UTENTE="neurodesk"
DB_NOME="neurodesk_db"
DB_UTENTE="neurodesk_user"
SEGRETI="/root/neurodesk-segreti.txt"

msg() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
err() { printf '\n\033[1;31m!!\033[0m %s\n' "$1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Esegui come root."
[ -f /etc/os-release ] && . /etc/os-release
[ "${ID:-}" = "ubuntu" ] || err "Questo script è scritto per Ubuntu 24.04."
[ -f "$SEGRETI" ] && err "Sembra già preparato ($SEGRETI esiste). Fermo qui per non sovrascrivere i segreti."

# --- Dati che devi fornire tu ------------------------------------------------
# Le chiavi si leggono senza mostrarle a schermo e non finiscono nella cronologia
# della shell né nell'elenco dei processi.
read -rp "Email per i certificati HTTPS (avvisi Let's Encrypt): " EMAIL_TLS
[ -n "$EMAIL_TLS" ] || err "L'email serve a Let's Encrypt."
read -rsp "Chiave API Anthropic (non verrà mostrata): " ANTHROPIC_KEY; echo
[ -n "$ANTHROPIC_KEY" ] || err "La chiave Anthropic è obbligatoria."
read -rsp "Chiave API OpenAI (invio per saltare): " OPENAI_KEY; echo

# --- Sistema base ------------------------------------------------------------
msg "Aggiorno il sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get upgrade -y -qq

msg "Installo i pacchetti di base"
apt-get install -y -qq openjdk-21-jdk-headless mysql-server ufw curl gnupg \
    debian-keyring debian-archive-keyring apt-transport-https rsync

msg "Installo Node.js 22 (Ubuntu ne ha una troppo vecchia per --env-file)"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
apt-get install -y -qq nodejs
node -v

msg "Installo Caddy"
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/caddy-stable-archive-keyring.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" \
    > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -qq && apt-get install -y -qq caddy

# --- Firewall: solo SSH e web ------------------------------------------------
msg "Chiudo il firewall (restano aperte solo 22, 80, 443)"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80,443/tcp >/dev/null
ufw --force enable

# --- Utente di servizio: nessun login, nessuna home utile --------------------
msg "Creo l'utente di servizio '$UTENTE'"
id -u "$UTENTE" >/dev/null 2>&1 || useradd --system --create-home \
    --home-dir /opt/neurodesk --shell /usr/sbin/nologin "$UTENTE"

# --- Segreti: generati QUI, non arrivano da fuori ----------------------------
msg "Genero i segreti di produzione"
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
CRYPTO_SECRET=$(openssl rand -base64 48 | tr -d '\n')
LOGIN_PEPPER=$(openssl rand -base64 48 | tr -d '\n')
# Token DEDICATO per l'endpoint interno companion<->backend. NON riusa il JWT:
# se trapelasse, chi lo ha potrebbe firmare token arbitrari (anche ruolo SCUOLA).
INTERNAL_TOKEN=$(openssl rand -base64 48 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n/+=')
ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '\n/+=')
ADMIN_CODICE="nd-$(openssl rand -hex 4)"

# --- Database ----------------------------------------------------------------
msg "Preparo MySQL (in ascolto solo su 127.0.0.1)"
mysql <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NOME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_UTENTE}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_UTENTE}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NOME}.* TO '${DB_UTENTE}'@'localhost';
FLUSH PRIVILEGES;
SQL

# Credenziali per il backup notturno, leggibili solo da root.
cat > /root/.my.cnf <<CNF
[client]
user=${DB_UTENTE}
password=${DB_PASSWORD}
CNF
chmod 600 /root/.my.cnf

msg "Configuro il backup notturno del database"
cat > /etc/cron.daily/neurodesk-dump <<'DUMP'
#!/bin/sh
# Dump logico coerente: --single-transaction non blocca le scritture.
# Uno snapshot del disco di una macchina accesa può essere incoerente, questo no.
D=/var/backups/neurodesk
mkdir -p "$D" && chmod 700 "$D"
mysqldump --single-transaction --quick --no-tablespaces neurodesk_db | gzip > "$D/neurodesk-$(date +%F).sql.gz"
find "$D" -name 'neurodesk-*.sql.gz' -mtime +14 -delete
DUMP
chmod 700 /etc/cron.daily/neurodesk-dump

# --- Cartelle ----------------------------------------------------------------
msg "Preparo le cartelle"
mkdir -p /opt/neurodesk/companion-service /etc/neurodesk \
         /var/www/neurodesk /var/www/neurodesk-landing
chown -R "$UTENTE:$UTENTE" /opt/neurodesk
chmod 750 /etc/neurodesk

# --- Configurazione backend --------------------------------------------------
msg "Scrivo la configurazione del backend"
cat > /etc/neurodesk/backend.env <<ENV
NEURODESK_SECURITY_STRICT=true
NEURODESK_TEST_MODE=false
NEURODESK_JWT_SECRET=${JWT_SECRET}
NEURODESK_CRYPTO_SECRET=${CRYPTO_SECRET}
NEURODESK_INTERNAL_TOKEN=${INTERNAL_TOKEN}
NEURODESK_LOGIN_PEPPER=${LOGIN_PEPPER}
NEURODESK_ADMIN_CODICE=${ADMIN_CODICE}
NEURODESK_ADMIN_PASSWORD=${ADMIN_PASSWORD}
NEURODESK_CORS_ALLOWED_ORIGINS=https://${APP}
SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:3306/${DB_NOME}?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=${DB_UTENTE}
SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
SERVER_ADDRESS=127.0.0.1
SERVER_PORT=8080
SERVER_FORWARD_HEADERS_STRATEGY=NATIVE
ENV
chmod 600 /etc/neurodesk/backend.env

# --- Configurazione companion ------------------------------------------------
msg "Scrivo la configurazione del companion"
cat > /opt/neurodesk/companion-service/.env <<ENV
PORT=8090
HOST=127.0.0.1
CORS_ORIGIN=https://${APP}
JWT_SECRET=${JWT_SECRET}
BACKEND_URL=http://127.0.0.1:8080
INTERNAL_TOKEN=${INTERNAL_TOKEN}
TRUST_PROXY_HEADER=x-forwarded-for
AI_PROVIDER=anthropic
AI_TIMEOUT_MS=30000
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}
ANTHROPIC_MODEL=claude-sonnet-5
# Tetto per-chiamata. Se una risposta si tronca comunque, il servizio la continua
# in automatico (vedi aiProvider.js): niente risposte tagliate a meta'.
ANTHROPIC_MAX_TOKENS=2048
OPENAI_API_KEY=${OPENAI_KEY}
# Il ripiego risponde al posto del principale: se il principale e' un Sonnet 5,
# qui non puo' esserci un modello piccolo. Chi legge non sa che il provider e'
# cambiato e non deve accorgersene dal tono.
OPENAI_MODEL=gpt-5.6-terra
OPENAI_MAX_TOKENS=2048
# Sui modelli di ragionamento il tetto conta anche i token di pensiero, invisibili:
# questa riserva evita che il pensiero si mangi lo spazio della risposta.
OPENAI_RISERVA_RAGIONAMENTO=2048
ENV
chown "$UTENTE:$UTENTE" /opt/neurodesk/companion-service/.env
chmod 600 /opt/neurodesk/companion-service/.env

# --- Servizi systemd ---------------------------------------------------------
msg "Registro i due servizi"
cat > /etc/systemd/system/neurodesk-backend.service <<'UNIT'
[Unit]
Description=NeuroDesk backend (Spring Boot)
After=network.target mysql.service
Requires=mysql.service

[Service]
User=neurodesk
EnvironmentFile=/etc/neurodesk/backend.env
ExecStart=/usr/bin/java -Xmx768m -jar /opt/neurodesk/backend.jar
Restart=on-failure
RestartSec=5
# Irrigidimento: il servizio non deve poter scrivere fuori da casa sua.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/neurodesk

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/neurodesk-companion.service <<'UNIT'
[Unit]
Description=NeuroDesk companion service (Node)
After=network.target

[Service]
User=neurodesk
WorkingDirectory=/opt/neurodesk/companion-service
ExecStart=/usr/bin/node --env-file=.env src/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/neurodesk

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable neurodesk-backend neurodesk-companion >/dev/null

# --- Caddy: due siti, un certificato ciascuno --------------------------------
msg "Configuro Caddy"
# La cartella del log degli accessi va creata E data a caddy PRIMA del reload:
# se il file non e' scrivibile dall'utente caddy, il caricamento fallisce con
# "permission denied" e resta attiva la configurazione precedente. Preso in
# faccia il 29 luglio 2026.
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy && chmod 750 /var/log/caddy
# Caddyfile: il contenuto sta in deploy/Caddyfile.template, non qui.
#
# Stava in un heredoc dentro questo script, ed era divergiato: trappole
# dell'honeypot e log degli accessi erano finiti solo sul file vivo del server.
# Un server ricostruito da zero sarebbe nato senza. Una fonte sola, e questa
# riga la sostituisce.
MODELLO="$(dirname "${BASH_SOURCE[0]}")/Caddyfile.template"
[ -f "$MODELLO" ] || err "Manca deploy/Caddyfile.template accanto a questo script."
DOMINIO="$DOMINIO" EMAIL_TLS="$EMAIL_TLS" \
  envsubst '${DOMINIO} ${EMAIL_TLS}' < "$MODELLO" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile >/dev/null && msg "Caddyfile valido"

# --- Promemoria dei segreti --------------------------------------------------
cat > "$SEGRETI" <<TXT
NeuroDesk — segreti di produzione, generati il $(date +%F).

Codice admin:        ${ADMIN_CODICE}
Password admin:      ${ADMIN_PASSWORD}

Chiave di cifratura: ${CRYPTO_SECRET}

⚠️  La chiave di cifratura NON è nel database e NON è nei backup.
    Senza di essa i backup delle conversazioni sono illeggibili per sempre.
    Copiala in un password manager, poi cancella questo file.
TXT
chmod 600 "$SEGRETI"

msg "Server pronto."
cat <<FINE

  Adesso, dal tuo Mac:      bash deploy/02-pubblica.sh root@$(hostname -I | awk '{print $1}')

  I segreti sono in ${SEGRETI} (leggibile solo da root).
  Aprilo, copia codice e password admin e la chiave di cifratura
  in un password manager, poi cancella il file.

FINE
