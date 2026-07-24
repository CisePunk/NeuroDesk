#!/usr/bin/env bash
#
# NeuroDesk — installa il controllo periodico ogni 3 giorni. SUL VPS, come root,
# UNA VOLTA SOLA (dopo 01-prepara-server.sh e la prima pubblicazione).
#
#   scp deploy/controllo-periodico.sh deploy/03-installa-controllo.sh root@IP:/root/
#   ssh root@IP 'bash /root/03-installa-controllo.sh'
#
# Configura l'invio email e registra un timer systemd. Uso systemd e non cron
# perché ha il recupero automatico: se il server è spento al momento previsto,
# il controllo parte al riavvio invece di saltare il giro.
#
set -euo pipefail

msg() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
err() { printf '\n\033[1;31m!!\033[0m %s\n' "$1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Esegui come root."
[ -f /root/controllo-periodico.sh ] || err "Manca /root/controllo-periodico.sh: caricalo prima con scp."

# --- Email -------------------------------------------------------------------
# Hetzner blocca la porta 25 in uscita sui nuovi account, quindi NON proviamo a
# spedire da soli: ci appoggiamo al server SMTP di OVH sulla 587, autenticati.
# È anche l'unico modo perché le email non finiscano nello spam.
msg "Configuro l'invio email tramite il server SMTP di OVH"
apt-get install -y -qq msmtp msmtp-mta ca-certificates

read -rp  "Indirizzo email completo (es. hello@neurodesk.it): " EMAIL
read -rsp "Password di quella casella (non verrà mostrata): " EMAIL_PW; echo
read -rp  "Server SMTP [ssl0.ovh.net]: " SMTP; SMTP="${SMTP:-ssl0.ovh.net}"

cat > /etc/msmtprc <<CONF
defaults
auth           on
tls            on
tls_starttls   on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

account        neurodesk
host           ${SMTP}
port           587
from           ${EMAIL}
user           ${EMAIL}
password       ${EMAIL_PW}

account default : neurodesk
CONF
chmod 600 /etc/msmtprc
chown root:root /etc/msmtprc

msg "Mando un'email di prova"
printf 'To: %s\nFrom: %s\nSubject: NeuroDesk — prova invio\nContent-Type: text/plain; charset=UTF-8\n\nSe leggi questo messaggio, i report automatici ti arriveranno qui.\n' \
    "$EMAIL" "$EMAIL" | msmtp --read-recipients \
    && msg "Email di prova spedita: controlla la casella (guarda anche nello spam)." \
    || err "Invio fallito. Controlla indirizzo, password e server SMTP, poi rilancia."

# --- Installazione dello script ---------------------------------------------
msg "Installo il controllo"
install -m 700 -o root -g root /root/controllo-periodico.sh /usr/local/sbin/neurodesk-controllo
mkdir -p /var/log/neurodesk && chmod 750 /var/log/neurodesk
apt-get install -y -qq unzip   # serve a leggere le versioni dentro il jar

cat > /etc/systemd/system/neurodesk-controllo.service <<CONF
[Unit]
Description=NeuroDesk — controllo periodico (sicurezza + pilota)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
Environment=NEURODESK_REPORT_EMAIL=${EMAIL}
ExecStart=/usr/local/sbin/neurodesk-controllo
TimeoutStartSec=600
CONF

cat > /etc/systemd/system/neurodesk-controllo.timer <<'CONF'
[Unit]
Description=NeuroDesk — controllo ogni 3 giorni

[Timer]
# Ogni 3 giorni alle 8:00. RandomizedDelaySec evita di bussare a OSV.dev
# allo scoccare esatto dell'ora insieme a tutti gli altri.
OnCalendar=*-*-01/3 08:00:00
RandomizedDelaySec=30m
# Se il server era spento all'orario previsto, recupera al riavvio.
Persistent=true

[Install]
WantedBy=timers.target
CONF

systemctl daemon-reload
systemctl enable --now neurodesk-controllo.timer

msg "Fatto. Lancio subito il primo controllo per vedere se funziona."
systemctl start neurodesk-controllo.service || true
sleep 3

cat <<FINE

  Timer attivo. Prossime esecuzioni:
$(systemctl list-timers neurodesk-controllo.timer --no-pager | sed -n '2p' | sed 's/^/    /')

  Comandi utili:
    systemctl start neurodesk-controllo    # lancia un controllo adesso
    journalctl -u neurodesk-controllo -n 50 # cosa è successo l'ultima volta
    ls -t /var/log/neurodesk/               # lo storico dei report

FINE
