#!/usr/bin/env bash
#
# Verifica della correzione 1: il ripiego della single-page risponde 404 su
# tutto cio che non e' una rotta vera dell'app.
#
#   bash deploy/verifica-fallback.sh
#
# Da lanciare DOPO il reload di Caddy. Esce con 1 se qualcosa non torna, cosi'
# si puo' mettere in un controllo automatico.
set -uo pipefail
APP=https://app.neurodesk.it
LAND=https://neurodesk.it
errori=0

prova() {   # prova <atteso> <url> <descrizione>
    local atteso="$1" url="$2" desc="$3"
    local got; got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url")
    if [ "$got" = "$atteso" ]; then
        printf '  ok    %-3s  %-46s %s\n' "$got" "${url#https://}" "$desc"
    else
        printf '  FALLITO atteso %s ottenuto %s  %-40s %s\n' "$atteso" "$got" "${url#https://}" "$desc"
        errori=$((errori+1))
    fi
}

echo "--- deve funzionare: rotte vere dell'app (deep link diretto) ---"
for r in / /login /consenso /companion /feedback /codici /moduli /moduli/nuovo /task /task/nuovo; do
    prova 200 "$APP$r" "rotta dell'app"
done

echo "--- deve funzionare: file statici ---"
prova 200 "$APP/favicon.svg" "icona"
prova 200 "$APP/icons.svg"   "icone"
prova 200 "$APP/index.html"  "pagina"
for f in $(curl -s "$APP/" | grep -oE '/assets/[A-Za-z0-9_.-]+' | sort -u); do
    prova 200 "$APP$f" "asset referenziato dalla pagina"
done

echo "--- deve funzionare: le API rispondono come prima ---"
prova 401 "$APP/api/feedback/schema" "API protetta: 401, non 404"
prova 404 "$APP/api/internal/consumo" "canale interno: chiuso al web"

echo "--- deve rispondere 404: percorsi che non esistono ---"
for p in /webpack-stats.json /secrets.json /credentials.json /telescope/requests \
         /_profiler/open /elmah.axd /graphql /dashboard /console /admin \
         /.env /.env.production.bak /.git/config /.claude.json /nonesistente-xyz; do
    prova 404 "$APP$p" "non esiste"
done

echo "--- la landing non deve essere toccata ---"
for p in / /aiuto.html /tester.html /contatti.html /finanziatori.html /chi-siamo.html /privacy.html; do
    prova 200 "$LAND$p" "pagina della landing"
done
prova 404 "$LAND/.env" "trappola sulla landing"

echo
if [ "$errori" -eq 0 ]; then
    echo "  Tutto come previsto."
else
    echo "  $errori verifiche fallite. NON lasciare la configurazione cosi': ripristina con"
    echo "    cp /root/backup/Caddyfile-prima-fallback /etc/caddy/Caddyfile && systemctl reload caddy"
fi
exit $([ "$errori" -eq 0 ] && echo 0 || echo 1)
