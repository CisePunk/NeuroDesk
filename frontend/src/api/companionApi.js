import { messaggioAmichevole, getToken, clearToken } from './http';

// Il Companion e' un servizio separato (Node), raggiunto via proxy Vite su
// /api/companion. Ora e' PROTETTO: manda lo stesso token JWT del backend, cosi'
// solo chi ha fatto login puo' consumare crediti AI. Condivide i messaggi umani.
const BASE_URL = '/api/companion';

export async function sendCompanionMessage({ message, mode, profile, history }) {
    const token = getToken();
    let response;
    try {
        response = await fetch(`${BASE_URL}/respond`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            // history = memoria della conversazione, così il companion "ricorda" il filo.
            body: JSON.stringify({ message, mode, profile, history }),
        });
    } catch {
        throw new Error('Companion non raggiungibile. Controlla che il servizio sia acceso.');
    }

    if (!response.ok) {
        // Token scaduto/assente su una rotta ora protetta: logout globale, come nel backend.
        if (response.status === 401 && token) {
            clearToken();
            window.dispatchEvent(new Event('nd-unauthorized'));
        }
        let serverMsg = null;
        try {
            const data = await response.json();
            serverMsg = data?.error || data?.message || null;
        } catch {
            /* corpo non JSON */
        }
        throw new Error(messaggioAmichevole(response.status, serverMsg));
    }

    return response.json();
}

// Stato reale del servizio: quale provider AI è configurato (mock vs anthropic/openai).
// Serve a NON mentire nel badge prima del primo messaggio. Non richiede token.
export async function getCompanionHealth() {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) throw new Error('health non disponibile');
    return response.json();
}
