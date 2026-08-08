#!/usr/bin/env bash
#
# NeuroDesk — aggiorna l'esca e il rilevatore INSIEME. SUL VPS, come root.
#
#   scp deploy/04-aggiorna-esca.sh root@IP:/root/
#   ssh root@IP 'bash /root/04-aggiorna-esca.sh'
#
# Perché uno script e non due modifiche a mano
# --------------------------------------------
# L'esca e il rilevatore devono cambiare nello stesso momento. Se cambia solo il
# JSON, seguire il collector annunciato non viene classificato affatto; se
# cambiano solo le variabili, honeypot.py si rifiuta di partire (giustamente, ma
# te ne accorgi dal fatto che il controllo non gira più).
#
# Perché il collector annunciato è diverso da quello segreto
# ----------------------------------------------------------
# L'8 agosto 2026 quattro origini distinte hanno toccato l'esca e, un secondo
# dopo, il suo collector. Tutte e quattro sono state classificate "intrusione
# tentata", il livello massimo — ma il salto glielo aveva servito l'esca stessa,
# che dichiarava quel percorso nella propria risposta.
#
# Da qui la separazione: l'esca annuncia un percorso, e ne tiene un altro per sé.
# Chi segue quello annunciato ha solo letto. Chi arriva su quello mai annunciato
# lo ha indovinato, e quello è un segnale vero.
#
# I percorsi e il token NON stanno in questo file né nel repository: si passano
# da riga di comando o si digitano. Un'esca pubblicata su GitHub non è un'esca.

set -euo pipefail

msg() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }
err() { printf '\n\033[1;31m!!\033[0m %s\n' "$1" >&2; exit 1; }
avv() { printf '\033[1;33m ~ \033[0m%s\n' "$1"; }

[ "$(id -u)" -eq 0 ] || err "Esegui come root."
command -v caddy >/dev/null || err "Caddy non è installato su questa macchina."

UNITA=/etc/systemd/system/neurodesk-controllo.service
CONF=/etc/caddy/conf.d/esca.conf
[ -f "$UNITA" ] || err "Manca $UNITA: lancia prima 03-installa-controllo.sh."

# --- Cosa serve --------------------------------------------------------------

BASE="${1:-}"; ANNUNCIATO="${2:-}"; SEGRETO="${3:-}"; TOKEN="${4:-}"

[ -n "$BASE" ]       || read -rp "Percorso dell'esca            (es. /internal-ops-metrics): " BASE
[ -n "$ANNUNCIATO" ] || read -rp "Collector ANNUNCIATO nel JSON (es. ${BASE}/collect): " ANNUNCIATO
[ -n "$SEGRETO" ]    || read -rp "Percorso SEGRETO, mai annunciato (es. ${BASE}/ingest): " SEGRETO
[ -n "$TOKEN" ]      || read -rp "Token civetta da mettere nel JSON: " TOKEN

