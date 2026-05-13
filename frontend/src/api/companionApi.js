const BASE_URL = '/api/companion';

export async function sendCompanionMessage({ message, mode, profile }) {
    const response = await fetch(`${BASE_URL}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode, profile }),
    });

    if (!response.ok) {
        throw new Error('Errore nella risposta del Companion');
    }

    return response.json();
}
