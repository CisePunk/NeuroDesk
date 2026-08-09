#!/usr/bin/env bash
#
# NeuroDesk — dichiara nota l'origine dell'amministratrice. SUL VPS, come root.
#
#   scp deploy/05-escludi-amministratore.sh root@IP:/root/
#   ssh root@IP 'bash /root/05-escludi-amministratore.sh 93.38.26.63'
#
# Perché serve
# ------------
# Chi amministra il server lo prova anche dall'esterno: cerca percorsi che non
# esistono, ne prova di ostili apposta, guarda cosa risponde. È il modo in cui
# si scopre se una difesa funziona.
#
# Per il rilevatore quel comportamento è indistinguibile da una scansione, e
# infatti l'8 agosto 2026 sono bastate sei richieste con `..%252f` per far
# scattare tutto. Il risultato: allarmi su di sé, e — se sul server c'è un
# bando automatico — l'amministratrice chiusa fuori dalla propria macchina, su
# tutte le porte, SSH compreso.
#
# Questo NON toglie difese. Le mosse restano nell'archivio, marcate: cambia
# solo che non generano una mail e non vengono contate come attacco.
#
# ATTENZIONE: un indirizzo di casa cambia. Se un giorno gli allarmi tornano a
# parlare di te, rilancia questo script con il nuovo indirizzo. Il vecchio va
# tolto: un indirizzo dichiarato affidabile che nel frattempo è passato a
# qualcun altro è peggio di nessuna esclusione.

set -euo pipefail

msg() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
err() { printf '\n\033[1;31m!!\033[0m %s\n' "$1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || err "Esegui come root."

ORIGINE="${1:-}"
[ -n "$ORIGINE" ] || read -rp "Indirizzo o rete da dichiarare nota (es. 93.38.26.63 o 2a01:…::/64): " ORIGINE
[ -n "$ORIGINE" ] || err "Serve un indirizzo."

# --- 1. Il rilevatore: smette di suonare, non smette di guardare -------------
#
# Le unità si CERCANO, non si elencano: la prima stesura di un altro script
# scriveva in una sola unità e il rilevatore ne usa un'altra. Vedi
# DA-FARE-SUL-SERVER.md.
msg "Cerco le unità che usano l'honeypot"
mapfile -t UNITA < <(grep -ln "honeypot" /etc/systemd/system/*.service 2>/dev/null || true)
for u in /etc/systemd/system/*.service; do
    exe=$(grep -m1 '^ExecStart=' "$u" 2>/dev/null | cut -d= -f2- | awk '{print $1}')
    [ -n "$exe" ] && [ -f "$exe" ] && grep -q "honeypot" "$exe" 2>/dev/null && UNITA+=("$u")
done
mapfile -t UNITA < <(printf '%s\n' "${UNITA[@]}" | awk '!v[$0]++')
[ "${#UNITA[@]}" -gt 0 ] || err "Nessuna unità systemd usa l'honeypot."

for u in "${UNITA[@]}"; do
    printf '  %s\n' "$(basename "$u")"
    cp "$u" "$u.$(date +%Y%m%d%H%M%S).bak"
    # Si sostituisce l'elenco intero: un indirizzo vecchio che resta è un
    # permesso lasciato a chi lo eredita.
    sed -i '/^Environment=HONEYPOT_ORIGINI_NOTE=/d' "$u"
    sed -i "/^\[Service\]/a Environment=HONEYPOT_ORIGINI_NOTE=${ORIGINE}" "$u"
done
systemctl daemon-reload

msg "Rileggo da systemd, invece di fidarmi di aver scritto"
MANCA=0
for u in "${UNITA[@]}"; do
    nome=$(basename "$u" .service)
    if systemctl show "$nome" -p Environment --value | grep -q "HONEYPOT_ORIGINI_NOTE=${ORIGINE}"; then
        printf '  %-34s \033[1;32mok\033[0m\n' "$nome"
    else
        printf '  %-34s \033[1;31mNO\033[0m  la variabile non è arrivata\n' "$nome"; MANCA=1
    fi
done
[ "$MANCA" -eq 0 ] || err "Almeno un'unità non ha la variabile. I backup sono accanto agli originali."

# --- 2. Il firewall: quello che ti ha chiuso fuori ---------------------------
#
# Il rilevatore osserva e basta. Se sei rimasta senza SSH, il bando arriva da
# qualcos'altro: fail2ban, o una protezione del provider.
msg "Cerco chi può aver bandito l'indirizzo"
if command -v fail2ban-client >/dev/null 2>&1; then
    echo "  fail2ban presente. Jail attive:"
    fail2ban-client status 2>/dev/null | sed 's/^/    /'
    for jail in $(fail2ban-client status 2>/dev/null | sed -n 's/.*Jail list:\s*//p' | tr ',' ' '); do
        if fail2ban-client status "$jail" 2>/dev/null | grep -q "$ORIGINE"; then
            echo "  $ORIGINE è bandito in '$jail': lo tolgo"
            fail2ban-client set "$jail" unbanip "$ORIGINE" >/dev/null 2>&1 || true
        fi
    done
    # E lo si dichiara ignorato, così non ricapita.
    if [ -d /etc/fail2ban ]; then
        mkdir -p /etc/fail2ban/jail.d
        printf '[DEFAULT]\nignoreip = 127.0.0.1/8 ::1 %s\n' "$ORIGINE" \
            > /etc/fail2ban/jail.d/amministratore.conf
        systemctl reload fail2ban 2>/dev/null || systemctl restart fail2ban
        echo "  dichiarato in ignoreip"
    fi
else
    echo "  fail2ban non è installato: il bando non viene da qui."
    echo "  Guarda le regole del firewall e il pannello del provider:"
    echo "    ufw status numbered | grep -i deny"
    echo "    iptables -L INPUT -n --line-numbers | head -20"
fi

echo
msg "Fatto."
cat <<NOTA

  Da adesso l'origine ${ORIGINE} è dichiarata nota:

    · le sue mosse restano nell'archivio, marcate «[nota]»
    · non generano più una mail
    · non vengono contate come attacco

  Non è una difesa in meno: è smettere di suonare l'allarme a chi ha le chiavi.

NOTA
