#!/usr/bin/env bash
#
# NeuroDesk — controllo periodico. Gira SUL SERVER ogni 3 giorni (timer systemd).
# Produce un report unico con due parti:
#   A) sicurezza  — CVE note, aggiornamenti di sistema, certificati, porte, e una
#                   prova VERA che l'endpoint AI resti chiuso senza token
#   B) pilota     — tester attivi, consensi, conversazioni, feedback
#
# Il report viene archiviato in /var/log/neurodesk/ e spedito per email.
# Installato da 03-installa-controllo.sh — non serve lanciarlo a mano.
#
set -uo pipefail   # niente -e: un controllo che fallisce non deve fermare gli altri

DOMINIO="neurodesk.it"
APP="app.${DOMINIO}"
ARCHIVIO="/var/log/neurodesk"
OGGI=$(date +%F)
REPORT="${ARCHIVIO}/report-${OGGI}.txt"
DESTINATARIO="${NEURODESK_REPORT_EMAIL:-hello@neurodesk.it}"

mkdir -p "$ARCHIVIO"
exec > >(tee "$REPORT") 2>&1

ALLARMI=0
titolo() { printf '\n\n=== %s ===\n\n' "$1"; }
ok()     { printf '  [ok]      %s\n' "$1"; }
avviso() { printf '  [ATTENZ.] %s\n' "$1"; ALLARMI=$((ALLARMI+1)); }
grave()  { printf '  [GRAVE]   %s\n' "$1"; ALLARMI=$((ALLARMI+2)); }

echo "NeuroDesk — report del $(date '+%d/%m/%Y alle %H:%M')"
echo "Server: $(hostname) — attivo da $(uptime -p 2>/dev/null || echo '?')"

# =============================================================================
# A) SICUREZZA
# =============================================================================

titolo "A1. Vulnerabilità note nelle librerie (fonte: OSV.dev)"

# Interroga OSV.dev per un pacchetto+versione. OSV aggrega gli avvisi di Maven,
# npm e delle distribuzioni: una sola API invece di leggere i bollettini di
# ciascun fornitore. Se la rete non risponde, lo diciamo invece di tacere.
controlla_osv() {
    local ecosistema="$1" nome="$2" versione="$3"
    local risposta conteggio
    risposta=$(curl -s --max-time 20 -X POST https://api.osv.dev/v1/query \
        -H 'Content-Type: application/json' \
        -d "{\"package\":{\"ecosystem\":\"${ecosistema}\",\"name\":\"${nome}\"},\"version\":\"${versione}\"}") || {
        avviso "${nome} ${versione}: impossibile contattare OSV.dev (rete?)"; return; }

    conteggio=$(printf '%s' "$risposta" | grep -o '"id"' | wc -l | tr -d ' ')
    if [ "$conteggio" -eq 0 ]; then
        ok "${nome} ${versione}: nessuna vulnerabilità nota"
    else
        grave "${nome} ${versione}: ${conteggio} vulnerabilità note"
        printf '%s' "$risposta" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 | sort -u \
            | sed 's/^/              /'
    fi
}

# Versioni lette dal progetto pubblicato, non scritte a mano: se aggiorni una
# libreria e dimentichi questo file, il controllo resta comunque veritiero.
VER_BOOT=$(unzip -l /opt/neurodesk/backend.jar 2>/dev/null \
           | grep -oE 'spring-boot-[0-9]+\.[0-9]+\.[0-9]+\.jar' | head -1 \
           | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || true)
VER_JJWT=$(unzip -l /opt/neurodesk/backend.jar 2>/dev/null \
           | grep -oE 'jjwt-api-[0-9.]+\.jar' | head -1 \
           | grep -oE '[0-9]+\.[0-9.]+[0-9]' || true)

if [ -n "$VER_BOOT" ]; then
    controlla_osv Maven "org.springframework.boot:spring-boot" "$VER_BOOT"
else
    avviso "versione di Spring Boot non rilevata dal jar: controllala a mano"
fi

if [ -n "$VER_JJWT" ]; then
    controlla_osv Maven "io.jsonwebtoken:jjwt-api" "$VER_JJWT"
else
    avviso "versione di jjwt non rilevata dal jar: controllala a mano"
fi

titolo "A2. Aggiornamenti di sistema"

