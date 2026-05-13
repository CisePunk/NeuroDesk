const BASE_URL = 'http://localhost:8080/api/studenti';

export async function getStudenti() {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
        throw new Error('Errore nel caricamento studenti');
    }
    return response.json();
}

export async function createStudente(studente) {
    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(studente),
    });

    if (!response.ok) {
        throw new Error('Errore nel salvataggio studente');
    }

    return response.json();
}