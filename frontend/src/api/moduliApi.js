const BASE_URL = 'http://localhost:8080/api/moduli';

export async function getModuli() {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error('Errore nel caricamento moduli');
    return response.json();
}

export async function createModulo(modulo) {
    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modulo),
    });
    if (!response.ok) throw new Error('Errore nel salvataggio modulo');
    return response.json();
}