#!/usr/bin/env bash
#
# NeuroDesk — rotazione del sale delle impronte. Ogni 30 giorni, sul VPS.
#
# Perche'. Le impronte degli indirizzi sono SHA-256 con sale. Lo spazio IPv4 e'
# di 4 miliardi di indirizzi: chi ha il sale ricostruisce qualunque impronta per
# forza bruta in pochi secondi. Il sale quindi NON protegge dal furto del
# server — sale e archivio stanno sulla stessa macchina, chi prende root prende
# entrambi. Protegge dalla divulgazione accidentale del solo archivio, che e' un
# rischio diverso e reale.
#
# La rotazione limita il raggio: chi prende il file oggi non puo' risalire alle
# impronte di due mesi fa.
#
# Cosa si perde: la correlazione storica. Nel nostro caso vale poco — gli
# scanner industriali cambiano indirizzo continuamente, e l'evento del 30 luglio
# 2026 veniva da un'istanza noleggiata che non tornera'. Correlare a sei mesi non
# darebbe niente di operativo.
#
# L'EPOCA e' obbligatoria e viene scritta accanto a ogni evento: senza, si
# confronterebbero impronte di epoche diverse ottenendo silenziosamente "origini
# diverse" dove era la stessa.
#
set -euo pipefail

CONF=/etc/neurodesk/honeypot.env
[ "$(id -u)" -eq 0 ] || { echo "Esegui come root." >&2; exit 1; }
[ -f "$CONF" ] || { echo "Manca $CONF" >&2; exit 1; }

EPOCA_VECCHIA=$(grep '^HONEYPOT_SALT_EPOCA=' "$CONF" | cut -d= -f2- || echo 'sconosciuta')
EPOCA_NUOVA=$(date +%Y-%m)

if [ "$EPOCA_VECCHIA" = "$EPOCA_NUOVA" ]; then
    echo "Epoca gia' $EPOCA_NUOVA: niente da ruotare."
    exit 0
fi

SALE_NUOVO=$(head -c 32 /dev/urandom | base64 | tr -d '/+=')

# Si riscrive il file intero: cosi' non restano due righe HONEYPOT_HASH_SALT.
umask 077
{
    printf 'HONEYPOT_HASH_SALT=%s\n' "$SALE_NUOVO"
    printf 'HONEYPOT_SALT_EPOCA=%s\n' "$EPOCA_NUOVA"
    grep -vE '^HONEYPOT_(HASH_SALT|SALT_EPOCA)=' "$CONF" || true
} > "${CONF}.nuovo"
chmod 600 "${CONF}.nuovo"
chown root:root "${CONF}.nuovo"
mv "${CONF}.nuovo" "$CONF"

# Il segnalibro delle sessioni gia' segnalate contiene l'epoca nella chiave:
# con un'epoca nuova non collide, ma si ripulisce lo stesso per non farlo
# crescere all'infinito.
rm -f /var/lib/neurodesk/honeypot-sessioni-avvisate

echo "Sale ruotato: epoca ${EPOCA_VECCHIA} -> ${EPOCA_NUOVA}"
echo "Le impronte registrate prima di adesso NON sono piu' confrontabili con"
echo "quelle nuove. E' voluto: e' esattamente il raggio che la rotazione limita."
