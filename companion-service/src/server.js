import http from 'node:http';
import { generateCompanionReply } from './aiProvider.js';
import { normalizeMode } from './modes.js';
import { consentito } from './rateLimiter.js';
import { verificaJwt, estraiBearer, SEGRETO_MIN_BYTE } from './auth.js';

const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
// Stesso segreto del backend Spring (neurodesk.jwt.secret). Senza (o troppo corto),
// l'endpoint AI resta chiuso: meglio non funzionare che lasciare i crediti aperti.
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_SECRET_OK = Buffer.byteLength(JWT_SECRET, 'utf8') >= SEGRETO_MIN_BYTE;
// Backend Spring per il controllo live "utente ancora attivo / consenso valido".
// Entrambi girano su 127.0.0.1: la latenza e' trascurabile.
const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
// Token condiviso per l'endpoint interno del backend. Di default e' lo stesso
// segreto JWT (gia' noto a entrambi): nessun nuovo segreto da distribuire.
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || JWT_SECRET;
// Cache breve dello stato: interroga il DB al massimo una volta al minuto per utente,
// cosi' una revoca ha effetto entro ~60s invece che dopo la scadenza del token (24h).
const STATO_TTL_MS = 60_000;
// Tetto alla cache SCADUTA usata quando il backend non risponde: tolleriamo un
// riavvio del backend, ma dopo 5 minuti fail-closed. Cosi' una revoca ha effetto
// entro 5 minuti anche se il backend resta giu' (buco delimitato, non aperto).
const STATO_STALE_MAX_MS = 5 * 60_000;
const statoCache = new Map();

/**
 * Stato reale dell'utente dal backend: { attivo, consenso }. Con cache di 60s.
 * Se il backend non risponde, usa l'ultimo stato noto (anche scaduto) per non
 * bloccare gli utenti a ogni riavvio del backend; null solo se non l'ha mai visto.
 */
async function statoUtente(id) {
  const now = Date.now();
  const cached = statoCache.get(id);
  if (cached && now - cached.ts < STATO_TTL_MS) {
    return cached;
  }
  try {
    const resp = await fetch(`${BACKEND_URL}/api/internal/utente/${encodeURIComponent(id)}/stato`, {
      headers: { 'X-Internal-Token': INTERNAL_TOKEN },
    });
    if (resp.ok) {
      const j = await resp.json();
      const val = {
        attivo: Boolean(j.attivo),
        consenso: Boolean(j.consenso),
        // "Bring your own token": se questo tester ha portato la propria chiave,
        // le sue risposte le paga lui. Sta in memoria per il tempo della cache
        // (60s) e non viene mai scritta da nessuna parte, nemmeno nei log.
        chiaveAi: j.chiaveAi || null,
        chiaveAiProvider: j.chiaveAiProvider || null,
        // Tetto di consumo sul credito comune (impalcatura, spenta nel backend
        // finche' la soglia e' 0): quando accesa, chi lo supera senza chiave
        // propria viene invitato ad aggiungere la sua.
        creditoCondivisoEsaurito: Boolean(j.creditoCondivisoEsaurito),
        ts: now,
      };
      statoCache.set(id, val);
      return val;
    }
    // Errore lato backend (es. 401/5xx): usa l'ultimo stato noto, ma solo se
    // abbastanza recente (<=5 min). Oltre, fail-closed: non lasciare il buco aperto.
    return statoRecente(cached, now);
  } catch {
    // Backend irraggiungibile (riavvio in corso): idem, stato noto se recente.
    return statoRecente(cached, now);
  }
}

/**
 * Riferisce al backend quanto e' costata una chiamata AI.
 *
 * Lo fa il servizio, non il browser: il consumo serve anche ad accorgersi di chi
 * usa il Companion per fatti propri, e un numero che passa dal client puo'
 * essere falsificato proprio da chi avrebbe interesse a farlo.
 *
 * Non si aspetta la risposta e non fallisce mai verso l'utente: se il backend e'
 * irraggiungibile si perde una riga di statistica, non la risposta di chi sta
 * scrivendo. Nessun contenuto viene inviato, solo conteggi.
 */
