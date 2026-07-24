// Rate limiter in-memory per il Companion: protegge da abuso e soprattutto dai
// COSTI AI (ogni richiesta con provider reale consuma crediti OpenAI/Anthropic).
// Due freni: uno per-IP e uno GLOBALE (circuit breaker sulla spesa complessiva).
// NON ci si fida di X-Forwarded-For dal client (falsificabile): si usa l'IP della
// connessione. Dietro un proxy fidato andra' letto l'header impostato dal proxy.

const FINESTRA_MS = 60_000;   // 1 minuto
const MAX_PER_IP = 20;        // richieste/min per singolo IP
const MAX_GLOBALE = 200;      // richieste/min totali (freno ai costi)
const MAX_VOCI = 10_000;      // tetto anti-crescita della mappa

const perIp = new Map();
let globale = { count: 0, reset: 0 };

function purgaScaduti(now) {
  for (const [ip, b] of perIp) {
    if (now > b.reset) perIp.delete(ip);
  }
}

export function consentito(ip) {
  const now = Date.now();

  if (now > globale.reset) {
    globale = { count: 0, reset: now + FINESTRA_MS };
  }
  if (perIp.size > MAX_VOCI) {
    purgaScaduti(now);
  }

  let b = perIp.get(ip);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + FINESTRA_MS };
    perIp.set(ip, b);
  }

  if (globale.count >= MAX_GLOBALE || b.count >= MAX_PER_IP) {
    return false;
  }

  b.count += 1;
  globale.count += 1;
  return true;
}
