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

// Imposta l'etichetta di un messaggio. etichetta vuota/null la toglie: non è un
// errore, è il modo per tornare indietro. Serve un messaggio già SALVATO
// (con un id del server): non ha senso su una bolla ancora solo locale.
export function impostaEtichettaMessaggio(sessioneId, messaggioId, etichetta) {
    return apiFetch(`/api/companion-sessions/${sessioneId}/messaggi/${messaggioId}/etichetta`, {
        method: 'PUT',
        body: { etichetta },
    });
}
