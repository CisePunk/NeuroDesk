#!/usr/bin/env python3
"""
NeuroDesk — honeypot: chi bussa, e cosa cerca.

Portato dall'honeypot di Rosa Segnale, con una differenza di posizione e una
di sostanza.

DI POSIZIONE. In Rosa Segnale l'honeypot e' un middleware dell'applicazione.
Qui l'applicazione quelle richieste non le vede mai: davanti c'e' Caddy, che
serve la landing come file statici e rimanda tutto il resto a index.html. Un
filtro dentro Spring avrebbe intercettato quasi niente. Quindi si legge dal log
degli accessi di Caddy, che vede tutto quello che entra su entrambi i domini.

DI SOSTANZA. Rosa Segnale ricava l'IP da cf-connecting-ip / x-real-ip /
x-forwarded-for, cioe' da intestazioni che manda IL CLIENT. Chi scansiona puo'
scriverci quello che vuole e far risultare ogni richiesta come proveniente da un
indirizzo diverso: le impronte non si correlano piu' e il conteggio per
attaccante perde senso. Qui l'indirizzo e' remote_ip, il vero peer TCP visto da
Caddy, che non e' falsificabile dal client.

Come in Rosa Segnale, l'indirizzo NON viene conservato in chiaro: si salva
un'impronta con sale. Serve a dire "questi cento tentativi sono la stessa
persona" senza tenere in casa un elenco di indirizzi IP altrui.

E come in Rosa Segnale: NON blocca. Osserva. Il firewall e il rate limiting
stanno gia' altrove; qui si guarda soltanto, e la decisione resta a una persona.
"""

import hashlib
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

LOG_ACCESSI = Path("/var/log/caddy/access.log")
STATO = Path("/var/lib/neurodesk/honeypot-posizione")
ARCHIVIO = Path("/var/log/neurodesk/honeypot-eventi.jsonl")

# Percorsi che nessun visitatore vero chiede mai. Sono gli stessi che Caddy
# respinge con un 404: qui servono a riconoscerli nel log, non a bloccarli.
TRAPPOLE = re.compile(
    r"^/(wp-admin|wp-login\.php|xmlrpc\.php|wordpress|phpmyadmin|pma"
    r"|\.env|\.git|\.aws|\.ssh|admin|administrator|server-status|server-info"
    r"|cgi-bin|vendor|config\.php|shell|debug|solr|actuator|_ignition|autodiscover)",
    re.IGNORECASE,
)

# Pattern che tradiscono un tentativo di iniezione o di attraversamento.
SOSPETTI = (
    "union%20select", "union select", "select%20from", "' or '1'='1",
    "../", "%2e%2e", "..%2f",
    "<script", "%3cscript", "onerror=", "javascript:",
    "/etc/passwd", "cmd=", "exec(", "eval(",
    "${jndi:", "{{", "<?php",
)

SALE = os.getenv("HONEYPOT_HASH_SALT", "")


def impronta(indirizzo: str) -> str:
    """Impronta dell'indirizzo, non l'indirizzo. Con sale, per non tenere in casa IP altrui."""
    return hashlib.sha256(f"{SALE}:{indirizzo}".encode()).hexdigest()[:16]


def esamina(richiesta: dict, stato: int):
    """Se la richiesta e' sospetta, torna l'evento; altrimenti None."""
    percorso = richiesta.get("uri", "")
    solo_percorso = percorso.split("?", 1)[0]
    completo = percorso.lower()

    if TRAPPOLE.match(solo_percorso):
        motivo, rischio = "percorso_trappola", 4
    elif any(t in completo for t in SOSPETTI):
        motivo, rischio = "pattern_sospetto", 3
    elif stato == 401 and solo_percorso.startswith("/api/auth"):
        # Non e' un attacco di per se': un tester che sbaglia il codice fa
        # esattamente questo. Diventa interessante solo se si ripete molto,
        # e infatti il rischio e' 1: lo si nota nel conteggio, non nel singolo.
        motivo, rischio = "accesso_fallito", 1
    else:
        return None

    return {
        "quando": datetime.fromtimestamp(richiesta.get("_ts", 0), timezone.utc).isoformat(timespec="seconds"),
        "host": richiesta.get("host", "")[:60],
        "percorso": percorso[:300],
        "metodo": richiesta.get("method", "")[:12],
        "motivo": motivo,
        "rischio": rischio,
        "stato": stato,
        # L'IP vero della connessione, non quello dichiarato dal client.
        "impronta_ip": impronta(richiesta.get("remote_ip", "sconosciuto")),
        "agente": (richiesta.get("headers", {}).get("User-Agent") or [""])[0][:200],
    }


