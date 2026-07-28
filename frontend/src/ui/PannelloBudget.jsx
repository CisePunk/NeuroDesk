import { quadroBudget, euro, PROSSIMA_RICARICA } from '../api/costi';

const COLORI = {
    ok: '#5f8279',
    meta: '#8a7b3f',
    attenzione: '#b07a30',
    critico: '#b04545',
};

function dataBreve(d) {
    if (!d) return '—';
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}

/**
 * Quanto credito AI resta, e quando finisce al ritmo attuale.
 *
 * La domanda utile non è "quanto ho speso" ma "ci arrivo alla ricarica": una
 * percentuale da sola non dice se bisogna fare qualcosa, una data sì. Perciò il
 * riferimento non è una soglia astratta ma il giorno in cui arrivano i soldi.
 *
 * Non blocca e non limita niente: qui si guarda soltanto.
 */
export function PannelloBudget({ riepilogo }) {
    const q = quadroBudget(riepilogo);
    if (!q) return null;

    const colore = COLORI[q.livello];
    const larghezza = Math.min(q.percentuale, 100);

    return (
        <div
            className="card-detail"
            style={{
                marginTop: '0.6rem',
                padding: '0.9rem 1.1rem',
                borderRadius: '0.9rem',
                border: `1px solid ${q.livello === 'ok' ? 'var(--border, #ddd)' : colore}`,
                background: q.livello === 'ok' ? 'transparent' : `${colore}12`,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '1rem' }}>Credito AI</strong>
                <span>
                    <strong>{euro(q.speso)}</strong> di {euro(q.budgetTotale)}
                    {' '}({q.percentuale < 1 ? '<1' : Math.round(q.percentuale)}%)
                </span>
            </div>

            <div
                aria-hidden="true"
                style={{
                    height: '0.5rem',
                    borderRadius: '0.25rem',
                    background: 'var(--border, #e3e3e3)',
                    margin: '0.55rem 0 0.6rem',
                    overflow: 'hidden',
                }}
            >
                <div style={{ width: `${larghezza}%`, height: '100%', background: colore, transition: 'width .4s' }} />
            </div>

            <div>
                {q.alGiorno > 0 ? (
                    <>
                        Circa <strong>{euro(q.alGiorno)}</strong> al giorno.{' '}
                        {q.arrivaAllaRicarica ? (
                            <span style={{ color: COLORI.ok }}>
                                A questo ritmo arrivi alla ricarica del {dataBreve(q.ricarica)} con{' '}
                                {euro(q.residuo - q.alGiorno * Math.max((q.ricarica - Date.now()) / 86400000, 0))} in cassa.
                            </span>
                        ) : (
                            <strong style={{ color: COLORI.critico }}>
                                A questo ritmo finisce il {dataBreve(q.fine)}, prima della ricarica del{' '}
                                {dataBreve(q.ricarica)}.
                            </strong>
                        )}
                    </>
                ) : (
                    <span style={{ opacity: 0.75 }}>
                        Nessun consumo negli ultimi giorni: non c'è ancora un ritmo da proiettare.
                    </span>
                )}
            </div>

            {q.ripieghi > 0 && (
                <div style={{ marginTop: '0.35rem', color: COLORI.attenzione }}>
                    <strong>{q.ripieghi}</strong>{' '}
                    {q.ripieghi === 1 ? 'richiesta è stata servita' : 'richieste sono state servite'} dal
                    provider di riserva negli ultimi 7 giorni: il principale ha avuto problemi.
                </div>
            )}

            {q.prezzoMancante.length > 0 && (
                <div style={{ marginTop: '0.35rem', opacity: 0.8 }}>
                    Il consumo di <strong>{q.prezzoMancante.join(', ')}</strong> è misurato ma non conteggiato
                    in euro: il listino non è stato verificato, e un numero inventato sarebbe peggio di
                    nessun numero.
                </div>
            )}

            <div style={{ marginTop: '0.4rem', fontSize: '0.85em', opacity: 0.6 }}>
                Stima sui prezzi di listino, cambio euro/dollaro approssimato. Prossima ricarica prevista:{' '}
                {PROSSIMA_RICARICA.split('-').reverse().join('/')}.
            </div>
        </div>
    );
}

export default PannelloBudget;
