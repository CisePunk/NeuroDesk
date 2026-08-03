#!/usr/bin/env python3
"""
NeuroDesk — riepilogo di sicurezza giornaliero.

Una sola mail al giorno con quello che le difese hanno fermato nelle ultime 24
ore. NON una mail per ogni ban: con la reputazione mondiale di CrowdSec si
bloccano decine di migliaia di indirizzi, mandarne una ciascuno sarebbe spam.

La riga che conta e' "rilevazioni LOCALI": sono gli attacchi arrivati DAVVERO a
te (non il rumore di fondo gia' filtrato dalla blocklist condivisa). Se e' zero,
e' stata una giornata tranquilla.

Invio via msmtp, come gli altri avvisi. Gira da un timer systemd, una volta al
giorno.
"""
import json
import os
import re
import subprocess
from datetime import datetime, timedelta, timezone

EMAIL = os.getenv("NEURODESK_REPORT_EMAIL", "hello@neurodesk.it")
ORA = datetime.now(timezone.utc)
DA = ORA - timedelta(hours=24)


def sh(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=30).stdout
    except Exception:  # noqa: BLE001 — un comando assente non deve far saltare il riepilogo
        return ""


righe = []

# ─── fail2ban: le regole su misura ───────────────────────────────────────────
righe.append("FAIL2BAN — le regole su misura")
jails = []
m = re.search(r"Jail list:\s*(.+)", sh(["fail2ban-client", "status"]))
if m:
    jails = [j.strip() for j in m.group(1).split(",") if j.strip()]
for j in jails:
    s = sh(["fail2ban-client", "status", j])
    cur = re.search(r"Currently banned:\s*(\d+)", s)
    righe.append(f"  {j}: {cur.group(1) if cur else '?'} bannati ora")

ban24, top = 0, {}
try:
    with open("/var/log/fail2ban.log", encoding="utf-8", errors="replace") as f:
        for line in f:
            if " Ban " not in line:
                continue
            try:
                ts = datetime.strptime(line[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            if ts >= DA:
                ban24 += 1
                ip = line.rstrip().split(" Ban ")[-1].strip()
                top[ip] = top.get(ip, 0) + 1
except FileNotFoundError:
    pass
righe.append(f"  nuovi ban nelle ultime 24 ore: {ban24}")
for ip, n in sorted(top.items(), key=lambda x: -x[1])[:5]:
    righe.append(f"    {ip}  ({n}x)")
righe.append("")

# ─── CrowdSec: reputazione mondiale + rilevazioni locali ─────────────────────
righe.append("CROWDSEC — reputazione mondiale + scenari")
fw = 0
try:
    nd = json.loads(sh(["nft", "-j", "list", "ruleset"]) or "{}")
    for x in nd.get("nftables", []):
        if "set" in x and "crowdsec" in x["set"].get("name", ""):
            fw += len(x["set"].get("elem", []))
except Exception:  # noqa: BLE001
    pass
righe.append(f"  IP malevoli bloccati al firewall (dal mondo): {fw}")

try:
    alerts = json.loads(sh(["cscli", "alerts", "list", "--since", "24h", "-o", "json"]) or "[]")
except Exception:  # noqa: BLE001
    alerts = []
# Locali = rilevati QUI dai nostri scenari, non importati dalla blocklist community.
locali = [a for a in alerts
          if any(d.get("origin") == "crowdsec" for d in (a.get("decisions") or []))]
righe.append(f"  rilevazioni LOCALI nelle ultime 24 ore (attacchi mirati a te): {len(locali)}")
for a in locali[:6]:
    src = (a.get("source") or {}).get("value") or (a.get("source") or {}).get("ip", "?")
    righe.append(f"    {src} — {a.get('scenario', '?')}")
righe.append("")

# ─── honeypot: anomalie curate ───────────────────────────────────────────────
righe.append("HONEYPOT — anomalie viste")
hp = 0
try:
    with open("/var/log/neurodesk/honeypot-eventi.jsonl", encoding="utf-8", errors="replace") as f:
        for line in f:
            try:
                if datetime.fromisoformat(json.loads(line)["quando"]) >= DA:
                    hp += 1
            except Exception:  # noqa: BLE001
                continue
except FileNotFoundError:
    pass
righe.append(f"  eventi archiviati nelle ultime 24 ore: {hp}")
righe.append("")

corpo = (
    f"To: {EMAIL}\nFrom: {EMAIL}\n"
    f"Subject: NeuroDesk — riepilogo sicurezza {ORA:%d/%m}\n"
    "Content-Type: text/plain; charset=UTF-8\n\n"
    f"Riepilogo delle ultime 24 ore ({ORA:%Y-%m-%d %H:%M} UTC).\n"
    "Una mail al giorno, non una per ogni blocco.\n\n"
    + "\n".join(righe)
    + "\nCome leggerlo: i numeri grossi (firewall) sono rumore del mondo, gia'\n"
      "fermato. Quello che vale un'occhiata sono le 'rilevazioni LOCALI': se\n"
      "diverse da zero, qualcuno ha puntato TE, non il primo IP che passava.\n"
)

try:
    subprocess.run(["msmtp", "--read-recipients"], input=corpo.encode("utf-8"),
                   check=True, timeout=60)
    print("riepilogo spedito")
except Exception as err:  # noqa: BLE001
    print(f"riepilogo NON spedito: {err}")
