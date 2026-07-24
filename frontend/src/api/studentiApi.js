import { apiFetch } from './http';

// Modalita' test: true solo se il backend ha neurodesk.test-mode=true.
export async function getTestMode() {
    try {
        const data = await apiFetch('/api/test/status');
        return Boolean(data.enabled);
    } catch {
        return false;
    }
}

// Genera N utenti FITTIZI (solo in modalita' test). Non e' registrazione reale.
export function seedTestStudenti(count = 5) {
    return apiFetch(`/api/test/seed/studenti?count=${count}`, { method: 'POST' });
}

// Rimuove tutti gli utenti di test (email sul dominio riservato).
export function removeTestStudenti() {
    return apiFetch('/api/test/seed/studenti', { method: 'DELETE' });
}

export function getStudenti() {
    return apiFetch('/api/studenti');
}

export function createStudente(studente) {
    return apiFetch('/api/studenti', { method: 'POST', body: studente });
}