def main() -> int:
    if not SALE:
        print("HONEYPOT_HASH_SALT non impostato: senza sale le impronte sono riconducibili.", file=sys.stderr)
        return 1
    if not LOG_ACCESSI.exists():
        print(f"{LOG_ACCESSI} non esiste: Caddy non sta registrando gli accessi.", file=sys.stderr)
        return 1

    # Riprendiamo da dove eravamo. Se il log e' stato ruotato e ora e' piu' corto
    # della posizione salvata, ripartiamo da zero invece di saltare tutto.
    posizione = int(STATO.read_text().strip()) if STATO.exists() else 0
    dimensione = LOG_ACCESSI.stat().st_size
    if dimensione < posizione:
        posizione = 0

    eventi = []
    with LOG_ACCESSI.open(encoding="utf-8", errors="replace") as f:
        f.seek(posizione)
        for riga in f:
            riga = riga.strip()
            if not riga:
                continue
            try:
                voce = json.loads(riga)
            except json.JSONDecodeError:
                continue  # riga troncata dalla rotazione: si salta
            if voce.get("msg") != "handled request":
                continue
            richiesta = voce.get("request", {})
            richiesta["_ts"] = voce.get("ts", 0)
            ev = esamina(richiesta, voce.get("status", 0))
            if ev:
                eventi.append(ev)
        nuova_posizione = f.tell()

    STATO.parent.mkdir(parents=True, exist_ok=True)
    ARCHIVIO.parent.mkdir(parents=True, exist_ok=True)
    if eventi:
        with ARCHIVIO.open("a", encoding="utf-8") as f:
            for ev in eventi:
                f.write(json.dumps(ev, ensure_ascii=False) + "\n")
    # La posizione si sposta solo dopo aver scritto: se qualcosa va storto qui,
    # al giro dopo si rilegge e al massimo si duplica. Meglio di un buco.
    STATO.write_text(str(nuova_posizione))

    if not eventi:
        print("nessun tentativo nuovo")
        return 0

    # Riepilogo per attaccante: e' la vista che serve. Cento richieste da uno
    # solo sono una scansione; una richiesta da cento sono rumore di internet.
    per_impronta = defaultdict(lambda: {"n": 0, "rischio": 0, "percorsi": set(), "agente": ""})
    for ev in eventi:
        r = per_impronta[ev["impronta_ip"]]
        r["n"] += 1
        r["rischio"] = max(r["rischio"], ev["rischio"])
        r["percorsi"].add(ev["percorso"][:60])
        r["agente"] = r["agente"] or ev["agente"]

    righe = [f"{len(eventi)} tentativi da {len(per_impronta)} origini distinte"]
    for imp, r in sorted(per_impronta.items(), key=lambda x: -x[1]["n"]):
        campione = ", ".join(sorted(r["percorsi"])[:4])
        righe.append(f"  [{imp}] {r['n']:>4} richieste, rischio max {r['rischio']} — {campione}")
        if r["agente"]:
            righe.append(f"           agente: {r['agente'][:90]}")
    print("\n".join(righe))

    avvisa(eventi, per_impronta, righe)
    return 0


# Un sito pubblico viene scansionato tutti i giorni: avvisare a ogni tentativo
# significa insegnare a ignorare l'avviso. Si scrive solo per le due cose che
# non sono rumore di fondo.
SOGLIA_SCANSIONE = 40      # richieste da una sola origine in un singolo giro
SOGLIA_ACCESSI = 15        # tentativi di accesso falliti da una sola origine


def avvisa(eventi, per_impronta, righe):
    motivi = []

    iniezioni = [e for e in eventi if e["motivo"] == "pattern_sospetto"]
    if iniezioni:
        motivi.append(f"{len(iniezioni)} tentativi di iniezione (non sono scansioni generiche: "
                      f"qualcuno sta provando input costruiti a mano)")

    for imp, r in per_impronta.items():
        if r["n"] >= SOGLIA_SCANSIONE:
            motivi.append(f"una sola origine [{imp}] ha fatto {r['n']} richieste: e' una scansione mirata")

    falliti = defaultdict(int)
    for e in eventi:
        if e["motivo"] == "accesso_fallito":
            falliti[e["impronta_ip"]] += 1
    for imp, n in falliti.items():
        if n >= SOGLIA_ACCESSI:
            motivi.append(f"{n} tentativi di accesso falliti da [{imp}]: qualcuno sta provando codici")

    if not motivi:
        return

    destinatario = os.getenv("NEURODESK_REPORT_EMAIL", "hello@neurodesk.it")
    corpo = (
        f"To: {destinatario}\n"
        f"From: {destinatario}\n"
        f"Subject: NeuroDesk — attivita' anomala sul sito\n"
        f"Content-Type: text/plain; charset=UTF-8\n\n"
        "L'honeypot ha visto qualcosa che non e' il normale rumore di internet.\n\n"
        + "\n".join(f"  · {m}" for m in motivi)
        + "\n\nDettaglio:\n\n" + "\n".join(righe)
        + "\n\nNessuno e' stato bloccato: l'honeypot osserva e basta.\n"
          "Gli indirizzi sono impronte con sale, non IP in chiaro.\n"
          "Archivio completo: /var/log/neurodesk/honeypot-eventi.jsonl\n"
    )
    import subprocess
    try:
        subprocess.run(["msmtp", "--read-recipients"], input=corpo.encode("utf-8"),
                       check=True, timeout=60)
        print("  -> avviso spedito")
    except Exception as err:  # noqa: BLE001 — l'avviso non deve far fallire la raccolta
        print(f"  -> avviso NON spedito: {err}", file=sys.stderr)


if __name__ == "__main__":
    sys.exit(main())