function registraConsumo(utenteId, ai, pagatoDaUtente = false) {
  const corpo = {
    utenteId,
    // Chi ha portato la propria chiave non pesa sul credito comune: il consumo
    // si misura lo stesso, ma va letto in un'altra colonna.
    pagatoDaUtente,
    provider: ai.provider,
    modello: ai.model,
    tokenInput: ai.usage?.estimatedInputTokens ?? 0,
    tokenOutput: ai.usage?.outputTokens ?? 0,
    ripiegoDa: ai.ripiegoDa ?? null,
  };
  fetch(`${BACKEND_URL}/api/internal/consumo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(5000),
  }).catch((err) => {
    console.error(`[companion] consumo non registrato: ${err.message}`);
  });
}

/** Ritorna lo stato in cache solo se non piu' vecchio di STATO_STALE_MAX_MS. */
function statoRecente(cached, now) {
  if (cached && now - cached.ts < STATO_STALE_MAX_MS) {
    return cached;
  }
  return null;
}
// Dietro un reverse proxy FIDATO (Caddy/nginx) l'IP della connessione e' sempre
// quello del proxy: il rate limiter per-IP diventerebbe un unico bucket condiviso.
// Imposta TRUST_PROXY_HEADER (es. "x-forwarded-for") SOLO se davanti c'e' un proxy
// fidato che lo scrive lui; altrimenti lascialo vuoto (l'header e' falsificabile).
const TRUST_PROXY_HEADER = (process.env.TRUST_PROXY_HEADER || '').toLowerCase();

// IP del client da usare per il rate limiting. Con un proxy fidato configurato,
// prende il PRIMO indirizzo dell'header (il client originale); altrimenti l'IP
// della connessione TCP, che il client non puo' falsificare.
function ipClient(req) {
  if (TRUST_PROXY_HEADER) {
    const raw = req.headers[TRUST_PROXY_HEADER];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) {
      const first = String(value).split(',')[0].trim();
      if (first) return first;
    }
  }
  return req.socket.remoteAddress || 'sconosciuto';
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  res.end(JSON.stringify(body, null, 2));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  // /health interno; /api/companion/health raggiungibile dal frontend via Caddy,
  // cosi' la UI puo' dire la verita' sul provider reale (mock vs anthropic/openai).
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/companion/health')) {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'neurodesk-companion-service',
      provider: process.env.AI_PROVIDER || 'mock',
      // Dice la verità su quali provider AI hanno davvero la chiave configurata.
      keys: {
        openai: Boolean(process.env.OPENAI_API_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      },
    });
  }

  if (req.method === 'POST' && req.url === '/api/companion/respond') {
    // 1) AUTENTICAZIONE: serve un JWT valido emesso dal backend. Senza segreto
    //    valido l'endpoint e' fail-closed (non brucia crediti per errore).
    if (!JWT_SECRET_OK) {
      return sendJson(res, 503, {
        error: 'auth_non_configurata',
        message: 'Servizio non configurato correttamente (JWT_SECRET mancante o troppo corto).',
      });
    }
    const utente = verificaJwt(estraiBearer(req.headers['authorization']), JWT_SECRET);
    if (!utente) {
      return sendJson(res, 401, {
        error: 'non_autorizzato',
        message: 'Sessione non valida o scaduta. Rientra con il tuo codice.',
      });
    }

    // 1b) CONSENSO (Art. 9): uno STUDENTE deve aver dato il consenso, verificato
    //     dal claim firmato. La SCUOLA (admin) e' esente. Cosi' il consenso e'
    //     imposto lato server, non solo dall'interfaccia. (Controllo veloce.)
    if (utente.ruolo === 'STUDENTE' && utente.consenso !== true) {
      return sendJson(res, 403, {
        error: 'consenso_mancante',
        message: 'Serve il consenso prima di usare il Companion.',
      });
    }

    // 1c) STATO LIVE: il JWT vale fino a 24h, ma revoca e ritiro del consenso
    //     devono avere effetto SUBITO. Chiediamo al backend lo stato reale (cache 60s).
    const stato = await statoUtente(String(utente.sub));
    if (!stato) {
      // Non l'abbiamo mai visto e il backend non risponde: fail-closed.
      return sendJson(res, 503, {
        error: 'stato_non_verificabile',
        message: 'Servizio momentaneamente non disponibile. Riprova tra poco.',
      });
    }
    if (!stato.attivo) {
      return sendJson(res, 401, {
        error: 'accesso_revocato',
        message: 'Il tuo accesso è stato revocato. Contatta chi ti ha dato il codice.',
      });
    }
    if (utente.ruolo === 'STUDENTE' && !stato.consenso) {
      return sendJson(res, 403, {
        error: 'consenso_mancante',
        message: 'Serve il consenso prima di usare il Companion.',
      });
    }

    // 2) Freno anti-abuso e anti-costi AI. IP reale del client (vedi ipClient).
    const ip = ipClient(req);
    if (!consentito(ip)) {
      return sendJson(res, 429, {
        error: 'rate_limited',
        message: 'Troppe richieste. Aspetta un momento prima di riprovare.',
      });
    }
    try {
      const payload = await readJson(req);
      const message = String(payload.message || '').trim();
      const mode = normalizeMode(payload.mode);

      if (!message) {
        return sendJson(res, 400, { error: 'message is required' });
      }
      if (message.length > 2000) {
        return sendJson(res, 400, { error: 'message_too_long', maxLength: 2000 });
      }

      // Override del provider per-richiesta ('mock' | 'openai' | 'anthropic'):
      // consentito SOLO all'admin SCUOLA (per le prove A/B). Un tester non puo'
      // forzare un provider a pagamento -> il costo resta sotto controllo.
      const overrideProvider = utente.ruolo === 'SCUOLA' ? payload.provider : undefined;

      // Se il tester ha portato la propria chiave, si usa quella e il provider
      // che ha indicato: le sue risposte le paga lui. Altrimenti tutto come prima.
      const chiavePropria = stato?.chiaveAi || null;

      // Tetto di consumo sul credito COMUNE (impalcatura, spenta finche' il tetto
      // nel backend e' 0). Chi ha esaurito la quota condivisa e non ha portato la
      // propria chiave viene invitato ad aggiungerla, invece di continuare a
      // pesare sul credito di tutti. Chi ha la chiave propria non e' toccato.
      if (!chiavePropria && stato?.creditoCondivisoEsaurito) {
        return sendJson(res, 429, {
          error: 'tetto_credito_condiviso',
          message:
            'Hai raggiunto il limite di utilizzo sul credito condiviso di NeuroDesk. ' +
            'Per continuare puoi aggiungere la tua chiave API dalle opzioni avanzate: ' +
            'da quel momento le tue conversazioni le paghi tu. Quello che hai scritto resta salvato.',
        });
      }

      const ai = await generateCompanionReply({
        message,
        mode,
        profile: payload.profile || null,
        history: payload.history || [],
        provider: chiavePropria ? stato.chiaveAiProvider : overrideProvider,
        chiaveUtente: chiavePropria,
      });

      registraConsumo(utente.sub, ai, Boolean(chiavePropria));

      return sendJson(res, 200, {
        mode,
        reply: ai.text,
        provider: ai.provider,
        model: ai.model,
        usage: ai.usage,
      });
    } catch (err) {
      // Log lato server SOLO del motivo tecnico: mai il testo dell'utente, mai il
      // profilo (sono dati di salute, Art. 9). Senza questa riga un errore del
      // provider — chiave sbagliata, modello inesistente, credito finito — arriva
      // al client come un 500 muto e si debugga alla cieca.
      console.error(`[companion] richiesta fallita: ${err.message}`);
      // Credito esaurito su tutti i provider: non e' un guasto, e riprovare non
      // serve. Alla persona diciamo la verita' e le togliamo di dosso l'idea che
      // dipenda da lei o da come ha scritto. A noi lo urla nel log, perche' e'
      // il momento in cui bisogna ricaricare.
      // La chiave PERSONALE del tester non funziona: e' l'unico caso in cui il
      // problema non e' nostro e non e' passeggero — e' suo, e puo' sistemarlo.
      // Dirgli "riprova fra poco" lo lascerebbe a ritentare a vuoto.
      if (err.chiaveUtenteFallita) {
        return sendJson(res, 502, {
          error: 'chiave_personale_non_valida',
          message:
            'La chiave API che hai fornito non è stata accettata dal fornitore. ' +
            'Può essere scaduta, revocata, senza credito residuo, oppure copiata male. ' +
            'Non abbiamo usato il credito di NeuroDesk al tuo posto: controlla la chiave sul tuo account e riprova.',
        });
      }
      if (err.creditoEsaurito) {
        console.error('[companion] CREDITO ESAURITO su tutti i provider configurati: ricaricare.');
        return sendJson(res, 503, {
          error: 'companion_credito_esaurito',
          message:
            'Il Companion è fermo per un limite raggiunto dalla nostra parte. ' +
            'Non dipende da te e non dipende da quello che hai scritto. ' +
            'Riprovare adesso non serve: torna più tardi, quello che hai scritto resta salvato.',
        });
      }
      if (err.provider) {
        return sendJson(res, 502, {
          error: 'companion_provider_failed',
          message: 'Il servizio non risponde in questo momento. Riprova tra poco.',
        });
      }
      return sendJson(res, 500, { error: 'companion_request_failed' });
    }
  }

  return sendJson(res, 404, { error: 'not_found' });
});

server.listen(PORT, HOST, () => {
  console.log(`NeuroDesk Companion Service listening on http://${HOST}:${PORT}`);
  if (!JWT_SECRET_OK) {
    console.warn(
      `[ATTENZIONE] JWT_SECRET mancante o piu' corto di ${SEGRETO_MIN_BYTE} byte: ` +
        '/api/companion/respond risponde 503. Imposta lo stesso segreto del backend ' +
        '(neurodesk.jwt.secret) per attivarlo.',
    );
  } else {
    console.log('Autenticazione JWT (HS256) e consenso attivi sull\'endpoint AI.');
  }
});
