const BASE_URL = 'http://localhost:8080/api/task';

export async function getTask() {
    const response = await fetch(BASE_URL);
    if (!response.ok) throw new Error('Errore nel caricamento task');
    return response.json();
}

export async function createTask(task) {
    const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error('Errore nel salvataggio task');
    return response.json();
}