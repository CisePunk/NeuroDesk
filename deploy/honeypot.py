#!/usr/bin/env python3
"""
NeuroDesk — honeypot: chi bussa, e cosa cerca.

Legge il log degli accessi di Caddy. Non tocca l'applicazione, non gira nel suo
processo, non importa niente di suo: e' indipendente dallo stack, e la stessa
implementazione servirebbe un backend Spring Boot come uno FastAPI. L'unico
accoppiamento e' al formato del log del reverse proxy.

NON blocca e non limita nessuno. Osserva, e la decisione resta a una persona.


DUE LIVELLI, non uno
────────────────────
  livello          domanda                        fonte
  per richiesta    il percorso e' previsto?       lo stato 404 nel log
  per sessione     il modello e' una scansione?   rapporto, ampiezza, cardinalita'

Il livello per richiesta e' gratis, e questo e' il punto. Da quando Caddy
risponde 404 a tutto cio' che non e' una rotta vera (lista bianca in
Caddyfile.template), "status == 404" E' GIA' la lista bianca: non serve
esportare un elenco di percorsi in un secondo posto, e quindi non c'e' niente
che possa divergere. La lista nera dei percorsi-trappola resta solo per dare un
nome a cosa cercavano, non per decidere se e' sospetto.

Il livello per sessione serve perche' il per-richiesta non distingue chi sbaglia
a digitare da chi enumera: la forma dell'insieme si vede solo guardando insieme
le richieste di una stessa origine.


SOGLIE MISURATE, NON SCELTE
───────────────────────────
Tarate sul traffico reale di questo servizio (log del 29-30 luglio 2026, 1523
richieste, 218 origini). La misura ha smentito due ipotesi:

  · le richieste al secondo NON separano niente. Traffico legittimo fino a
    25,8/s (un browser carica in parallelo), scansioni misurate fino a 15,7.
    Una soglia li' avrebbe colpito i tester e lasciato passare lo scanner.
    Metrica scartata.

  · una soglia sui percorsi non trovati segnalava un iPhone: 10 richieste, 100%
    di 404, tutte per apple-touch-icon e favicon che il sito non serve. Da qui
    la lista di esclusione qui sotto.

LIMITI DICHIARATI, non scoperti dopo:
  · la taratura poggia su UN SOLO caso ostile reale (30 luglio 2026)
  · chi distanzia le richieste oltre FINESTRA_SESSIONE_S resta invisibile al
    livello sessione, per costruzione
  · le classi «legittimo» e «scansione» erano definite dalla stessa metrica che
    poi le convalida: il vuoto osservato e' in parte un artefatto della
    selezione. Va rimisurato quando il traffico cresce.
"""

from __future__ import annotations

import hashlib
import ipaddress
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

LOG_ACCESSI = Path("/var/log/caddy/access.log")
ARCHIVIO = Path("/var/log/neurodesk/honeypot-eventi.jsonl")
STATO = Path("/var/lib/neurodesk")
GIA_AVVISATE = STATO / "honeypot-sessioni-avvisate"

# Quanto indietro guardare a ogni giro. Il servizio gira ogni 15 minuti: 90
# minuti di finestra fa si' che una sessione a cavallo di due esecuzioni venga
# valutata intera almeno una volta.
FINESTRA_LETTURA_MIN = 90
FINESTRA_SESSIONE_S = 120
GIORNI_ARCHIVIO = 90

# ─── Livello per sessione: soglie ────────────────────────────────────────────
# A) scansioni ampie. Serve anche un minimo di percorsi DISTINTI non trovati:
#    una scansione esplora, e insistere su un solo file mancante e' l'opposto.
#    Senza questo minimo, un client che ripeteva 6 volte /site.js (percorso
#    relativo risolto male, non un attacco) faceva scattare l'allarme con 1
#    solo percorso distinto. I casi ostili misurati ne avevano 24 e 164.
SOGLIA_A_404PC, SOGLIA_A_N, SOGLIA_A_PERCORSI = 25, 10, 3
# B) sonde piccole e mirate. Cinque percorsi distinti non trovati: sul traffico
#    misurato il legittimo si ferma a ZERO, quindi il margine e' totale.
SOGLIA_B_PERCORSI, SOGLIA_B_404PC = 5, 80
# C) enumerazione di identificativi. Serve perche' la normalizzazione qui sotto
#    fa apparire /api/companion-sessions/1..500 come UN SOLO percorso distinto:
#    senza contare la cardinalita', chi itera diventerebbe invisibile.
SOGLIA_C_IDENTIFICATIVI = 20

