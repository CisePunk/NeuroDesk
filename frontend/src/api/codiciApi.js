import { apiFetch } from './http';

// Codici di accesso emessi (backend: /api/tester, solo ruolo SCUOLA).
//
// Un codice E' l'account: anonimo, senza nome ne' email. Nel database ne resta
// solo l'impronta cifrata, mai il codice in chiaro -> si vede una volta sola,
// al momento in cui lo emetti, e non e' recuperabile dopo.
//
// L'etichetta serve SOLO a te per ricordarti a chi l'hai dato: sta nel tuo
// gestionale, non viaggia mai col codice e non finisce nelle conversazioni.

export function getCodici() {
    return apiFetch('/api/tester');
}

/** Emette un codice nuovo. La risposta contiene il codice IN CHIARO: mostralo subito. */
export function emettiCodice(etichetta) {
    const pulita = (etichetta || '').trim();
    return apiFetch('/api/tester', {
        method: 'POST',
        body: { etichetta: pulita || null },
    });
}

/** Consumo aggregato per modello: in tutto e negli ultimi sette giorni. Solo numeri, nessun contenuto. */
export function getConsumo() {
    return apiFetch('/api/tester/consumo');
}

/** Revoca (attivo=false) o riattiva un codice. La revoca ha effetto subito sul backend. */
export function impostaStatoCodice(id, attivo) {
    return apiFetch(`/api/tester/${id}/stato`, { method: 'PUT', body: { attivo } });
}
