import { useState } from 'react';
import { getUtenti, creaCodice, impostaStato } from '../api/utentiApi';
import { useAsyncData } from '../ui/useAsyncData';
import { StatoLista } from '../ui/StatoLista';
import { useToast } from '../ui/ToastProvider';

function formattaData(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '';
    }
}

// Gestione utenti = gestione dei CODICI anonimi (crea una volta, revoca).
// Nessun nome/email: privacy e GDPR by design.
function UtentiPage() {
    const toast = useToast();
    const { dati, caricamento, errore, ricarica } = useAsyncData(getUtenti);
    const utenti = dati ?? [];

    const [mostraForm, setMostraForm] = useState(false);
    const [etichetta, setEtichetta] = useState('');
    const [creando, setCreando] = useState(false);
    const [codiceCreato, setCodiceCreato] = useState(null); // {id, codice, etichetta}
    const [azioneId, setAzioneId] = useState(null);

    async function handleCrea(e) {
        e.preventDefault();
        setCreando(true);
        try {
            const res = await creaCodice(etichetta.trim());
            setCodiceCreato(res);
            setEtichetta('');
            setMostraForm(false);
            ricarica();
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setCreando(false);
        }
    }

    async function copia(codice) {
        try {
            await navigator.clipboard.writeText(codice);
            toast.successo('Codice copiato.');
        } catch {
            toast.errore('Copia non riuscita: selezionalo a mano.');
        }
    }

    async function toggleStato(u) {
        setAzioneId(u.id);
        try {
            await impostaStato(u.id, !u.attivo);
            toast.successo(u.attivo ? 'Accesso revocato.' : 'Accesso riattivato.');
            ricarica();
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setAzioneId(null);
        }
    }

    return (
        <div className="page">
            <div className="page-header">
                <h2>Utenti</h2>
                <button
                    className="btn-primary"
                    onClick={() => { setMostraForm(v => !v); setCodiceCreato(null); }}
                >
                    + Genera codice
                </button>
            </div>

            <p style={{ color: 'var(--text-2, #666)', maxWidth: '46rem', marginTop: '-0.4rem' }}>
                Ogni utente accede con un <strong>codice anonimo</strong> rilasciato da te. Il codice si crea una
                volta, identifica l'utente <strong>senza nome né email</strong>, e la gestione resta tua: puoi
                revocarlo quando vuoi.
            </p>

            {mostraForm && (
                <form
                    onSubmit={handleCrea}
                    style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', margin: '1rem 0' }}
                >
                    <input
                        type="text"
                        value={etichetta}
                        onChange={e => setEtichetta(e.target.value)}
                        maxLength={60}
                        placeholder="Etichetta facoltativa (es. 'Gruppo A - 01') — nessun dato personale"
                        style={{ flex: '1 1 24rem', padding: '0.6rem 0.8rem', borderRadius: '0.6rem', border: '1px solid var(--border, #ccc)', background: 'var(--surface, #fff)', color: 'inherit' }}
                    />
                    <button className="btn-primary" type="submit" disabled={creando}>
                        {creando ? '…' : 'Genera codice'}
                    </button>
                    <button className="btn-ghost" type="button" onClick={() => setMostraForm(false)}>
                        Annulla
                    </button>
                </form>
            )}

            {codiceCreato && (
                <div style={{ margin: '1rem 0', padding: '1rem 1.2rem', borderRadius: '0.9rem', border: '1px solid var(--accent, #5f8279)', background: 'var(--accent-soft, rgba(95,130,121,0.10))' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                        Codice creato{codiceCreato.etichetta ? ` per "${codiceCreato.etichetta}"` : ''} —{' '}
                        <span style={{ color: '#b04545' }}>si vede una sola volta</span>. Copialo e consegnalo all'utente.
                    </p>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.7rem', flexWrap: 'wrap' }}>
                        <code style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.02em', padding: '0.45rem 0.7rem', background: 'var(--surface, #fff)', borderRadius: '0.5rem', border: '1px solid var(--border, #ccc)' }}>
                            {codiceCreato.codice}
                        </code>
                        <button className="btn-secondary" type="button" onClick={() => copia(codiceCreato.codice)}>
                            Copia
                        </button>
                        <button className="btn-ghost" type="button" onClick={() => setCodiceCreato(null)}>
                            Ho salvato il codice
                        </button>
                    </div>
                </div>
            )}

            <StatoLista
                caricamento={caricamento}
                errore={errore}
                vuoto={utenti.length === 0}
                messaggioVuoto="Nessun utente ancora. Genera il primo codice."
                onRiprova={ricarica}
            >
                <div className="card-list">
                    {utenti.map((u, i) => (
                        <div key={u.id} className="card" style={{ animationDelay: `${i * 55}ms` }}>
                            <div className="card-title">{u.etichetta || 'Utente senza etichetta'}</div>
                            <div className="card-detail">Creato il {formattaData(u.creatoIl)}</div>
                            <div>
                                <span className={`badge ${u.attivo ? 'badge-success' : 'badge-muted'}`}>
                                    {u.attivo ? 'Attivo' : 'Revocato'}
                                </span>
                                <span className={`badge ${u.consensoDato ? 'badge-secondary' : 'badge-muted'}`}>
                                    {u.consensoDato ? 'Consenso dato' : 'Consenso in attesa'}
                                </span>
                            </div>
                            <div style={{ marginTop: '0.6rem' }}>
                                <button
                                    className={u.attivo ? 'btn-ghost' : 'btn-secondary'}
                                    onClick={() => toggleStato(u)}
                                    disabled={azioneId === u.id}
                                >
                                    {azioneId === u.id ? '…' : (u.attivo ? 'Revoca accesso' : 'Riattiva')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </StatoLista>
        </div>
    );
}

export default UtentiPage;