# ─── Percorsi che NON contano nel rapporto dei 404 ───────────────────────────
# Un client corretto li chiede senza che nessuno gliel'abbia detto. La lista e'
# deliberatamente CHIUSA e MINIMA: ogni voce e' un punto cieco, e questo
# repository e' pubblico. Criterio per aggiungerne una: il client la chiede
# davvero senza indizi?
#
# Escluse di proposito: manifest.json e site.webmanifest (un browser li chiede
# solo se linkati nell'HTML), sitemap.xml, ads.txt, security.txt (convenzioni
# di crawler, non di browser).
CONVENZIONE = re.compile(
    r"^/(favicon\.ico|favicon\.png|apple-touch-icon[^/]*\.png|robots\.txt|browserconfig\.xml)$",
    re.IGNORECASE,
)

# ─── Normalizzazione delle URI ───────────────────────────────────────────────
# /api/companion-sessions/11 diventa /api/companion-sessions/{id}.
#
# Non e' cosmesi: senza, l'archivio conserverebbe una cronologia di QUALE
# conversazione e' stata riaperta e QUANDO. Il contenuto e' cifrato e non passa
# di qui, ma quel metadato lega un istante a una conversazione precisa. A un
# rilevamento non serve il numero, serve il modello.
#
# Il numero non si perde del tutto: viene contato (vedi cardinalita').
NORMALIZZA = [
    (re.compile(r"^/api/tester/(\d+)(/.*)?$"),          lambda m: ("/api/tester/{id}" + (m.group(2) or ""), m.group(1))),
    (re.compile(r"^/api/companion-sessions/(\d+)$"),    lambda m: ("/api/companion-sessions/{id}", m.group(1))),
    (re.compile(r"^/api/internal/utente/(\d+)/stato$"), lambda m: ("/api/internal/utente/{id}/stato", m.group(1))),
    (re.compile(r"^/assets/([A-Za-z0-9_-]+)-[A-Za-z0-9_-]{6,}\.(js|css|map)$"),
     lambda m: (f"/assets/{m.group(1)}-{{hash}}.{m.group(2)}", None)),
]

# Percorsi-trappola: NON decidono piu' se una richiesta e' sospetta (lo fa il
# 404). Servono solo a dire cosa cercava chi ha bussato.
TRAPPOLE = re.compile(
    r"^/(wp-admin|wp-login\.php|xmlrpc\.php|wordpress|phpmyadmin|pma"
    r"|\.env|\.git|\.aws|\.ssh|\.claude|\.codex|\.cursor|\.continue|\.aider|\.config/anthropic"
    r"|admin|administrator|server-status|server-info|cgi-bin|vendor|config\.php"
    r"|shell|debug|solr|actuator|_ignition|autodiscover|telescope|_profiler|_debugbar"
    r"|elmah\.axd|trace\.axd|secrets?\.|credentials?\.|service-account|serviceAccountKey"
    r"|firebase-adminsdk|key\.json|\.npmrc|\.s3cfg|\.boto|\.docker)",
    re.IGNORECASE,
)
INIEZIONE = (
    "union%20select", "union select", "select%20from", "' or '1'='1",
    "../", "%2e%2e", "..%2f", "<script", "%3cscript", "onerror=", "javascript:",
    "/etc/passwd", "cmd=", "exec(", "eval(", "${jndi:", "<?php",
)

