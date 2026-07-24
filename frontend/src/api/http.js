// Wrapper unico per il backend Spring (porta 8080): allega il token e traduce
// gli errori HTTP in messaggi chiari e umani. Il Companion (Node, proxato da
// Vite su /api/companion) NON passa da qui: vedi companionApi.js.

// URL del backend Spring. In sviluppo: localhost:8080. In produzione si imposta
// VITE_API_BASE_URL (build-time), es. "https://tuo-dominio/api-backend", oppure ""
// per chiamate same-origin dietro reverse proxy. Vedi .env.production.example.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const TOKEN_KEY = 'nd-token';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function messaggioAmichevole(status, serverMessage) {
  switch (status) {
    case 0:
      return 'Server non raggiungibile. Controlla che il backend sia acceso.';
    case 401:
      return 'Codice o password non validi.';
    case 403:
      return 'Non hai i permessi per questa azione.';
    case 404:
      return 'Elemento non trovato.';
    case 409:
      return 'Esiste già un elemento con questi dati.';
    case 429:
      return 'Troppi tentativi. Riprova tra qualche minuto.';
    case 400:
      return serverMessage || 'Alcuni dati non sono validi. Controlla i campi.';
    default:
      if (status >= 500) return 'Errore del server. Riprova più tardi.';
      return serverMessage || 'Si è verificato un errore imprevisto.';
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
