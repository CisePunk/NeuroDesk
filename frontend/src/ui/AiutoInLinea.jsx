import { useEffect, useRef, useState } from 'react';

/**
 * Aiuto raggiungibile da qualsiasi punto dell'app, sempre.
 *
 * Perche' dentro l'app e non solo sul sito: chi si blocca si blocca MENTRE sta
 * usando il Companion, e mandarlo a cercare una pagina di aiuto altrove
 * significa fargli perdere il filo proprio nel momento in cui il filo era la cosa
 * che gli serviva. Qui l'aiuto si apre sopra quello che stava facendo e si
 * chiude lasciandolo dov'era.
 *
 * Perche' non rallenta: e' testo gia' presente nella pagina, nessuna chiamata di
 * rete, nessun caricamento. Il pannello non esiste nel DOM finche' non lo si
 * apre.
 *
 * Perche' <details> e non un accordione fatto a mano: si apre da tastiera, lo
 * legge lo screen reader, e funziona anche se il JavaScript si rompe. Una voce
 * alla volta, come tutto il resto qui dentro.
 */

const VOCI = [
    {
        titolo: 'La pagina è diventata bianca',
        passi: [
            'Ricarica la pagina. Da computer premi F5. Da telefono trascina il dito verso il basso.',
            'Se torna bianca una seconda volta, svuota la cache: trovi come si fa qui sotto.',
            'Quello che avevi scritto non è perso: le conversazioni sono salvate sul server, non nel browser.',
        ],
    },
    {
        titolo: 'Non riesco a entrare col mio codice',
        passi: [
            'Controlla che ci siano tutti i trattini: il codice è fatto come neuro-xxxx-xxxx-xxxx-xxxx.',
            'Copialo e incollalo invece di riscriverlo: è lungo e un carattere sbagliato basta.',
            'Se hai sbagliato molte volte di fila, l’accesso si blocca per un quarto d’ora. Non è un guasto: aspetta e riprova.',
            'Se il codice non lo trovi più, chiedine uno nuovo: quello vecchio non è recuperabile da nessuno, nemmeno da noi.',
        ],
    },
    {
        titolo: 'Il Companion non risponde',
        passi: [
            'Aspetta una decina di secondi e riprova: a volte è solo lento.',
            'Se compare un messaggio che dice che il problema è dalla nostra parte, è vero ed è dalla nostra: non dipende da te né da quello che hai scritto.',
            'Se dice di non riprovare adesso, non riprovare: torna più tardi. Quello che hai scritto resta salvato.',
        ],
    },
    {
        titolo: 'Come svuoto la cache',
        passi: [
            'Chrome o Edge: premi Ctrl+Shift+R (su Mac Cmd+Shift+R). Ricarica saltando la cache.',
            'Safari su Mac: tieni premuto Shift e clicca il pulsante di ricarica.',
            'Su telefono: chiudi del tutto la scheda, poi riapri app.neurodesk.it.',
            'Se non basta: impostazioni del browser, cancella i dati di navigazione, solo «immagini e file memorizzati». Non serve cancellare le password.',
        ],
    },
    {
        titolo: 'Ho perso la conversazione',
        passi: [
            'Ricarica la pagina: la conversazione viene ripresa dal server.',
            'Se non torna, era una conversazione più vecchia di 30 giorni: le cancelliamo apposta, è la promessa che ti abbiamo fatto.',
        ],
    },
    {
        titolo: 'Voglio uscire, o non sono da solo al computer',
        passi: [
            'Premi «Esci». Da computer è in fondo alla barra a sinistra, da telefono è l’ultima voce della barra in basso.',
            'L’accesso resta valido 8 ore, poi ti richiede il codice da solo.',
            'Se il dispositivo è condiviso, esci ogni volta che ti alzi: qui dentro c’è roba tua.',
        ],
    },
    {
        titolo: 'Che fine fanno le cose che scrivo',
        passi: [
            'Sono cifrate e vengono cancellate da sole dopo 30 giorni.',
            'Il tuo accesso è anonimo: non abbiamo il tuo nome né la tua email.',
            'Se vuoi che cancelliamo tutto subito, scrivicelo: lo facciamo.',
        ],
    },
];

const GUIDE = [
    { lingua: 'Italiano', url: 'https://neurodesk.it/aiuto.html' },
    { lingua: 'English', url: 'https://neurodesk.it/aiuto.en.html' },
    { lingua: 'Français', url: 'https://neurodesk.it/aiuto.fr.html' },
];

export function AiutoInLinea() {
    const [aperto, setAperto] = useState(false);
    const pannello = useRef(null);
    const bottone = useRef(null);

    // Esc chiude, e il fuoco torna al bottone da cui si era partiti: chi naviga da
    // tastiera non deve ritrovarsi in cima alla pagina senza sapere dov'e'.
    useEffect(() => {
        if (!aperto) return;
        const suTasto = (e) => { if (e.key === 'Escape') { setAperto(false); bottone.current?.focus(); } };
        document.addEventListener('keydown', suTasto);
        pannello.current?.focus();
        return () => document.removeEventListener('keydown', suTasto);
    }, [aperto]);

    return (
        <>
            <button
                ref={bottone}
                type="button"
                className="aiuto-fab"
                aria-expanded={aperto}
                aria-haspopup="dialog"
                onClick={() => setAperto(v => !v)}
                title="Aiuto"
            >
                <span aria-hidden="true">?</span>
                <span className="sr-only">Apri l’aiuto</span>
            </button>

            {aperto && (
                <>
                    <div className="aiuto-velo" onClick={() => setAperto(false)} aria-hidden="true" />
                    <div
                        ref={pannello}
                        className="aiuto-pannello"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Aiuto"
                        tabIndex={-1}
                    >
                        <div className="aiuto-testa">
                            <strong>Aiuto</strong>
                            <button type="button" className="btn-ghost aiuto-chiudi" onClick={() => { setAperto(false); bottone.current?.focus(); }}>
                                Chiudi
                            </button>
                        </div>

                        <p className="aiuto-intro">
                            Scegli la cosa che ti sta succedendo. Ogni risposta è un passo alla volta:
                            fai il primo, poi passa al secondo.
                        </p>

                        {VOCI.map((v) => (
                            <details key={v.titolo} className="aiuto-voce">
                                <summary>{v.titolo}</summary>
                                <ol>
                                    {v.passi.map((p, i) => <li key={i}>{p}</li>)}
                                </ol>
                            </details>
                        ))}

                        <div className="aiuto-piede">
                            <span>Guida completa:</span>{' '}
                            {GUIDE.map((g, i) => (
                                <span key={g.lingua}>
                                    {i > 0 && ' · '}
                                    <a href={g.url} target="_blank" rel="noopener noreferrer">{g.lingua}</a>
                                </span>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default AiutoInLinea;
