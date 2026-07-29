#!/usr/bin/env python3
"""
NeuroDesk — porta i backup fuori dal server, sul Mac.

Perche' serve: le copie del database stanno sullo stesso disco del database.
/dev/sda1 per tutti e due. Un guasto, un incidente del fornitore o qualcuno che
entra e cancella se le porta via insieme all'originale. Una seconda copia nello
stesso cassetto non e' un backup.

COSA NON SCARICA, DI PROPOSITO: la chiave che cifra le conversazioni
(NEURODESK_CRYPTO_SECRET). Quella deve stare in Bitwarden, a mano, e NON qui
accanto ai backup. Il senso della cifratura e' che chi si porta via i dati non
possa leggerli: se chiave e dati viaggiassero insieme e finissero nella stessa
cartella, un portatile rubato darebbe entrambe le cose in una volta sola. Sono
due cose che devono stare in due posti diversi, e questa e' quella automatica.

Non serve niente di installato: solo Python e ssh, che il Mac ha gia'.

Uso:
    python3 scarica-backup.py              scarica quello che manca
    python3 scarica-backup.py --controlla  verifica soltanto, non scarica

Per farlo girare da solo ogni giorno, vedi it.neurodesk.backup.plist.
"""

# Rende le annotazioni di tipo semplici stringhe, valutate solo se qualcuno le
# chiede. Serve perche' il python3 di sistema del Mac e' piu' vecchio di quello
# della shell e non capisce "str | None": senza questa riga il lavoro programmato
# fallisce ogni giorno, mentre lanciato a mano funziona. Il tipo di errore che si
# scopre solo provando davvero l'automazione, non lo script.
from __future__ import annotations

import argparse
import gzip
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

SERVER = "root@164.132.198.90"
CARTELLA_REMOTA = "/var/backups/neurodesk"
# NON sulla Scrivania: macOS protegge Scrivania, Documenti e Download, e un
# lavoro programmato che gira in background li' riceve "Operation not permitted".
# Fallirebbe ogni giorno alle 10:00 senza dire niente — cioe' il modo peggiore
# in cui puo' rompersi un backup. Qui dentro invece puo' scrivere.
CARTELLA_LOCALE = Path.home() / "Library/Application Support/NeuroDesk/backup"
REGISTRO = CARTELLA_LOCALE / "registro.txt"

# Quante copie tenere qui. Sono 16 kB l'una: novanta giorni occupano meno di una
# fotografia, e avere indietro tre mesi vale piu' del posto che costa.
GIORNI_DA_TENERE = 90

# Il server fa la sua copia ogni giorno alle 06:25 UTC. Se la piu' recente ha
# piu' di 36 ore, il backup sul server si e' fermato e nessuno se ne e' accorto:
# e' un guasto silenzioso, ed e' esattamente quello che va detto ad alta voce.
ORE_PRIMA_DI_PREOCCUPARSI = 36

# Tabelle che un dump valido deve contenere. Solo quelle che ci sono SEMPRE STATE:
# mettere qui una tabella nuova (companion_consumo, nata il 28 luglio 2026) fa
# fallire la verifica su tutti i backup precedenti alla sua creazione, che sono
# perfettamente validi. Il controllo serve a riconoscere un file troncato, non a
# pretendere che il passato somigli al presente.
TABELLE_ATTESE = ("utenti", "companion_sessioni", "companion_messaggi")


def _testo_applescript(s: str) -> str:
    """AppleScript vuole virgolette doppie e non sopporta il repr di Python."""
    pulito = s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
    return '"' + pulito + '"'


def avvisa(titolo: str, testo: str) -> None:
    """Notifica di macOS: se qualcosa non va, deve saltare all'occhio senza aprire un log."""
    try:
        subprocess.run(
            ["osascript", "-e",
             f"display notification {_testo_applescript(testo)} "
             f"with title {_testo_applescript(titolo)} sound name \"Basso\""],
            check=False, timeout=10, capture_output=True,
        )
    except Exception:
        pass  # su un sistema non-Mac semplicemente non c'e' la notifica


def scrivi(msg: str) -> None:
    riga = f"{datetime.now():%Y-%m-%d %H:%M}  {msg}"
    print(riga)
    try:
        CARTELLA_LOCALE.mkdir(parents=True, exist_ok=True)
        with REGISTRO.open("a", encoding="utf-8") as f:
            f.write(riga + "\n")
    except OSError:
        pass


def elenco_remoto() -> list[tuple[str, int]]:
    """[(nome, secondi_epoch)] dei backup presenti sul server."""
    r = subprocess.run(
        ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=20", SERVER,
         f"stat -c '%n|%Y' {CARTELLA_REMOTA}/*.sql.gz 2>/dev/null || true"],
        capture_output=True, text=True, timeout=90,
    )
    if r.returncode != 0:
        raise RuntimeError(f"non riesco a collegarmi al server: {r.stderr.strip()[:200]}")
    voci = []
    for riga in r.stdout.splitlines():
        if "|" not in riga:
            continue
        percorso, ts = riga.rsplit("|", 1)
        voci.append((Path(percorso).name, int(ts)))
    return sorted(voci, key=lambda x: x[1])