apt-get update -qq >/dev/null 2>&1
DA_AGGIORNARE=$(apt-get -s upgrade 2>/dev/null | grep -c '^Inst' || echo 0)
SICUREZZA=$(apt-get -s upgrade 2>/dev/null | grep '^Inst' | grep -ci security || echo 0)
if [ "$SICUREZZA" -gt 0 ]; then
    grave "${SICUREZZA} aggiornamenti di SICUREZZA in attesa (su ${DA_AGGIORNARE} totali)"
    echo "              Per applicarli:  apt update && apt upgrade -y"
elif [ "$DA_AGGIORNARE" -gt 0 ]; then
    ok "${DA_AGGIORNARE} aggiornamenti disponibili, nessuno di sicurezza"
else
    ok "sistema aggiornato"
fi

titolo "A3. Certificati HTTPS"

for host in "$DOMINIO" "$APP"; do
    scadenza=$(echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null \
               | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -z "$scadenza" ]; then
        grave "${host}: nessun certificato raggiungibile"
        continue
    fi
    giorni=$(( ( $(date -d "$scadenza" +%s) - $(date +%s) ) / 86400 ))
    if   [ "$giorni" -lt 10 ]; then grave  "${host}: certificato scade fra ${giorni} giorni"
    elif [ "$giorni" -lt 20 ]; then avviso "${host}: certificato scade fra ${giorni} giorni"
    else ok "${host}: certificato valido per altri ${giorni} giorni"
    fi
done

titolo "A4. Porte aperte verso internet"

# Solo 22, 80 e 443 devono essere in ascolto su indirizzi pubblici.
ESPOSTE=$(ss -tlnH 2>/dev/null | awk '{print $4}' | grep -v '^127\.' | grep -v '^\[::1\]' \
          | sed 's/.*://' | sort -u | tr '\n' ' ')
INATTESE=$(echo "$ESPOSTE" | tr ' ' '\n' | grep -vE '^(22|80|443|)$' | tr '\n' ' ')
if [ -n "${INATTESE// /}" ]; then
    grave "porte esposte non previste: ${INATTESE}"
else
    ok "in ascolto pubblico solo: ${ESPOSTE}"
fi
ss -tlnH 2>/dev/null | grep -qE '127\.0\.0\.1:(3306|8080|8090)' \
    && ok "database e servizi interni raggiungibili solo da localhost" \
    || avviso "verifica che MySQL e i servizi siano legati a 127.0.0.1"

titolo "A5. Prova vera: la porta della chat è ancora chiusa?"

# Questo non legge configurazioni: chiama davvero l'endpoint AI senza token.
# Se un giorno un aggiornamento sbagliato aprisse l'accesso, lo scopriamo qui
# e non da una bolletta di Anthropic inaspettata.
CODICE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST \
    "https://${APP}/api/companion/respond" \
    -H 'Content-Type: application/json' -d '{"message":"prova automatica"}')
case "$CODICE" in
    401) ok "senza token risponde 401, come deve" ;;
    503) avviso "risponde 503: JWT_SECRET mancante o troppo corto (la chat è ferma)" ;;
    200) grave "RISPONDE 200 SENZA TOKEN — l'endpoint AI è aperto a chiunque" ;;
    *)   avviso "risposta inattesa: HTTP ${CODICE}" ;;
esac

titolo "A6. Servizi e backup"

for s in neurodesk-backend neurodesk-companion caddy mysql; do
    systemctl is-active --quiet "$s" && ok "${s}: attivo" || grave "${s}: NON attivo"
done

