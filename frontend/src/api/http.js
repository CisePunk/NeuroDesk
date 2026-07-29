// Wrapper unico per il backend Spring (porta 8080): allega il token e traduce
// gli errori HTTP in messaggi chiari e umani. Il Companion (Node, proxato da
// Vite su /api/companion) NON passa da qui: vedi companionApi.js.

// URL del backend Spring. In sviluppo: localhost:8080. In produzione si imposta
// VITE_API_BASE_URL (build-time), es. "https://tuo-dominio/api-backend", oppure ""
// per chiamate same-origin dietro reverse proxy. Vedi .env.production.example.
import { testi } from '../i18n/lingua';
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const TOKEN_KEY = 'nd-token';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// L'archivio del browser puo' RIFIUTARE una scrittura (quota piena, Safari in
// navigazione privata, cookie di terze parti bloccati in un iframe). Se l'eccezione
// esce da qui, arriva a React che smonta tutto: pagina bianca. Meglio degradare:
// l'app resta usabile nella scheda aperta, si perde solo la persistenza.
let tokenInMemoria = null;

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? tokenInMemoria;
  } catch {
    return tokenInMemoria;
  }
}
export function setToken(token) {
  tokenInMemoria = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch { /* niente persistenza: resta valido finche' la scheda e' aperta */ }
}
export function clearToken() {
  tokenInMemoria = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignora */ }
}

// Messaggi per chi usa l'app, non per chi la sviluppa. Tre regole, perche' chi
// legge puo' essere in difficolta' proprio nel momento in cui compare l'errore:
// dire cosa e' successo, dire di chi e' il problema (quasi mai suo), dire cosa
// puo' fare adesso. Niente parole che presuppongono di sapere com'e' fatta
// l'app: "backend", "server", "elemento", "sessione" non vogliono dire niente a
// chi sta solo cercando di fare un passo.
export function messaggioAmichevole(status, serverMessage) {
  switch (status) {
    case 0:
      return t.errRete;
    case 401:
      return t.errCredenziali;
    case 403:
      return t.errPermesso;
    case 404:
      return t.errNonTrovato;
    case 409:
      return t.errConflitto;
    case 429:
      return t.errTroppi;
    case 400:
      return serverMessage || t.errDati;
    default:
      if (status >= 500) return t.errNostro;
      return serverMessage || t.errGenerico;
  }
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, messaggioAmichevole(0));
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    // Token scaduto/invalido su una rotta protetta: fai logout globale.
    if (res.status === 401 && auth && getToken()) {
      clearToken();
      window.dispatchEvent(new Event('nd-unauthorized'));
    }
    const serverMsg =
      data && typeof data === 'object' ? data.message : typeof data === 'string' ? data : null;
    throw new ApiError(res.status, messaggioAmichevole(res.status, serverMsg));
  }

  return data;
}
