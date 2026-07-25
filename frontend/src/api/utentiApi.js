import { apiFetch } from './http';

// Un "utente" = anagrafica gestita dalla SCUOLA (nome, email…) + un account-codice
// ANONIMO collegato. Registrarlo genera il codice, mostrato una volta sola. Nome ed
// email restano nel registro; dati e chat vivono sul codice → pseudonimizzazione (GDPR).
// Backend: /api/studenti.

export function getUtenti() {
    return apiFetch('/api/studenti');
}

// Registra l'utente e restituisce anche il CODICE in chiaro (campo `codice`) una sola volta.
export function registraUtente(dati) {
    return apiFetch('/api/studenti', { method: 'POST', body: dati });
}

// Attiva/revoca l'accesso: agisce sul codice-account collegato.
export function impostaStato(id, attivo) {
    return apiFetch(`/api/studenti/${id}/stato`, { method: 'PUT', body: { attivo } });
}