# Origini note: la tua connessione di casa, e qualunque altra da cui provi tu.
# Gli eventi da qui finiscono COMUNQUE nell'archivio, marcati "origine_nota":
# non si nasconde niente. Semplicemente non fanno suonare la mail, perche' un
# allarme che scatta ogni volta che provi qualcosa smette di essere un allarme.
#
# Sta nella configurazione del SERVER, non in questo file: un elenco di origini
# fidate in un repository pubblico direbbe a chiunque quali indirizzi non fanno
# scattare niente. Formato: indirizzi o reti separati da virgola, es.
#   HONEYPOT_ORIGINI_NOTE=2a01:e11:800f:ad00::/64,203.0.113.7
ORIGINI_NOTE = [
    x.strip() for x in os.getenv("HONEYPOT_ORIGINI_NOTE", "").split(",") if x.strip()
]

# ─── Canary ──────────────────────────────────────────────────────────────────
# Percorsi disseminati come briciola nel robots.txt: un percorso dal nome ghiotto
# che un visitatore vero non chiede MAI, ma che un attaccante trova leggendo
# robots.txt in cerca di porte nascoste. Qualunque richiesta qui e' un segnale
# forte da sola — non serve la forma di una sessione. Deve combaciare con la riga
# Disallow in frontend/public/robots.txt.
#
# Sta nel repository come i percorsi-trappola, non fra i segreti: un attaccante
# che legge il codice sa di evitarlo, ma cattura comunque scanner e curiosi che
# leggono robots.txt senza leggere il repo — che e' la minaccia reale.
CANARY = ("/internal-admin-metrics",)

SALE = os.getenv("HONEYPOT_HASH_SALT", "")
# Identificativo dell'epoca del sale. OBBLIGATORIO: senza, confrontando impronte
# di epoche diverse si otterrebbe silenziosamente "origini diverse" dove era la
# stessa. Non e' il sale — e' solo un'etichetta per sapere cosa e' confrontabile.
EPOCA = os.getenv("HONEYPOT_SALT_EPOCA", "sconosciuta")


def impronta(indirizzo: str) -> str:
    """Impronta con sale, non l'indirizzo.

    Serve a dire "questi cento tentativi sono la stessa origine" senza tenere in
    casa un elenco di indirizzi altrui. NON protegge da chi prende il server:
    sale e archivio stanno sulla stessa macchina. Protegge dalla divulgazione
    accidentale dell'archivio da solo — che e' un rischio diverso e reale.
    La rotazione del sale limita il raggio: chi prende il file oggi non risale
    alle impronte di due mesi fa.
    """
    return hashlib.sha256(f"{SALE}:{indirizzo}".encode()).hexdigest()[:16]


def origine(ip: str) -> str:
    """IPv6 raggruppato per /64.

    Un singolo abbonato cambia identificativo di interfaccia e si spezzerebbe in
    piu' attori: sul log del 29-30 luglio, quattro interfacce dello stesso /64
    risultavano quattro origini distinte.
    """
    try:
        indirizzo = ipaddress.ip_address(ip)
    except ValueError:
        return ip
    if indirizzo.version == 6:
        return str(ipaddress.ip_network(f"{ip}/64", strict=False))
    return ip


def e_nota(org: str) -> bool:
    """L'origine e' una di quelle da cui proviamo noi?"""
    for voce in ORIGINI_NOTE:
        if org == voce:
            return True
        try:
            rete = ipaddress.ip_network(voce, strict=False)
            # org puo' gia' essere una rete (/64) o un indirizzo singolo.
            altro = ipaddress.ip_network(org, strict=False)
            if altro.subnet_of(rete) if altro.version == rete.version else False:
                return True
        except ValueError:
            continue
    return False


def e_canary(percorso: str) -> bool:
    return any(percorso == c or percorso.startswith(c + "/") for c in CANARY)


def normalizza(uri: str):
    """(percorso normalizzato, identificativo estratto o None)."""
    percorso = uri.split("?", 1)[0]
    for regola, trasforma in NORMALIZZA:
        trovato = regola.match(percorso)
        if trovato:
            return trasforma(trovato)
    return percorso, None


def motivo(percorso: str, uri: str) -> str:
    """A cosa mirava. Non decide se e' sospetto: quello lo dice il 404."""
    if any(t in uri.lower() for t in INIEZIONE):
        return "iniezione"
    if TRAPPOLE.match(percorso):
        return "credenziali_o_pannelli"
    return "percorso_inesistente"


