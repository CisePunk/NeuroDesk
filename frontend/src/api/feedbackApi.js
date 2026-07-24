import { apiFetch } from './http';

// Domande fisse del feedback (pulsanti). Fonte unica: il catalogo lato backend.
export function getFeedbackSchema() {
    return apiFetch('/api/feedback/schema');
}

// Invia il feedback del tester. risposte = { idDomanda: idOpzione }.
export function inviaFeedback(feedback) {
    return apiFetch('/api/feedback', { method: 'POST', body: feedback });
}

// Report aggregato (solo SCUOLA).
export function getFeedbackReport() {
    return apiFetch('/api/feedback/report');
}

// Scarica l'export CSV (solo SCUOLA). apiFetch restituisce il testo grezzo:
// lo trasformiamo in un file scaricabile mantenendo l'header Authorization.
export async function scaricaFeedbackCsv() {
    const csv = await apiFetch('/api/feedback/export.csv');
    const blob = new Blob([csv ?? ''], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback-neurodesk.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
