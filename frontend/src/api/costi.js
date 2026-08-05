/**
 * Listino e conti sulla spesa AI. Sta tutto qui, in un punto solo, perche' i
 * prezzi cambiano da soli: Sonnet 5 ha un prezzo di lancio che scade il
 * 31 agosto 2026, e quel giorno lo stesso messaggio costera' la meta' in piu'
 * senza che nessuno abbia toccato niente.
 *
 * I numeri misurati arrivano dal backend (/api/tester/consumo). Qui non si
 * misura niente: si moltiplica soltanto.
 */

// Prezzi in DOLLARI per milione di token.
// `introFino` = prezzo di lancio valido fino a quella data (compresa).
const LISTINO = {
    // --- Anthropic (principale). Fonte: listino Anthropic.
    'claude-sonnet-5': { in: 3.0, out: 15.0, introIn: 2.0, introOut: 10.0, introFino: '2026-08-31' },
    'claude-sonnet-4-6': { in: 3.0, out: 15.0 },
    'claude-haiku-4-5': { in: 1.0, out: 5.0 },
    'claude-opus-5': { in: 5.0, out: 25.0 },
    'claude-opus-4-8': { in: 5.0, out: 25.0 },
    'claude-opus-4-7': { in: 5.0, out: 25.0 },
    'claude-opus-4-6': { in: 5.0, out: 25.0 },
    // --- OpenAI (ripiego). Fonte: developers.openai.com/api/docs/pricing,
    // verificata il 5 agosto 2026 (dopo il taglio prezzi del 30 luglio 2026).
    // Nota: su questi modelli i token di ragionamento NON si vedono nella
    // risposta ma si pagano come output. Il conto qui sotto li comprende,
    // perche' parte dal `completion_tokens` che dichiara il provider.
    'gpt-5.6-sol': { in: 5.0, out: 30.0 },
    'gpt-5.6-terra': { in: 2.0, out: 12.0 },
    'gpt-5.6-luna': { in: 0.2, out: 1.2 },
    'gpt-5.4': { in: 2.5, out: 15.0 },
    'gpt-5.4-mini': { in: 0.75, out: 4.5 },
    'gpt-5.4-nano': { in: 0.2, out: 1.25 },
    // Non lo usiamo piu', ma resta nel registro: il ripiego del 3 agosto 2026 e'
    // passato di qui. Senza il suo prezzo, quella riga terrebbe acceso per sempre
    // l'avviso "consumo non conteggiato in euro" per una spesa di frazioni di centesimo.
    'gpt-4.1-mini': { in: 0.4, out: 1.6 },
};

// Cambio euro/dollaro: approssimato di proposito. Serve solo a mostrare un
// ordine di grandezza in euro; percentuale del budget e data di esaurimento
// non cambiano in modo apprezzabile se il cambio si muove di qualche centesimo.
const EURO_PER_DOLLARO = 0.92;

// Quanto credito è stato comprato, in euro. Da aggiornare a ogni ricarica.
export const BUDGET = {
    anthropic: 10,
    openai: 5,
};

// La data in cui è prevista la prossima ricarica: il traguardo vero da
// raggiungere, non una scadenza astratta.
export const PROSSIMA_RICARICA = '2026-08-08';

function prezzo(modello, quando) {
    const p = LISTINO[modello];
    if (!p) return null;
    const inSaldo = p.introFino && quando <= new Date(`${p.introFino}T23:59:59`);
    return inSaldo ? { in: p.introIn, out: p.introOut } : { in: p.in, out: p.out };
}

/** Costo in euro di una riga [modello, tokenInput, tokenOutput]. null se il listino non lo conosce. */
export function costoRiga(riga, quando = new Date()) {
    const p = prezzo(riga.modello, quando);
    if (!p) return null;
    const dollari = (riga.tokenInput / 1e6) * p.in + (riga.tokenOutput / 1e6) * p.out;
    return dollari * EURO_PER_DOLLARO;
}

/**
 * Somma la spesa di un elenco di righe, tenendo da parte i provider di cui non
 * conosciamo il listino invece di fingere che costino zero.
 */
export function spesa(righe = []) {
    let euro = 0;
    const senzaPrezzo = new Set();
    for (const r of righe) {
        const c = costoRiga(r);
        if (c === null) senzaPrezzo.add(r.provider || r.modello || 'sconosciuto');
        else euro += c;
    }
    return { euro, prezzoMancante: [...senzaPrezzo] };
}

/**
 * Il quadro completo: quanto è stato speso, quanto resta, e — al ritmo degli
 * ultimi giorni — quando finisce.
 *
 * La proiezione usa i giorni di storico REALI, non sempre sette: se il registro
 * è partito ieri, dividere per sette farebbe sembrare il consumo sette volte più
 * lento di com'è.
 */
export function quadroBudget(riepilogo) {
    if (!riepilogo) return null;

    const budgetTotale = BUDGET.anthropic + BUDGET.openai;
    const totale = spesa(riepilogo.totale);
    const recente = spesa(riepilogo.ultimiSetteGiorni);

    const giorni = Math.max(riepilogo.giorniDiStorico || 0, 0.5);
    const alGiorno = recente.euro / giorni;

    const residuo = Math.max(budgetTotale - totale.euro, 0);
    const percentuale = budgetTotale > 0 ? (totale.euro / budgetTotale) * 100 : 0;

    // Senza consumo recente non c'è nessun ritmo da proiettare: dire "fra 9999
    // giorni" sarebbe rumore, meglio non dire niente.
    const giorniRimasti = alGiorno > 0 ? residuo / alGiorno : null;
    const fine = giorniRimasti === null
        ? null
        : new Date(Date.now() + giorniRimasti * 24 * 3600 * 1000);

    const ricarica = new Date(`${PROSSIMA_RICARICA}T00:00:00`);
    const arrivaAllaRicarica = fine === null ? true : fine >= ricarica;

    return {
        budgetTotale,
        speso: totale.euro,
        residuo,
        percentuale,
        alGiorno,
        giorniRimasti,
        fine,
        ricarica,
        arrivaAllaRicarica,
        prezzoMancante: [...new Set([...totale.prezzoMancante, ...recente.prezzoMancante])],
        ripieghi: riepilogo.ripieghiSetteGiorni || 0,
        // Tre gradini: sotto metà è tutto normale e non serve dire niente;
        // dall'80% si guarda; dal 95% si ricarica adesso.
        livello: percentuale >= 95 ? 'critico' : percentuale >= 80 ? 'attenzione' : percentuale >= 50 ? 'meta' : 'ok',
    };
}

export function euro(n) {
    if (n === null || n === undefined) return '—';
    if (n < 0.01 && n > 0) return '< 0,01 €';
    return `${n.toFixed(2).replace('.', ',')} €`;
}