def verifica(percorso: Path) -> str | None:
    """None se il file va bene, altrimenti il motivo per cui non va bene."""
    try:
        with gzip.open(percorso, "rt", encoding="utf-8", errors="replace") as f:
            testo = f.read()
    except (OSError, EOFError, gzip.BadGzipFile) as err:
        return f"file illeggibile o troncato ({err})"
    mancanti = [t for t in TABELLE_ATTESE if f"CREATE TABLE `{t}`" not in testo]
    if mancanti:
        return "dump incompleto, mancano: " + ", ".join(mancanti)
    if len(testo) < 2000:
        return f"dump sospettosamente piccolo ({len(testo)} caratteri)"
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description="Scarica i backup di NeuroDesk sul Mac.")
    ap.add_argument("--controlla", action="store_true",
                    help="verifica soltanto quello che c'e' gia', senza scaricare")
    argomenti = ap.parse_args()

    CARTELLA_LOCALE.mkdir(parents=True, exist_ok=True)

    try:
        remoti = elenco_remoto()
    except Exception as err:
        scrivi(f"ERRORE: {err}")
        avvisa("NeuroDesk — backup non scaricato", str(err)[:150])
        return 1

    if not remoti:
        scrivi("ERRORE: sul server non c'e' nessun backup")
        avvisa("NeuroDesk — nessun backup sul server", "La copia giornaliera non sta girando.")
        return 1

    # Il backup del server si e' fermato senza dirlo a nessuno?
    piu_recente = datetime.fromtimestamp(remoti[-1][1])
    eta = datetime.now() - piu_recente
    if eta > timedelta(hours=ORE_PRIMA_DI_PREOCCUPARSI):
        ore = int(eta.total_seconds() // 3600)
        scrivi(f"ATTENZIONE: il backup piu' recente sul server ha {ore} ore ({remoti[-1][0]})")
        avvisa("NeuroDesk — backup del server fermo",
               f"L'ultima copia ha {ore} ore. Controlla /etc/cron.daily/neurodesk-dump")

    if argomenti.controlla:
        locali = sorted(CARTELLA_LOCALE.glob("*.sql.gz"))
        scrivi(f"controllo di {len(locali)} copie locali")
        rotti = [(f.name, m) for f in locali if (m := verifica(f))]
        for nome, motivo in rotti:
            scrivi(f"  ROTTO  {nome}: {motivo}")
        if rotti:
            avvisa("NeuroDesk — backup danneggiati", f"{len(rotti)} copie non sono valide.")
            return 1
        scrivi(f"  tutte valide, la piu' recente e' {locali[-1].name}" if locali else "  nessuna copia locale")
        return 0

    # Scarico solo quello che manca: il traffico e' irrilevante, ma cosi' il
    # registro dice davvero cosa e' cambiato invece di ripetere ogni volta tutto.
    da_prendere = [n for n, _ in remoti if not (CARTELLA_LOCALE / n).exists()]
    if not da_prendere:
        scrivi(f"gia' allineato ({len(remoti)} copie, l'ultima e' {remoti[-1][0]})")
        return 0

    scaricati, falliti = [], []
    for nome in da_prendere:
        destinazione = CARTELLA_LOCALE / nome
        temporaneo = destinazione.with_suffix(".parziale")
        r = subprocess.run(
            ["scp", "-q", "-o", "BatchMode=yes", "-o", "ConnectTimeout=20",
             f"{SERVER}:{CARTELLA_REMOTA}/{nome}", str(temporaneo)],
            capture_output=True, text=True, timeout=300,
        )
        if r.returncode != 0:
            falliti.append((nome, r.stderr.strip()[:120]))
            temporaneo.unlink(missing_ok=True)
            continue
        motivo = verifica(temporaneo)
        if motivo:
            # Un backup che non si apre e' peggio di nessun backup, perche' ti
            # fa credere di essere coperta. Non lo teniamo.
            falliti.append((nome, motivo))
            temporaneo.unlink(missing_ok=True)
            continue
        # Il nome definitivo si mette solo dopo la verifica: cosi' nella cartella
        # non compare mai un file a meta' che sembra buono.
        temporaneo.rename(destinazione)
        scaricati.append(nome)

    for nome in scaricati:
        scrivi(f"scaricato e verificato: {nome}")
    for nome, motivo in falliti:
        scrivi(f"FALLITO {nome}: {motivo}")

    # Potatura delle copie vecchie.
    limite = datetime.now() - timedelta(days=GIORNI_DA_TENERE)
    for f in CARTELLA_LOCALE.glob("*.sql.gz"):
        if datetime.fromtimestamp(f.stat().st_mtime) < limite:
            f.unlink()
            scrivi(f"rimossa copia vecchia: {f.name}")

    if falliti:
        avvisa("NeuroDesk — backup non riuscito",
               f"{len(falliti)} copie non scaricate o non valide. Guarda il registro.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
