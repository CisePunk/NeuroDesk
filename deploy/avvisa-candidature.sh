#!/usr/bin/env bash
#
# NeuroDesk — avviso per ogni nuova candidatura arrivata dal form della landing.
#
# Perche' esiste: il form salva nella tabella `contatto` e basta. Non manda mail,
# e nessuna pagina dell'app mostra quelle righe. Senza questo avviso, chi si
# candida finisce in un cassetto che nessuno apre — e il danno e' peggiore di
# quando il form era rotto, perche' allora almeno la persona LEGGEVA che l'invio
# non era riuscito e scriveva alla mail.
#
# Perche' via msmtp e non dal backend Java: la password della casella e' gia' sul
# server in /etc/msmtprc, leggibile solo da root. Farla usare al backend
# vorrebbe dire copiarla in backend.env, che l'utente del servizio puo' leggere.
# Una credenziale in un posto solo, e quel posto e' il piu' chiuso.
#
# Gira ogni 10 minuti (timer systemd). Tiene il conto dell'ultima riga gia'
# segnalata in un file di stato: se il server si spegne, al riavvio riprende da
# li' e non rimanda tutto da capo.
#
set -euo pipefail

STATO="/var/lib/neurodesk/ultima-candidatura"
DESTINATARIO="${NEURODESK_REPORT_EMAIL:-hello@neurodesk.it}"
DB="neurodesk_db"

mkdir -p "$(dirname "$STATO")"
ULTIMO=$(cat "$STATO" 2>/dev/null || echo 0)
# Se il file di stato e' corrotto o vuoto, riparti da zero invece di fallire.
[[ "$ULTIMO" =~ ^[0-9]+$ ]] || ULTIMO=0

MASSIMO=$(mysql -N -B "$DB" -e "SELECT COALESCE(MAX(id), 0) FROM contatto;")
[ "$MASSIMO" -gt "$ULTIMO" ] || exit 0

NUOVE=$(mysql -N -B "$DB" -e "SELECT COUNT(*) FROM contatto WHERE id > ${ULTIMO};")

# Il messaggio della persona VA nella mail: e' il senso della cosa. Ma resta fra
# il server e la casella, non finisce in nessun log.
CORPO=$(mysql -N -B "$DB" -e "
    SELECT CONCAT(
        '— — — — — — — — — — — — — — —\n',
        'Da:       ', nome, '\n',
        'Email:    ', email, '\n',
        'Arrivata: ', DATE_FORMAT(creato_il, '%d/%m/%Y alle %H:%i'), '\n',
        'Consenso: ', IF(consenso, 'dato', 'NON dato — attenzione'), '\n\n',
        messaggio, '\n'
    )
    FROM contatto WHERE id > ${ULTIMO} ORDER BY id;" | sed 's/\\n/\n/g')

if [ "$NUOVE" -eq 1 ]; then
    OGGETTO="NeuroDesk — una nuova candidatura dal sito"
else
    OGGETTO="NeuroDesk — ${NUOVE} nuove candidature dal sito"
fi

{
    printf 'To: %s\n' "$DESTINATARIO"
    printf 'From: %s\n' "$DESTINATARIO"
    printf 'Subject: %s\n' "$OGGETTO"
    printf 'Content-Type: text/plain; charset=UTF-8\n\n'
    printf 'Qualcuno ha compilato il modulo su neurodesk.it.\n\n'
    printf '%s\n' "$CORPO"
    printf '\n— — — — — — — — — — — — — — —\n'
    printf 'Per rispondere basta scrivere all indirizzo qui sopra.\n'
    printf 'Per emettere un codice: https://app.neurodesk.it/codici\n'
} | msmtp --read-recipients

# Il segnalibro si sposta SOLO se la mail e' partita: con set -e, un invio
# fallito interrompe qui e al giro dopo si riprova. Meglio un doppione che una
# candidatura persa.
echo "$MASSIMO" > "$STATO"
echo "segnalate ${NUOVE} nuove candidature (fino alla riga ${MASSIMO})"
