#!/usr/bin/env bash
#
# Verifica della correzione 1: il ripiego della single-page risponde 404 su
# tutto cio' che non e' una rotta vera dell'app.
#
#   bash deploy/verifica-fallback.sh
#
# Da lanciare DOPO il reload di Caddy. Esce con 1 se qualcosa non torna.
#
# Non controlla solo il codice di stato: se il rewrite si rompesse potresti
# ricevere 200 di qualcos'altro. Per le rotte dell'app verifica che il corpo
# contenga davvero il contenitore dell'applicazione, e per il 404 che contenga
# la pagina leggibile invece di una risposta muta.
set -uo pipefail
APP=https://app.neurodesk.it
LAND=https://neurodesk.it
RADICE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
errori=0

ok()      { printf '  ok      %s\n' "$1"; }
fallito() { printf '  FALLITO %s\n' "$1"; errori=$((errori+1)); }

# stato <atteso> <url> [metodo]
stato() {
    local atteso="$1" url="$2" metodo="${3:-GET}" got
    got=$(curl -s -o /dev/null -w '%{http_code}' -X "$metodo" --max-time 15 "$url")
    [ "$got" = "$atteso" ] \
        && ok "$metodo $atteso  ${url#https://}" \
        || fallito "$metodo atteso $atteso ottenuto $got  ${url#https://}"
}

# corpo <stato_atteso> <testo_atteso> <url> <descrizione>
corpo() {
    local atteso="$1" cerca="$2" url="$3" desc="$4" tmp got
    tmp=$(mktemp)
    got=$(curl -s -o "$tmp" -w '%{http_code}' --max-time 15 "$url")
    if [ "$got" != "$atteso" ]; then
        fallito "stato atteso $atteso ottenuto $got  ${url#https://}"
    elif ! grep -q "$cerca" "$tmp"; then
        fallito "stato $got giusto ma il CORPO non contiene «$cerca»  ${url#https://}  ($desc)"
    else
        ok "$atteso + corpo giusto  ${url#https://}  ($desc)"
    fi
    rm -f "$tmp"
}

echo "═══ 1. Divergenza fra App.jsx e la lista bianca di Caddy ═══"
# Se qualcuno aggiunge una rotta a React e dimentica Caddy, la pagina non si
# apre. E' un errore visibile, ma solo a chi visita quella rotta: qui si vede
# sempre, e prima che lo scopra un tester.
APPJSX="$RADICE/frontend/src/App.jsx"
TPL="$RADICE/deploy/Caddyfile.template"
if [ -f "$APPJSX" ] && [ -f "$TPL" ]; then
    rotte_react=$(grep -oE 'path="/[^"*]*"' "$APPJSX" | sed 's/path="//;s/"$//' | sed 's|\(.\)/$|\1|' | sort -u)
    rotte_caddy=$(sed -n '/@rotteApp path/,/handle @rotteApp/p' "$TPL" \
                  | tr ' \\' '\n\n' | grep '^/' | sed 's|\(.\)/$|\1|' | sort -u)
    mancanti=$(comm -23 <(echo "$rotte_react") <(echo "$rotte_caddy"))
    if [ -n "$mancanti" ]; then
        fallito "rotte in App.jsx e NON in @rotteApp:"
        echo "$mancanti" | sed 's/^/            /'
    else
        ok "tutte le rotte di App.jsx sono nella lista bianca ($(echo "$rotte_react" | grep -c . ) rotte)"
    fi
    avanzo=$(comm -13 <(echo "$rotte_react") <(echo "$rotte_caddy"))
    [ -n "$avanzo" ] && printf '  nota    in @rotteApp ma non in App.jsx: %s\n' "$(echo $avanzo)"
else
    fallito "non trovo App.jsx o Caddyfile.template: controllo di divergenza saltato"
fi

echo
echo "═══ 2. Rotte dell'app in diretto, con e senza slash finale ═══"
for r in / /login /consenso /companion /feedback /codici /moduli /moduli/nuovo /task /task/nuovo; do
    corpo 200 '<div id="root">' "$APP$r" "pagina dell'app"
done
for r in /login/ /companion/ /feedback/ /codici/ /task/nuovo/; do
    stato 200 "$APP$r"
done

echo
echo "═══ 3. Comportamento da stabilire, non da dedurre ═══"
stato 200 "$APP/companion" HEAD
stato 200 "$APP/" HEAD
printf '  nota    /Login (maiuscola) risponde %s — Caddy distingue maiuscole e minuscole\n' \
    "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$APP/Login")"

echo
echo "═══ 4. File statici ═══"
stato 200 "$APP/favicon.svg"
stato 200 "$APP/icons.svg"
stato 200 "$APP/index.html"
for f in $(curl -s "$APP/" | grep -oE '/assets/[A-Za-z0-9_.-]+' | sort -u); do
    stato 200 "$APP$f"
done

echo
echo "═══ 5. Le API non devono cambiare ═══"
stato 401 "$APP/api/feedback/schema"
stato 401 "$APP/api/auth/me"
stato 404 "$APP/api/internal/consumo"

echo
echo "═══ 6. Percorsi inesistenti: 404 CON pagina leggibile ═══"
corpo 404 "Questa pagina non c" "$APP/nonesistente-xyz" "404 leggibile"
corpo 404 "Questa pagina non c" "$APP/companion/sottopagina-inventata" "404 leggibile"
for p in /webpack-stats.json /secrets.json /credentials.json /telescope/requests \
         /_profiler/open /elmah.axd /graphql /dashboard /console /admin \
         /.env /.env.production.bak /.git/config /.claude.json /manifest.json \
         /sitemap.xml /.well-known/qualcosa; do
    stato 404 "$APP$p"
done

echo
echo "═══ 7. La landing non deve essere toccata ═══"
for p in / /aiuto.html /tester.html /contatti.html /finanziatori.html /chi-siamo.html /privacy.html; do
    stato 200 "$LAND$p"
done
stato 404 "$LAND/nonesistente-xyz"
stato 404 "$LAND/.env"

echo
if [ "$errori" -eq 0 ]; then
    echo "  Tutto come previsto."
else
    echo "  $errori verifiche fallite. NON lasciare la configurazione cosi':"
    echo "    ssh root@164.132.198.90 'cp /root/backup/Caddyfile-prima-fallback /etc/caddy/Caddyfile && systemctl reload caddy'"
fi
exit $([ "$errori" -eq 0 ] && echo 0 || echo 1)