ULTIMO=$(ls -1t /var/backups/neurodesk/*.sql.gz 2>/dev/null | head -1)
if [ -z "$ULTIMO" ]; then
    grave "nessun backup del database trovato"
else
    ORE=$(( ( $(date +%s) - $(stat -c %Y "$ULTIMO") ) / 3600 ))
    PESO=$(du -h "$ULTIMO" | cut -f1)
    if [ "$ORE" -gt 48 ]; then grave "ultimo backup di ${ORE} ore fa (${PESO})"
    else ok "ultimo backup ${ORE} ore fa, ${PESO}"; fi
fi

LIBERO=$(df -h / | awk 'NR==2{print $4}')
USATO=$(df / | awk 'NR==2{print $5}' | tr -d '%')
[ "$USATO" -gt 85 ] && grave "disco pieno all'${USATO}% (liberi ${LIBERO})" \
                    || ok "disco usato al ${USATO}%, liberi ${LIBERO}"

# =============================================================================
# B) COME VA IL PILOTA
# =============================================================================

titolo "B. Il pilota in numeri"

# Sola lettura, e nessun contenuto delle conversazioni: solo conteggi.
# Il testo dei messaggi è cifrato e questo script non ha la chiave: per scelta.
mysql --defaults-file=/root/.my.cnf -N -B neurodesk_db 2>/dev/null <<'SQL' | while IFS=$'\t' read -r etichetta valore; do printf '  %-42s %s\n' "$etichetta" "$valore"; done
SELECT 'Tester creati',                     COUNT(*) FROM utenti WHERE ruolo='STUDENTE';
SELECT 'Tester attivi',                     COUNT(*) FROM utenti WHERE ruolo='STUDENTE' AND attivo=1;
SELECT 'Tester che hanno dato il consenso', COUNT(*) FROM utenti WHERE ruolo='STUDENTE' AND consensoIl IS NOT NULL;
SELECT 'Tester mai entrati in chat',        COUNT(*) FROM utenti u WHERE u.ruolo='STUDENTE'
       AND NOT EXISTS (SELECT 1 FROM companion_sessioni s WHERE s.utenteId=u.id);
SELECT 'Conversazioni totali',              COUNT(*) FROM companion_sessioni;
SELECT 'Conversazioni negli ultimi 3 gg',   COUNT(*) FROM companion_sessioni WHERE creatoIl >= NOW() - INTERVAL 3 DAY;
SELECT 'Messaggi scambiati',                COUNT(*) FROM companion_messaggi;
SELECT 'Messaggi negli ultimi 3 gg',        COUNT(*) FROM companion_messaggi WHERE creatoIl >= NOW() - INTERVAL 3 DAY;
SELECT 'Feedback ricevuti',                 COUNT(*) FROM feedback;
SELECT 'Feedback negli ultimi 3 gg',        COUNT(*) FROM feedback WHERE creatoIl >= NOW() - INTERVAL 3 DAY;
SQL

echo
echo "  Argomenti più frequenti (dal titolo della conversazione, non dal contenuto):"
mysql --defaults-file=/root/.my.cnf -N -B neurodesk_db 2>/dev/null <<'SQL' | sed 's/\t/: /' | sed 's/^/    /'
SELECT COALESCE(NULLIF(titolo,''),'(senza titolo)'), COUNT(*) c
FROM companion_sessioni GROUP BY 1 ORDER BY c DESC LIMIT 6;
SQL

echo
echo "  Risposte ai feedback:"
mysql --defaults-file=/root/.my.cnf -N -B neurodesk_db 2>/dev/null <<'SQL' | awk -F'\t' '{printf "    %-28s %-14s %s\n", $1, $2, $3}'
SELECT domanda, valore, COUNT(*) FROM feedback_risposte GROUP BY domanda, valore ORDER BY domanda, COUNT(*) DESC;
SQL

# =============================================================================
titolo "In sintesi"

if   [ "$ALLARMI" -eq 0 ]; then echo "  Tutto in ordine. Nessuna azione richiesta."
elif [ "$ALLARMI" -le 2 ]; then echo "  ${ALLARMI} punto/i da guardare con calma. Niente di urgente."
else echo "  ${ALLARMI} punti da sistemare, alcuni marcati GRAVE. Guardali oggi."
fi
echo
echo "  Report archiviato in ${REPORT}"
echo "  Prossimo controllo fra 3 giorni."

# --- Spedizione --------------------------------------------------------------
if command -v msmtp >/dev/null 2>&1; then
    if [ "$ALLARMI" -eq 0 ]; then OGGETTO="NeuroDesk — tutto ok ($(date +%d/%m))"
    else OGGETTO="NeuroDesk — ${ALLARMI} cose da guardare ($(date +%d/%m))"; fi
    { printf 'To: %s\nFrom: %s\nSubject: %s\nContent-Type: text/plain; charset=UTF-8\n\n' \
        "$DESTINATARIO" "$DESTINATARIO" "$OGGETTO"; cat "$REPORT"; } \
        | msmtp --read-recipients 2>/dev/null \
        && echo "  Report spedito a ${DESTINATARIO}." \
        || echo "  ATTENZIONE: invio email fallito. Il report resta in ${REPORT}."
fi

# Tiene un trimestre di storico, poi fa spazio.
find "$ARCHIVIO" -name 'report-*.txt' -mtime +90 -delete
