import { apiFetch } from './http';

export function login(codice, password) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: { codice: codice.trim(), password: password || undefined },
  });
}

export function getMe() {
  return apiFetch('/api/auth/me');
}

export function daiConsenso() {
  return apiFetch('/api/auth/consenso', { method: 'POST' });
}

export function revocaConsenso() {
  return apiFetch('/api/auth/consenso', { method: 'DELETE' });
}

/**
 * Imposta la PROPRIA chiave API ("bring your own token"): da qui in poi le
 * risposte le paga chi la mette, sul suo conto.
 *
 * La chiave viaggia solo in questa richiesta, su HTTPS, e non torna mai
 * indietro: nemmeno a chi gestisce NeuroDesk, che vede solo che c'e'.
 */
export function impostaChiaveAi(provider, chiave) {
    return apiFetch('/api/auth/chiave-ai', { method: 'PUT', body: { provider, chiave } });
}

/** Toglie la propria chiave: si torna al credito comune. */
export function rimuoviChiaveAi() {
    return apiFetch('/api/auth/chiave-ai', { method: 'DELETE' });
}