def leggi_finestra():
    """Le richieste degli ultimi FINESTRA_LETTURA_MIN minuti."""
    if not LOG_ACCESSI.exists():
        print(f"{LOG_ACCESSI} non esiste: Caddy non registra gli accessi.", file=sys.stderr)
        return None
    soglia = (datetime.now(timezone.utc) - timedelta(minutes=FINESTRA_LETTURA_MIN)).timestamp()
    fuori = []
    with LOG_ACCESSI.open(encoding="utf-8", errors="replace") as f:
        for riga in f:
            riga = riga.strip()
            if not riga:
                continue
            try:
                voce = json.loads(riga)
            except json.JSONDecodeError:
                continue  # riga troncata dalla rotazione
            if voce.get("msg") != "handled request" or voce.get("ts", 0) < soglia:
                continue
            richiesta = voce.get("request", {})
            uri = richiesta.get("uri", "")
            percorso, identificativo = normalizza(uri)
            fuori.append({
                "ts": voce["ts"],
                "origine": origine(richiesta.get("remote_ip", "?")),
                "host": richiesta.get("host", ""),
                "metodo": richiesta.get("method", ""),
                "uri_grezza": uri,
                "percorso": percorso,
                "identificativo": identificativo,
                "stato": voce.get("status", 0),
                "agente": (richiesta.get("headers", {}).get("User-Agent") or [""])[0][:200],
            })
    return fuori


def sessioni(richieste):
    """Raggruppa per origine, spezzando dopo FINESTRA_SESSIONE_S di silenzio."""
    per_origine = defaultdict(list)
    for r in richieste:
        per_origine[r["origine"]].append(r)
    fuori = []
    for org, rs in per_origine.items():
        rs.sort(key=lambda x: x["ts"])
        corrente = [rs[0]]
        for prima, dopo in zip(rs, rs[1:]):
            if dopo["ts"] - prima["ts"] > FINESTRA_SESSIONE_S:
                fuori.append((org, corrente))
                corrente = [dopo]
            else:
                corrente.append(dopo)
        fuori.append((org, corrente))
    return fuori


def valuta(rs):
    """Metriche di una sessione, o None se resta vuota dopo l'esclusione."""
    utili = [r for r in rs if not CONVENZIONE.match(r["percorso"])]
    if not utili:
        return None
    mancanti = [r for r in utili if r["stato"] == 404]
    # Cardinalita': quanti identificativi DISTINTI per rotta. Cardinalita' si,
    # identita' no — contiamo quanti, non quali.
    per_rotta = defaultdict(set)
    for r in utili:
        if r["identificativo"]:
            per_rotta[r["percorso"]].add(r["identificativo"])
    max_ident = max((len(v) for v in per_rotta.values()), default=0)

    return {
        "richieste": len(utili),
        "durata_s": round(utili[-1]["ts"] - utili[0]["ts"], 2),
        "pc404": round(100 * len(mancanti) / len(utili), 1),
        "percorsi404": len(set(r["percorso"] for r in mancanti)),
        "max_identificativi_per_rotta": max_ident,
        "rotte_enumerate": {k: len(v) for k, v in per_rotta.items() if len(v) >= SOGLIA_C_IDENTIFICATIVI},
        "motivi": {m: sum(1 for r in mancanti if motivo(r["percorso"], r["uri_grezza"]) == m)
                   for m in ("iniezione", "credenziali_o_pannelli", "percorso_inesistente")},
        "host": sorted(set(r["host"] for r in utili)),
        "agente": utili[0]["agente"],
        "inizio": datetime.fromtimestamp(utili[0]["ts"], timezone.utc).isoformat(timespec="seconds"),
        "campione": sorted(set(r["percorso"][:70] for r in mancanti))[:12],
    }


