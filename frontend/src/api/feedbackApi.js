import { apiFetch } from './http';

// Domande fisse del feedback (pulsanti). Fonte unica: il catalogo lato backend.
// Le domande arrivano gia' tradotte dal backend: cambia solo l'etichetta mostrata,
// il valore salvato resta lo stesso in tutte le lingue. Cosi' il report somma
// insieme chi ha cliccato "Molto facile" e chi ha cliccato "Very easy".
export function getFeedbackSchema(lingua) {
    const q = lingua ? `?lang=${encodeURIComponent(lingua)}` : '';
    return apiFetch(`/api/feedback/schema${q}`);
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
