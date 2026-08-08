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
# Servono nella rilettura delle unità. Nella prima stesura non c'erano — li
# avevo presi a memoria da un altro script — e ogni riga di esito finiva con
# «verde: command not found». Il controllo funzionava, il modo di raccontarlo no.
verde() { printf '\033[1;32m%s\033[0m' "$1"; }
rosso() { printf '\033[1;31m%s\033[0m' "$1"; }

[ "$(id -u)" -eq 0 ] || err "Esegui come root."
command -v caddy >/dev/null || err "Caddy non è installato su questa macchina."

CONF=/etc/caddy/conf.d/esca.conf

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
# Tre comportamenti diversi, come li avrebbe un servizio vero.
#
#   percorso base e collector annunciato -> 200 con il JSON
#   percorso segreto                     -> 401 con WWW-Authenticate: Bearer
#   qualunque altro sotto-percorso       -> 404
#
# Il 404 sul resto è la parte che conta. Un servizio vero non risponde 200 a
# ogni sotto-percorso inventato: se lo fa, chi fuzza lo scopre in due richieste,
# capisce che è un'esca e se ne va — e con lui se ne va il segnale che ci
# interessa, quello di chi prova a usare il token. L'esca vale finché è
# credibile. È la stessa dottrina della lista bianca dell'app, applicata qui.
#
# Il 401 sul percorso segreto è deliberato: è quello che farebbe un collector
# vero, e dice a chi ci è arrivato «hai trovato la porta giusta, ora
# autenticati» — con un token che ha letto dieci secondi prima. Trasforma il
# percorso segreto da vicolo cieco in innesco del gradino più alto.

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
# Il percorso segreto compare qui SOLO per rispondere 401: non è annunciato da
# nessuna risposta, quindi chi ci arriva lo ha indovinato. Il 401 è l'invito a
# usare il token, che è il segnale che ci interessa davvero.
handle ${BASE} {
    header Content-Type application/json
    respond \`${CORPO}\` 200
}
handle ${ANNUNCIATO} {
    header Content-Type application/json
    respond \`${CORPO}\` 200
}
# Il percorso segreto: 401, come un collector vero senza credenziali. Non
# compare in nessuna risposta dell'esca — chi ci arriva lo ha indovinato.
handle ${SEGRETO} {
    header Content-Type application/json
    header WWW-Authenticate \`Bearer realm="internal-metrics"\`
    respond \`{"error":"missing bearer token"}\` 401
}
# Tutto il resto sotto l'esca: 404. Un servizio vero non dice "trovato" a
# qualunque percorso inventato, e dirlo rivelerebbe l'esca in due richieste.
handle ${BASE}/* {
    respond 404
}
CONFFILE

msg "Controllo la configurazione di Caddy prima di ricaricarla"
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 \
    || err "La configurazione di Caddy non è valida. Ho lasciato una copia in $CONF.*.bak — ripristinala."

# --- Le variabili del rilevatore ---------------------------------------------

# Le unità NON sono elencate a mano: si cercano.
#
# La prima stesura scriveva le variabili in neurodesk-controllo.service, e
# basta. Ma il rilevatore gira da neurodesk-honeypot.service — un'unità
# diversa, ogni quindici minuti invece che ogni tre giorni. Le variabili
# finivano nel posto sbagliato, il gradino nuovo non sarebbe MAI scattato, e
# lo script diceva "Fatto." lo stesso.
#
# Cercarle invece di elencarle significa che il giorno in cui nasce una quarta
# unità che usa l'honeypot, questa la trova da sola.
msg "Cerco le unità che usano l'honeypot"
mapfile -t UNITA < <(grep -ln "honeypot" /etc/systemd/system/*.service 2>/dev/null || true)
# Il controllo periodico invoca l'honeypot al proprio interno: va incluso anche
# se il nome del file non lo dice.
for u in /etc/systemd/system/*.service; do
    exe=$(grep -m1 '^ExecStart=' "$u" 2>/dev/null | cut -d= -f2- | awk '{print $1}')
    [ -n "$exe" ] && [ -f "$exe" ] && grep -q "honeypot" "$exe" 2>/dev/null \
        && UNITA+=("$u")
done
# Tolgo i doppioni mantenendo l'ordine.
mapfile -t UNITA < <(printf '%s\n' "${UNITA[@]}" | awk '!v[$0]++')

[ "${#UNITA[@]}" -gt 0 ] || err "Nessuna unità systemd usa l'honeypot.
   Senza, le variabili non arriverebbero a nessuno e il rilevamento resterebbe
   fermo alla configurazione precedente."

for u in "${UNITA[@]}"; do
    printf '  %s\n' "$(basename "$u")"
    cp "$u" "$u.$(date +%Y%m%d%H%M%S).bak"
    # Tolgo le righe vecchie e le riscrivo dentro [Service]: così lo script si
    # può rilanciare quante volte serve senza accumulare duplicati.
    sed -i '/^Environment=HONEYPOT_PERCORSI_/d' "$u"
    sed -i "/^\[Service\]/a Environment=HONEYPOT_PERCORSI_SEGNALE=${BASE}\nEnvironment=HONEYPOT_PERCORSI_ANNUNCIATI=${ANNUNCIATO}\nEnvironment=HONEYPOT_PERCORSI_INTRUSIONE=${SEGRETO}" "$u"
done

systemctl daemon-reload

# E adesso si RILEGGE quello che systemd ha davvero caricato. Scrivere in un
# file non è la stessa cosa che averlo fatto arrivare al processo: è
# esattamente il passaggio dove la prima stesura si era persa.
msg "Rileggo dalle unità caricate, invece di fidarmi di aver scritto"
MANCANTI=0
for u in "${UNITA[@]}"; do
    nome=$(basename "$u" .service)
    letto=$(systemctl show "$nome" -p Environment --value 2>/dev/null)
    if printf '%s' "$letto" | grep -q "HONEYPOT_PERCORSI_ANNUNCIATI=${ANNUNCIATO}"; then
        printf '  %-34s %s\n' "$nome" "$(verde ok)"
    else
        printf '  %-34s %s  le variabili non sono arrivate\n' "$nome" "$(rosso NO)"
        MANCANTI=1
    fi
done
[ "$MANCANTI" -eq 0 ] || err "Almeno un'unità non ha le variabili: il rilevamento
   userebbe la configurazione vecchia senza dirlo. I backup sono accanto agli
   originali, con il timestamp nel nome."
systemctl reload caddy || systemctl restart caddy

# --- Verifica, invece di dare per scontato ----------------------------------

msg "Verifico che ogni percorso risponda come deve"
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
controlla "$SEGRETO"    401 "il segreto chiede il token"    || ESITO=1
controlla "${BASE}/zzz-inesistente" 404 "il resto è 404, come un servizio vero" || ESITO=1

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
