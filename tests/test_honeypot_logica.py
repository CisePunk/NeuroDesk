"""
Test della logica dell'honeypot. Nessuna rete: gira in un decimo di secondo.

Blocca ogni decisione di taratura presa il 30 luglio 2026, e in particolare i
tre falsi positivi trovati provando dal vivo — se un domani una modifica li
reintroduce, questi test diventano rossi:

  · l'iPhone che chiedeva la propria icona (favicon/apple-touch-icon)
  · il client che ripeteva /site.js (percorso relativo risolto male)
  · la porta 8080 «esposta» (loopback IPv6-mappato) — non e' honeypot ma stessa
    lezione: un allarme che scatta su un caso innocente non serve

Carica deploy/honeypot.py per percorso, cosi' non serve installarlo come pacchetto.
"""

import importlib.util
import os
import pathlib

os.environ.setdefault("HONEYPOT_HASH_SALT", "test-salt")
os.environ.setdefault("HONEYPOT_SALT_EPOCA", "test")

_PATH = pathlib.Path(__file__).resolve().parents[1] / "deploy" / "honeypot.py"
_spec = importlib.util.spec_from_file_location("honeypot", _PATH)
hp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(hp)


def richiesta(percorso, stato=200, ident=None, ts=0.0, uri=None):
    """Una riga di richiesta come la costruisce leggi_finestra()."""
    return {
        "ts": ts, "origine": "x", "host": "app.neurodesk.it", "metodo": "GET",
        "uri_grezza": uri if uri is not None else percorso,
        "percorso": percorso, "identificativo": ident, "stato": stato, "agente": "test",
    }


def sessione_da(coppie):
    """coppie: lista di (percorso, stato[, ident]). Timestamp incrementali."""
    fuori = []
    for i, c in enumerate(coppie):
        percorso, stato = c[0], c[1]
        ident = c[2] if len(c) > 2 else None
        fuori.append(richiesta(percorso, stato, ident, ts=float(i)))
    return fuori


# ─── Normalizzazione ─────────────────────────────────────────────────────────

def test_normalizza_sessione_diventa_id():
    assert hp.normalizza("/api/companion-sessions/11") == ("/api/companion-sessions/{id}", "11")

def test_normalizza_tester_con_coda():
    assert hp.normalizza("/api/tester/5/stato") == ("/api/tester/{id}/stato", "5")

def test_normalizza_asset_con_hash():
    assert hp.normalizza("/assets/index-CjpTgGBi.js") == ("/assets/index-{hash}.js", None)

def test_normalizza_percorso_normale_passa_intatto():
    assert hp.normalizza("/companion") == ("/companion", None)

def test_normalizza_toglie_la_query():
    perc, _ = hp.normalizza("/cerca?q=segreto")
    assert perc == "/cerca"


# ─── Origine: IPv6 raggruppato per /64 ───────────────────────────────────────

def test_ipv6_raggruppato_per_64():
    a = "2a01:e11:800f:ad00:1c08:d7f4:e2ea:6d6d"
    b = "2a01:e11:800f:ad00:2db2:f51b:4dd2:0a8e"
    assert hp.origine(a) == hp.origine(b) == "2a01:e11:800f:ad00::/64"

def test_ipv4_resta_indirizzo_singolo():
    assert hp.origine("34.150.133.136") == "34.150.133.136"


# ─── Origini note (rete di casa): non fanno scattare la mail ─────────────────

def test_origine_nota(monkeypatch):
    monkeypatch.setattr(hp, "ORIGINI_NOTE", ["2a01:e11:800f:ad00::/64", "203.0.113.7"])
    assert hp.e_nota("2a01:e11:800f:ad00::/64") is True
    assert hp.e_nota("2a01:e11:800f:ad00:1c08:d7f4:e2ea:6d6d") is True   # dentro la rete
    assert hp.e_nota("2a01:e11:800f:ad01::/64") is False                 # rete adiacente
    assert hp.e_nota("203.0.113.7") is True
    assert hp.e_nota("203.0.113.8") is False
    assert hp.e_nota("34.150.133.136") is False                          # lo scanner del 30/07


# ─── Canary: la briciola in robots.txt ───────────────────────────────────────

def test_canary_riconosciuto():
    assert hp.e_canary("/internal-admin-metrics") is True
    assert hp.e_canary("/internal-admin-metrics/qualcosa") is True

def test_canary_non_scatta_su_percorsi_normali():
    assert hp.e_canary("/companion") is False
    assert hp.e_canary("/api/tester") is False


# ─── Le tre condizioni di sessione ──────────────────────────────────────────

def test_scanner_ampio_scatta_A_e_B():
    # 200 percorsi distinti, tutti non trovati (come la scansione del 30/07)
    rs = sessione_da([(f"/{i}.php", 404) for i in range(200)])
    m = hp.valuta(rs)
    inn = hp.inneschi(m)
    assert "A_scansione_ampia" in inn
    assert "B_sonda_mirata" in inn

def test_sonda_piccola_scatta_solo_B():
    # 5 percorsi distinti non trovati, meno di 10 richieste: A non basta, B si'
    rs = sessione_da([("/.env", 404), ("/.aws/credentials", 404), ("/secrets.json", 404),
                      ("/.git/config", 404), ("/config.php", 404)])
    inn = hp.inneschi(hp.valuta(rs))
    assert inn == ["B_sonda_mirata"]

def test_enumerazione_scatta_C():
    # 25 identificativi distinti sulla stessa rotta
    rs = sessione_da([("/api/companion-sessions/{id}", 404, str(i)) for i in range(25)])
    assert "C_enumerazione" in hp.inneschi(hp.valuta(rs))


# ─── I tre falsi positivi: NON devono scattare ──────────────────────────────

def test_iphone_che_cerca_la_propria_icona_non_scatta():
    # 10 richieste, tutte 404, ma solo a favicon/apple-touch-icon: convenzione.
    rs = sessione_da([("/apple-touch-icon.png", 404), ("/apple-touch-icon-120x120.png", 404),
                      ("/apple-touch-icon-precomposed.png", 404), ("/favicon.ico", 404)] * 3)
    assert hp.valuta(rs) is None   # svuotata dall'esclusione: niente da valutare

def test_site_js_ripetuto_non_scatta():
    # 6 volte /site.js (un solo percorso distinto) + 4 pagine vere: il difetto
    # che avevo introdotto e corretto rendendo la condizione A esigente sull'ampiezza.
    rs = sessione_da([("/site.js", 404)] * 6 + [("/", 200), ("/aiuto.html", 200),
                                                ("/tester.html", 200), ("/chi-siamo.html", 200)])
    assert hp.inneschi(hp.valuta(rs)) == []

def test_tester_normale_non_scatta():
    # Uso vero: molte pagine e asset, quasi nessun 404.
    rs = sessione_da([("/", 200), ("/companion", 200), ("/assets/index-{hash}.js", 200),
                      ("/assets/index-{hash}.css", 200), ("/api/companion-sessions/{id}", 200, "1"),
                      ("/feedback", 200), ("/favicon.svg", 200)] * 3)
    assert hp.inneschi(hp.valuta(rs)) == []


# ─── I percorsi di convenzione non contano nei 404 ──────────────────────────

def test_convenzione_esclusa_dal_conteggio():
    rs = sessione_da([("/favicon.ico", 404), ("/robots.txt", 404), ("/companion", 200)])
    m = hp.valuta(rs)
    # una sola richiesta utile (/companion, 200): zero percorsi non trovati
    assert m["percorsi404"] == 0