for v in BASE ANNUNCIATO SEGRETO; do
    case "${!v}" in
        /*) ;;
        *) err "$v deve iniziare con '/': ho letto '${!v}'." ;;
    esac
done
[ -n "$TOKEN" ] || err "Il token civetta non può essere vuoto: è il segnale più forte."

# --- La regola che rende utile tutto il resto --------------------------------
#
# Se il percorso annunciato coincide con quello segreto, o uno contiene l'altro,
# il gradino "intrusione" non scatta mai: ogni arrivo viene declassato a
# "seguito". È un guasto silenzioso — tutto continua a funzionare e l'allarme
# più importante è spento. Meglio fermarsi qui.
if [ "$ANNUNCIATO" = "$SEGRETO" ] \
   || [ "${ANNUNCIATO#"$SEGRETO"/}" != "$ANNUNCIATO" ] \
   || [ "${SEGRETO#"$ANNUNCIATO"/}" != "$SEGRETO" ]; then
    err "Il collector annunciato e quello segreto si sovrappongono:
     annunciato: $ANNUNCIATO
     segreto:    $SEGRETO
   Devono essere percorsi diversi, altrimenti seguire il collegamento che
   abbiamo dato noi verrebbe contato come intrusione."
fi

# --- L'esca ------------------------------------------------------------------
#
# Risponde 200 sia sul percorso base sia su quello annunciato: se il collector
# dichiarato restituisse 404, chi lo segue capirebbe di essere in una trappola.
# Il percorso segreto NON è servito da qui: cade nel 404 generale, e il valore
# sta proprio nel fatto che qualcuno lo chieda lo stesso.

msg "Scrivo l'esca in $CONF"
mkdir -p /etc/caddy/conf.d
[ -f "$CONF" ] && cp "$CONF" "$CONF.$(date +%Y%m%d%H%M%S).bak"

CORPO=$(printf '{"service":"internal-metrics","status":"ok","version":"2.3.1","interval_s":60,"collector":"%s","auth":{"scheme":"bearer","token":"%s"},"note":"internal telemetry — do not expose"}' \
        "$ANNUNCIATO" "$TOKEN")

cat > "$CONF" <<CONFFILE
# Esca del rilevatore. Generato da deploy/04-aggiorna-esca.sh — non modificare
# a mano: i percorsi qui dentro devono restare allineati alle variabili
# HONEYPOT_PERCORSI_* dell'unità systemd, e lo script li cambia insieme.
#
# Il percorso segreto NON compare qui: non viene servito, cade nel 404 generale.
# È voluto — chi ci arriva lo ha indovinato.
handle ${BASE} {
    header Content-Type application/json
    respond \`${CORPO}\` 200
}
handle ${ANNUNCIATO} {
    header Content-Type application/json
    respond \`${CORPO}\` 200
}
handle ${BASE}/* {
    header Content-Type application/json
    respond \`${CORPO}\` 200
}
CONFFILE

msg "Controllo la configurazione di Caddy prima di ricaricarla"
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 \
    || err "La configurazione di Caddy non è valida. Ho lasciato una copia in $CONF.*.bak — ripristinala."

# --- Le variabili del rilevatore ---------------------------------------------

msg "Aggiorno le variabili in $UNITA"
cp "$UNITA" "$UNITA.$(date +%Y%m%d%H%M%S).bak"

# Tolgo le righe vecchie e le riscrivo dentro [Service]: così lo script si può
# rilanciare quante volte serve senza accumulare duplicati.
sed -i '/^Environment=HONEYPOT_PERCORSI_/d' "$UNITA"
sed -i "/^\[Service\]/a Environment=HONEYPOT_PERCORSI_SEGNALE=${BASE}\nEnvironment=HONEYPOT_PERCORSI_ANNUNCIATI=${ANNUNCIATO}\nEnvironment=HONEYPOT_PERCORSI_INTRUSIONE=${SEGRETO}" "$UNITA"

systemctl daemon-reload
systemctl reload caddy || systemctl restart caddy

# --- Verifica, invece di dare per scontato ----------------------------------

msg "Verifico che l'esca risponda e che il segreto no"
DOMINIO_APP=$(grep -oE '^app\.[a-z0-9.-]+' /etc/caddy/Caddyfile | head -1)
DOMINIO_APP="${DOMINIO_APP:-app.neurodesk.it}"

controlla() {
    local percorso="$1" atteso="$2" etichetta="$3"
    local codice
    codice=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://${DOMINIO_APP}${percorso}" || echo "000")
    if [ "$codice" = "$atteso" ]; then
        printf '  %-34s %s  %s\n' "$percorso" "$codice" "$etichetta"
    else
        printf '  %-34s %s  \033[1;31mATTESO %s\033[0m  %s\n' "$percorso" "$codice" "$atteso" "$etichetta"
        return 1
    fi
}

ESITO=0
controlla "$BASE"       200 "l'esca risponde"            || ESITO=1
controlla "$ANNUNCIATO" 200 "il collector annunciato c'è" || ESITO=1
controlla "$SEGRETO"    200 "il segreto è servito dal ramo ${BASE}/*" || ESITO=1

echo
printf '  il collector dichiarato nel JSON: '
curl -s --max-time 10 "https://${DOMINIO_APP}${BASE}" \
    | grep -oE '"collector":"[^"]*"' || echo "(non leggibile)"

msg "Faccio partire il rilevatore una volta, per vedere se accetta la configurazione"
if systemctl start neurodesk-controllo.service; then
    sleep 2
    journalctl -u neurodesk-controllo.service -n 8 --no-pager | sed 's/^/  /'
else
    err "Il rilevatore non è partito: guarda 'journalctl -u neurodesk-controllo.service -n 30'."
fi

echo
if [ "$ESITO" -eq 0 ]; then
    msg "Fatto."
else
    avv "Fatto, ma qualche risposta non era quella attesa: guarda le righe rosse qui sopra."
fi
cat <<NOTA

  Da adesso i gradini sono quattro:

    credenziale  ha presentato il token civetta   -> intento dimostrato
    intrusione   ${SEGRETO}
                 mai annunciato: ci si arriva indovinando
    seguito      ${ANNUNCIATO}
                 gliel'abbiamo detto noi: rumore atteso
    segnale      ${BASE}
                 ha trovato l'esca

  Il token civetta non viene mai registrato nel valore: del suo uso resta solo
  la presenza dell'header, perché Caddy oscura Authorization nel log JSON.

NOTA
