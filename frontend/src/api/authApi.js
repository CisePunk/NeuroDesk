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
