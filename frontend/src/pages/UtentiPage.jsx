import { useState } from 'react';
import { getUtenti, registraUtente, impostaStato } from '../api/utentiApi';
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

const FORM_VUOTO = { nome: '', cognome: '', email: '', livelloEnergiaPreferito: '', attivo: true };

// Gestionale utenti: la SCUOLA registra l'utente (col nome) e il sistema genera un
// codice di accesso anonimo collegato. Il nome vive qui; dati/chat vivono sul codice.
function UtentiPage() {
    const toast = useToast();
    const { dati, caricamento, errore, ricarica } = useAsyncData(getUtenti);
    const utenti = dati ?? [];

    const [mostraForm, setMostraForm] = useState(false);
    const [form, setForm] = useState(FORM_VUOTO);
    const [creando, setCreando] = useState(false);
    const [codiceCreato, setCodiceCreato] = useState(null); // { codice, nome, cognome }
    const [azioneId, setAzioneId] = useState(null);

    function change(e) {
        const { name, value, type, checked } = e.target;
        setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    }

    async function handleCrea(e) {
        e.preventDefault();
        setCreando(true);
        try {
            const res = await registraUtente(form);
            setCodiceCreato(res);
            setForm(FORM_VUOTO);
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
                    + Nuovo utente
                </button>
            </div>

            <p style={{ color: 'var(--text-2, #666)', maxWidth: '48rem', marginTop: '-0.4rem' }}>
                Registri l'utente con i suoi dati; il sistema genera un <strong>codice di accesso anonimo</strong>
                (mostrato una volta). Nome ed email restano nel tuo registro, <strong>separati</strong> dai dati e
                dalle chat, che vivono sul codice — così l'app resta anonima. Puoi revocare l'accesso quando vuoi.
            </p>

            {mostraForm && (
                <form onSubmit={handleCrea} className="form-card" style={{ maxWidth: '34rem', margin: '1rem 0' }}>
                    <div className="form-group">
                        <label>Nome</label>
                        <input type="text" name="nome" value={form.nome} onChange={change} required />
                    </div>
                    <div className="form-group">
                        <label>Cognome</label>
                        <input type="text" name="cognome" value={form.cognome} onChange={change} required />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value={form.email} onChange={change} required />
                    </div>
                    <div className="form-group">
                        <label>Livello energia preferito (facoltativo)</label>
                        <input
                            type="text"
                            name="livelloEnergiaPreferito"
                            value={form.livelloEnergiaPreferito}
                            onChange={change}
                            placeholder="es. mattina, bassa…"
                        />
                    </div>
                    <div className="form-group form-group-checkbox">
                        <label>
                            <input type="checkbox" name="attivo" checked={form.attivo} onChange={change} /> Attivo
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button className="btn-primary" type="submit" disabled={creando}>
                            {creando ? 'Salvataggio…' : 'Registra e genera codice'}
                        </button>
                        <button className="btn-ghost" type="button" onClick={() => setMostraForm(false)}>
                            Annulla
                        </button>
                    </div>
                </form>
            )}

            {codiceCreato && (
                <div style={{ margin: '1rem 0', padding: '1rem 1.2rem', borderRadius: '0.9rem', border: '1px solid var(--accent, #5f8279)', background: 'var(--accent-soft, rgba(95,130,121,0.10))' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                        Codice di accesso per <strong>{codiceCreato.nome} {codiceCreato.cognome}</strong> —{' '}
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
                messaggioVuoto="Nessun utente ancora. Registra il primo."
                onRiprova={ricarica}
            >
                <div className="card-list">
                    {utenti.map((u, i) => (
                        <div key={u.id} className="card" style={{ animationDelay: `${i * 55}ms` }}>
                            <div className="card-title">{u.nome} {u.cognome}</div>
                            <div className="card-detail">{u.email}</div>
                            <div>
                                {u.livelloEnergiaPreferito && (
                                    <span className="badge badge-secondary">{u.livelloEnergiaPreferito}</span>
                                )}
                                <span className={`badge ${u.attivo ? 'badge-success' : 'badge-muted'}`}>
                                    {u.attivo ? 'Attivo' : 'Revocato'}
                                </span>
                                <span className={`badge ${u.consensoDato ? 'badge-secondary' : 'badge-muted'}`}>
                                    {u.consensoDato ? 'Consenso dato' : 'Consenso in attesa'}
                                </span>
                            </div>
                            <div className="card-detail" style={{ marginTop: '0.3rem', opacity: 0.75 }}>
                                Registrato il {formattaData(u.creatoIl)}
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
