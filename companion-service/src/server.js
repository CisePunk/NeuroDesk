import http from 'node:http';
import { generateCompanionReply } from './aiProvider.js';
import { normalizeMode } from './modes.js';
import { assessRisk } from './safety.js';

const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

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
    });
  }

  if (req.method === 'POST' && req.url === '/api/companion/respond') {
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
          nextAction: 'Contatta subito una persona fidata o il 112 se sei in pericolo immediato.',
        });
      }

      const ai = await generateCompanionReply({
        message,
        mode,
        profile: payload.profile || null,
      });

      return sendJson(res, 200, {
        mode,
        risk,
        reply: ai.text,
        provider: ai.provider,
        usage: ai.usage || {
          estimatedInputTokens: ai.estimatedTokens,
          note: 'Stima locale. Il consumo reale dipende dal provider AI.',
        },
      });
    } catch {
      return sendJson(res, 500, { error: 'companion_request_failed' });
    }
  }

  return sendJson(res, 404, { error: 'not_found' });
});

server.listen(PORT, HOST, () => {
  console.log(`NeuroDesk Companion Service listening on http://${HOST}:${PORT}`);
});