def inneschi(m):
    """Quali condizioni scattano. Vuoto = niente da segnalare."""
    fuori = []
    if (m["pc404"] >= SOGLIA_A_404PC and m["richieste"] >= SOGLIA_A_N
            and m["percorsi404"] >= SOGLIA_A_PERCORSI):
        fuori.append("A_scansione_ampia")
    if m["percorsi404"] >= SOGLIA_B_PERCORSI and m["pc404"] >= SOGLIA_B_404PC:
        fuori.append("B_sonda_mirata")
    if m["max_identificativi_per_rotta"] >= SOGLIA_C_IDENTIFICATIVI:
        fuori.append("C_enumerazione")
    return fuori


def _applescript_sicuro(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def avvisa(eventi):
    destinatario = os.getenv("NEURODESK_REPORT_EMAIL", "hello@neurodesk.it")
    canary = [e for e in eventi if e.get("tipo") == "canary"]
    sessioni_ev = [e for e in eventi if e.get("tipo") != "canary"]

    righe = []
    if canary:
        righe.append("  ⚠ CANARY — qualcuno ha seguito una briciola nascosta in robots.txt.")
        righe.append("    Non e' rumore di scansione: quel percorso non lo chiede nessuno per caso.")
        for e in canary:
            righe.append(f"    origine [{e['impronta']}]  ha chiesto  {e['canary_percorso']}")
            righe.append(f"    quando: {e['quando']}   host: {e['host']}   agente: {e['agente'][:80]}")
        righe.append("")
    for e in sessioni_ev:
        m = e["metriche"]
        righe.append(f"  origine [{e['impronta']}]  ({', '.join(e['inneschi'])})")
        righe.append(f"    {m['richieste']} richieste in {m['durata_s']}s, {m['pc404']}% non trovate, "
                     f"{m['percorsi404']} percorsi distinti")
        if m["rotte_enumerate"]:
            for rotta, quanti in m["rotte_enumerate"].items():
                righe.append(f"    ENUMERAZIONE: {quanti} identificativi distinti su {rotta}")
        att = {k: v for k, v in m["motivi"].items() if v}
        if att:
            righe.append(f"    cercava: {', '.join(f'{k} ({v})' for k, v in att.items())}")
        righe.append(f"    host: {', '.join(m['host'])}   agente: {m['agente'][:80]}")
        for p in m["campione"][:6]:
            righe.append(f"      {p}")
        righe.append("")

    corpo = (
        f"To: {destinatario}\nFrom: {destinatario}\n"
        f"Subject: {'NeuroDesk — CANARY: briciola seguita' if any(e.get('tipo')=='canary' for e in eventi) else 'NeuroDesk — attivita anomala sul sito'}\n"
        f"Content-Type: text/plain; charset=UTF-8\n\n"
        "Il rilevamento ha visto qualcosa che non e' il normale rumore di internet.\n\n"
        + "\n".join(righe)
        + "\nNessuno e' stato bloccato: si osserva e basta.\n"
          "Gli indirizzi sono impronte con sale, non indirizzi in chiaro.\n"
          f"Epoca del sale: {EPOCA} (le impronte si confrontano solo dentro la stessa epoca).\n"
          f"Archivio: {ARCHIVIO}\n"
    )
    try:
        subprocess.run(["msmtp", "--read-recipients"], input=corpo.encode("utf-8"),
                       check=True, timeout=60)
        print("  -> avviso spedito")
    except Exception as err:  # noqa: BLE001 — l'avviso non deve far fallire la raccolta
        print(f"  -> avviso NON spedito: {err}", file=sys.stderr)


def pota_archivio():
    """Toglie dall'archivio gli eventi piu' vecchi di GIORNI_ARCHIVIO.

    Prima non ruotava: avevo dato la scadenza al log di Caddy e dimenticato il
    mio stesso archivio, che cresceva senza limite.
    """
    if not ARCHIVIO.exists():
        return 0
    soglia = datetime.now(timezone.utc) - timedelta(days=GIORNI_ARCHIVIO)
    tenuti, tolti = [], 0
    for riga in ARCHIVIO.read_text(encoding="utf-8", errors="replace").splitlines():
        if not riga.strip():
            continue
        try:
            if datetime.fromisoformat(json.loads(riga)["quando"]) >= soglia:
                tenuti.append(riga)
            else:
                tolti += 1
        except Exception:  # noqa: BLE001 — riga illeggibile: si tiene, non si perde
            tenuti.append(riga)
    if tolti:
        ARCHIVIO.write_text("\n".join(tenuti) + "\n", encoding="utf-8")
    return tolti


def main() -> int:
    if not SALE:
        print("HONEYPOT_HASH_SALT non impostato: senza sale le impronte sono riconducibili.",
              file=sys.stderr)
        return 1
    STATO.mkdir(parents=True, exist_ok=True)
    ARCHIVIO.parent.mkdir(parents=True, exist_ok=True)

    richieste = leggi_finestra()
    if richieste is None:
        return 1

    gia = set(GIA_AVVISATE.read_text(encoding="utf-8").split()) if GIA_AVVISATE.exists() else set()
    nuovi, chiavi = [], set()

    # CANARY: un colpo solo basta. Chi tocca un percorso disseminato in
    # robots.txt ha cercato porte nascoste e ne ha seguita una. Non e' rumore,
    # e non passa per le soglie di sessione.
    for r in richieste:
        if not e_canary(r["percorso"]):
            continue
        org = r["origine"]
        imp = impronta(org)
        chiave = f"canary:{EPOCA}:{imp}:{int(r['ts'])}"
        chiavi.add(chiave)
        if chiave in gia or e_nota(org):
            continue
        nuovi.append({
            "quando": datetime.fromtimestamp(r["ts"], timezone.utc).isoformat(timespec="seconds"),
            "epoca_sale": EPOCA,
            "impronta": imp,
            "tipo": "canary",
            "origine_nota": False,
            "canary_percorso": r["percorso"],
            "agente": r["agente"],
            "host": r["host"],
        })

    for org, rs in sessioni(richieste):
        m = valuta(rs)
        if not m:
            continue
        scattate = inneschi(m)
        if not scattate:
            continue
        imp = impronta(org)
        # Una sessione si segnala una volta sola, anche se ricade in piu' letture.
        chiave = f"{EPOCA}:{imp}:{int(rs[0]['ts'])}"
        chiavi.add(chiave)
        if chiave in gia:
            continue
        nuovi.append({
            "quando": m["inizio"],
            "epoca_sale": EPOCA,
            "impronta": imp,
            "origine_nota": e_nota(org),
            "inneschi": scattate,
            "metriche": m,
        })

    tolti = pota_archivio()
    if nuovi:
        with ARCHIVIO.open("a", encoding="utf-8") as f:
            for e in nuovi:
                f.write(json.dumps(e, ensure_ascii=False) + "\n")
    # Il segnalibro si aggiorna sempre, tenendo anche le chiavi ancora nella
    # finestra: cosi' una sessione lunga non viene segnalata due volte.
    GIA_AVVISATE.write_text("\n".join(sorted(chiavi | (gia & chiavi))) + "\n", encoding="utf-8")

    print(f"finestra: {len(richieste)} richieste, {len(set(r['origine'] for r in richieste))} origini")
    if tolti:
        print(f"archivio potato: {tolti} eventi oltre {GIORNI_ARCHIVIO} giorni")
    if not nuovi:
        print("nessuna sessione anomala nuova")
        return 0

    for e in nuovi:
        if e.get("tipo") == "canary":
            print(f"  [{e['impronta']}] CANARY seguito: {e['canary_percorso']}")
            continue
        m = e["metriche"]
        marca = "  [origine nota: nessuna mail]" if e["origine_nota"] else ""
        print(f"  [{e['impronta']}] {', '.join(e['inneschi'])}: {m['richieste']} richieste, "
              f"{m['pc404']}% non trovate, {m['percorsi404']} percorsi{marca}")

    # Si avvisa solo per le origini che non siamo noi. Le altre restano
    # nell'archivio: registrate, non annunciate.
    da_avvisare = [e for e in nuovi if not e["origine_nota"]]
    if da_avvisare:
        avvisa(da_avvisare)
    else:
        print("  nessuna mail: tutte le sessioni vengono da origini note")
    return 0


if __name__ == "__main__":
    sys.exit(main())
