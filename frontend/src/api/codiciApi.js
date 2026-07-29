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

/**
 * Imposta la chiave API personale di un tester ("bring your own token").
 *
 * La chiave viaggia in chiaro SOLO in questa richiesta, su HTTPS, e non torna
 * mai indietro: l'elenco dice soltanto SE c'e' e per quale fornitore. Nel
 * database e' cifrata con la stessa chiave delle conversazioni.
 */
export function impostaChiaveCodice(id, provider, chiave) {
    return apiFetch(`/api/tester/${id}/chiave`, { method: 'PUT', body: { provider, chiave } });
}

/** Toglie la chiave personale: quel tester torna a usare il credito comune. */
export function rimuoviChiaveCodice(id) {
    return apiFetch(`/api/tester/${id}/chiave`, { method: 'DELETE' });
}

/** Revoca (attivo=false) o riattiva un codice. La revoca ha effetto subito sul backend. */
export function impostaStatoCodice(id, attivo) {
    return apiFetch(`/api/tester/${id}/stato`, { method: 'PUT', body: { attivo } });
}
