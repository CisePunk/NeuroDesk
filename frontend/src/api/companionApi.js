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
        throw new Error('Non riesco a raggiungere il Companion. Controlla la connessione e riprova fra un minuto.');
    }

    if (!response.ok) {
        // Token scaduto/assente su una rotta ora protetta: logout globale, come nel backend.
        if (response.status === 401 && token) {
            clearToken();
            window.dispatchEvent(new Event('nd-unauthorized'));
        }
        let serverMsg = null;
        let codice = null;
        try {
            const data = await response.json();
            codice = data?.error || null;
            serverMsg = data?.message || data?.error || null;
        } catch {
            /* corpo non JSON */
        }
        // Un solo caso in cui il testo del server vince su quello generico: il
        // credito esaurito. Il messaggio standard per gli errori 5xx dice
        // "riprova fra qualche minuto", che qui sarebbe falso — riprovare non
        // serve finché non si ricarica, e mandare a vuoto chi sta seguendo un
        // passo alla volta è il modo peggiore di fallire.
        if (codice === 'companion_credito_esaurito' && serverMsg) {
            throw new Error(serverMsg);
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
