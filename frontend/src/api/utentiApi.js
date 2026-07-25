import { apiFetch } from './http';

// Un "utente" = un accesso a CODICE ANONIMO. La scuola rilascia il codice una
// volta sola, identifica l'utente senza nome né email, e ne mantiene la gestione
// (revoca). È questo a risolvere GDPR e conservazione dati. Backend: /api/tester.

export function getUtenti() {
    return apiFetch('/api/tester');
}

// Crea un utente e restituisce il codice IN CHIARO una sola volta ({id, codice, etichetta}).
export function creaCodice(etichetta) {
    const body = etichetta ? { etichetta } : {};
    return apiFetch('/api/tester', { method: 'POST', body });
}

// Attiva/revoca l'accesso di un utente.
export function impostaStato(id, attivo) {
    return apiFetch(`/api/tester/${id}/stato`, { method: 'PUT', body: { attivo } });
}
