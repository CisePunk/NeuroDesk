// Verifica dei JWT emessi dal backend Spring, SENZA dipendenze esterne (solo il
// modulo crypto di Node). Il backend firma con jjwt/HS256..HS512 usando il
// segreto `neurodesk.jwt.secret`: qui va lo STESSO segreto in JWT_SECRET.
//
// Scopo: impedire che chiunque, senza aver fatto login, chiami l'endpoint AI e
// bruci i crediti. Non replichiamo il controllo "utente ancora attivo" (quello
// vive nel backend, col DB): per il Companion basta un token valido e non scaduto.

import crypto from 'node:crypto';

// Algoritmo PINNATO: il backend firma esplicitamente HS256, quindi qui accettiamo
// SOLO HS256. Nessuna agilita' di algoritmo -> niente "alg:none", niente downgrade,
// niente confusione RS/HS. Qualsiasi altro alg (o header assente) -> token rifiutato.
const ALG_ATTESO = 'HS256';
// Lunghezza minima del segreto HMAC: 32 byte (256 bit). Un segreto piu' corto
// rende la firma attaccabile a forza bruta: meglio rifiutare tutto.
export const SEGRETO_MIN_BYTE = 32;

function decodeSegment(segment) {
  return Buffer.from(segment, 'base64url');
}

/**
 * Verifica firma, algoritmo e scadenza di un JWT HS256/384/512.
 * @returns il payload (claims) se valido, altrimenti null. Non lancia mai.
 */
export function verificaJwt(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return null;
  // Difesa in profondita': un segreto troppo corto non deve validare nulla.
  if (Buffer.byteLength(secret, 'utf8') < SEGRETO_MIN_BYTE) return null;

  const parti = token.split('.');
  if (parti.length !== 3) return null;
  const [headerB64, payloadB64, firmaB64] = parti;

  let header;
  let payload;
  try {
    header = JSON.parse(decodeSegment(headerB64).toString('utf8'));
    payload = JSON.parse(decodeSegment(payloadB64).toString('utf8'));
  } catch {
    return null;
  }

  // Solo HS256 (pinnato). Blocca "alg:none", HS384/512, e algoritmi asimmetrici.
  if (!header || header.alg !== ALG_ATTESO) return null;

  // Ricalcola la firma e confronta a tempo costante.
  const atteso = crypto.createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest();
  let fornito;
  try {
    fornito = decodeSegment(firmaB64);
  } catch {
    return null;
  }
  if (atteso.length !== fornito.length) return null;
  if (!crypto.timingSafeEqual(atteso, fornito)) return null;

  // Scadenza obbligatoria: rifiuta token senza exp o gia' scaduti (exp e' in secondi).
  if (typeof payload.exp !== 'number' || Date.now() >= payload.exp * 1000) return null;

  return payload;
}

/** Estrae il token "Bearer xyz" dall'header Authorization (case-insensitive sullo schema). */
export function estraiBearer(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
