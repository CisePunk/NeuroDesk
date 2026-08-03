import { useEffect, useRef, useState } from 'react';
import { testi } from '../i18n/lingua';
import SelettoreLingua from './SelettoreLingua';

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

const GUIDE = [
    { lingua: 'Italiano', url: 'https://neurodesk.it/aiuto.html' },
    { lingua: 'English', url: 'https://neurodesk.it/aiuto.en.html' },
    { lingua: 'Français', url: 'https://neurodesk.it/aiuto.fr.html' },
];

export function AiutoInLinea() {
    // Titoli e passi vengono dal dizionario: chi si blocca deve leggere l'aiuto
    // nella propria lingua, altrimenti l'aiuto e' un ostacolo in piu'.
    const t = testi();
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
                title={t.aiutoTitolo}
            >
                <span aria-hidden="true">?</span>
                <span className="sr-only">{t.aiutoApri}</span>
            </button>

            {aperto && (
                <>
                    <div className="aiuto-velo" onClick={() => setAperto(false)} aria-hidden="true" />
                    <div
                        ref={pannello}
                        className="aiuto-pannello"
                        role="dialog"
                        aria-modal="true"
                        aria-label={t.aiutoTitolo}
                        tabIndex={-1}
                    >
                        <div className="aiuto-testa">
                            <strong>{t.aiutoTitolo}</strong>
                            <button type="button" className="btn-ghost aiuto-chiudi" onClick={() => { setAperto(false); bottone.current?.focus(); }}>
                                {t.aiutoChiudi}
                            </button>
                        </div>

                        {/* Cambiare lingua qui: l'aiuto (e tutta l'app) si
                            ricarica nella lingua scelta. È il punto in cui serve
                            di più — chi apre l'aiuto è chi si è bloccato. */}
                        <SelettoreLingua className="selettore-lingua--aiuto" />

                        <p className="aiuto-intro">{t.aiutoIntro}</p>

                        {t.aiutoVoci.map((v) => (
                            <details key={v.titolo} className="aiuto-voce">
                                <summary>{v.titolo}</summary>
                                <ol>
                                    {v.passi.map((p, i) => <li key={i}>{p}</li>)}
                                </ol>
                            </details>
                        ))}

                        <div className="aiuto-piede">
                            <span>{t.aiutoGuida}</span>{' '}
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
