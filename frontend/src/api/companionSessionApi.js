import { apiFetch } from './http';

// Memoria delle conversazioni Companion (backend Spring). Ogni utente vede solo
// le proprie: il backend usa l'id dal token, mai dal client.

// Salva uno scambio (messaggio utente + risposta). Se sessioneId è null apre una
// nuova sessione e restituisce il suo id.
export function salvaScambio({ sessioneId, titolo, messaggioUtente, rispostaCompanion }) {
    return apiFetch('/api/companion-sessions/scambio', {
        method: 'POST',
        body: { sessioneId, titolo, messaggioUtente, rispostaCompanion },
    });
}

export function getSessioni() {
    return apiFetch('/api/companion-sessions');
}

export function getSessione(id) {
    return apiFetch(`/api/companion-sessions/${id}`);
}

// Diritto all'oblio: cancella tutta la cronologia dell'utente.
export function cancellaCronologia() {
    return apiFetch('/api/companion-sessions', { method: 'DELETE' });
}

export function cancellaSessione(id) {
    return apiFetch(`/api/companion-sessions/${id}`, { method: 'DELETE' });
}
