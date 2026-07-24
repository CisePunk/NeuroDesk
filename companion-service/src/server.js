import http from 'node:http';
import { generateCompanionReply } from './aiProvider.js';
import { normalizeMode } from './modes.js';
import { assessRisk } from './safety.js';
import { consentito } from './rateLimiter.js';
import { verificaJwt, estraiBearer, SEGRETO_MIN_BYTE } from './auth.js';

const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
// Stesso segreto del backend Spring (neurodesk.jwt.secret). Senza (o troppo corto),
// l'endpoint AI resta chiuso: meglio non funzionare che lasciare i crediti aperti.
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_SECRET_OK = Buffer.byteLength(JWT_SECRET, 'utf8') >= SEGRETO_MIN_BYTE;
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

  if (req.method === 'GET' && req.url === '/health') {
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
    //     imposto lato server, non solo dall'interfaccia.
    if (utente.ruolo === 'STUDENTE' && utente.consenso !== true) {
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

      const risk = assessRisk(message);
      if (risk.level === 'high') {
        return sendJson(res, 200, {
          mode,
          risk,
          reply: risk.guidance,
          provider: null,
          nextAction: 'Se te la senti, parlane con una persona di cui ti fidi o con il tuo medico.',
        });
      }

      // Override del provider per-richiesta ('mock' | 'openai' | 'anthropic'):
      // consentito SOLO all'admin SCUOLA (per le prove A/B). Un tester non puo'
      // forzare un provider a pagamento -> il costo resta sotto controllo.
      const overrideProvider = utente.ruolo === 'SCUOLA' ? payload.provider : undefined;

      const ai = await generateCompanionReply({
        message,
        mode,
        profile: payload.profile || null,
        history: payload.history || [],
        provider: overrideProvider,
      });

      return sendJson(res, 200, {
        mode,
        risk,
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
