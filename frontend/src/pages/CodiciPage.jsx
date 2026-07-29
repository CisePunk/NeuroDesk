import { useMemo, useState } from 'react';
import { getCodici, emettiCodice, impostaStatoCodice, getConsumo, rimuoviChiaveCodice } from '../api/codiciApi';
import { useAsyncData } from '../ui/useAsyncData';
import { StatoLista } from '../ui/StatoLista';
import { useToast } from '../ui/ToastProvider';
import { PannelloBudget } from '../ui/PannelloBudget';

// I token grezzi non dicono niente a colpo d'occhio: "184.2k" si confronta,
// "184231" no. Serve a vedere in un attimo chi consuma fuori scala.
function formattaToken(n) {
    if (!n) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
}

function formattaData(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return '';
    }
}

/**
 * Registro dei codici emessi: chi ce l'ha, da quando, chi ha dato il consenso,
 * chi e' stato revocato. Prima i codici si potevano emettere solo via API e non
 * si vedevano da nessuna parte: la pagina Utenti legge l'anagrafica (/api/studenti),
 * che con i codici anonimi resta vuota.
 *
 * Il codice in chiaro esiste per un istante solo: qui viene mostrato appena emesso
 * e mai piu'. Nel database c'e' solo la sua impronta cifrata.
 */
function CodiciPage() {
    const toast = useToast();
    const { dati, caricamento, errore, ricarica } = useAsyncData(getCodici);
    const codici = useMemo(() => dati ?? [], [dati]);
    // Il consumo si carica a parte: se quell'endpoint fallisce, l'elenco dei
    // codici deve restare utilizzabile lo stesso.
    const { dati: consumo } = useAsyncData(getConsumo);

    const [mostraForm, setMostraForm] = useState(false);
    const [etichetta, setEtichetta] = useState('');
    const [emettendo, setEmettendo] = useState(false);
    const [appenaEmesso, setAppenaEmesso] = useState(null); // { id, codice, etichetta }
    const [azioneId, setAzioneId] = useState(null);
    const [filtro, setFiltro] = useState('');

    const riepilogo = useMemo(() => ({
        totale: codici.length,
        attivi: codici.filter(c => c.attivo).length,
        conConsenso: codici.filter(c => c.consensoDato).length,
        tokenTotali: codici.reduce((s, c) => s + (c.tokenInput || 0) + (c.tokenOutput || 0), 0),
        // La media si calcola solo su chi ha davvero scritto: includere i codici
        // mai usati la schiaccerebbe verso zero e farebbe sembrare anomalo chiunque.
        mediaAttivi: (() => {
            const usati = codici.filter(c => c.chiamate > 0);
            if (!usati.length) return 0;
            return usati.reduce((s, c) => s + (c.tokenInput || 0) + (c.tokenOutput || 0), 0) / usati.length;
        })(),
    }), [codici]);

    const visibili = useMemo(() => {
        const q = filtro.trim().toLowerCase();
        if (!q) return codici;
        return codici.filter(c => (c.etichetta || '').toLowerCase().includes(q));
    }, [codici, filtro]);

    async function handleEmetti(e) {
        e.preventDefault();
        setEmettendo(true);
        try {
            const res = await emettiCodice(etichetta);
            setAppenaEmesso(res);
            setEtichetta('');
            setMostraForm(false);
            ricarica();
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setEmettendo(false);
        }
    }

    async function copia(codice) {
        try {
            await navigator.clipboard.writeText(codice);
            toast.successo('Codice copiato.');
        } catch {
            // Su http non sicuro o senza permesso la clipboard non c'e': non e' un errore
            // dell'utente, quindi gli si dice cosa fare invece di lasciarlo fermo.
            toast.errore('Copia non riuscita: selezionalo a mano.');
        }
    }

    async function togliChiave(c) {
        const nome = c.etichetta || `codice #${c.id}`;
        if (!window.confirm(`Togliere la chiave personale di "${nome}"? Tornerà a consumare il credito comune.`)) return;
        setAzioneId(c.id);
        try {
            await rimuoviChiaveCodice(c.id);
            toast.successo('Chiave rimossa.');
            ricarica();
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setAzioneId(null);
        }
    }

    async function toggleStato(c) {
        const revoca = c.attivo;
        const nome = c.etichetta || `codice #${c.id}`;
        if (revoca && !window.confirm(`Revocare l'accesso a "${nome}"? Non potrà più entrare. Puoi riattivarlo quando vuoi.`)) {
            return;
        }
        setAzioneId(c.id);
        try {
            await impostaStatoCodice(c.id, !c.attivo);
            toast.successo(revoca ? 'Accesso revocato.' : 'Accesso riattivato.');
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
                <h2>Codici</h2>
                <button
                    className="btn-primary"
                    onClick={() => { setMostraForm(v => !v); setAppenaEmesso(null); }}
                >
                    + Emetti un codice
                </button>
            </div>

            <p style={{ color: 'var(--text-2, #666)', maxWidth: '48rem', marginTop: '-0.4rem' }}>
                Ogni codice è un accesso <strong>anonimo</strong>: niente nome, niente email. L'etichetta
                serve solo a te, per ricordarti a chi l'hai dato, e resta in questa pagina. Il codice in
                chiaro <strong>si vede una volta sola</strong>, appena emesso: dopo non è più recuperabile,
                perché nel database ne resta solo l'impronta cifrata.
            </p>

            {!caricamento && !errore && codici.length > 0 && (
                <div className="card-detail" style={{ marginTop: '0.2rem' }}>
                    <strong>{riepilogo.totale}</strong> emessi · <strong>{riepilogo.attivi}</strong> attivi
                    {' '}· <strong>{riepilogo.conConsenso}</strong> hanno dato il consenso
                    {riepilogo.tokenTotali > 0 && (
                        <> · <strong>{formattaToken(riepilogo.tokenTotali)}</strong> token consumati in tutto</>
                    )}
                </div>
            )}

            {consumo && <PannelloBudget riepilogo={consumo} />}

            {mostraForm && (
                <form onSubmit={handleEmetti} className="form-card" style={{ maxWidth: '34rem', margin: '1rem 0' }}>
                    <div className="form-group">
                        <label htmlFor="etichetta-codice">A chi lo dai? (facoltativo)</label>
                        <input
                            id="etichetta-codice"
                            type="text"
                            value={etichetta}
                            onChange={(e) => setEtichetta(e.target.value)}
                            maxLength={60}
                            placeholder="es. «tester 5», oppure un soprannome"
                            autoFocus
                        />
                        <small style={{ color: 'var(--text-3, #888)' }}>
                            Un nome di battesimo o un soprannome basta. Non usare cognomi, email o dati sensibili.
                        </small>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button className="btn-primary" type="submit" disabled={emettendo}>
                            {emettendo ? 'Genero…' : 'Emetti il codice'}
                        </button>
                        <button className="btn-ghost" type="button" onClick={() => setMostraForm(false)}>
                            Annulla
                        </button>
                    </div>
                </form>
            )}

            {appenaEmesso && (
                <div style={{ margin: '1rem 0', padding: '1rem 1.2rem', borderRadius: '0.9rem', border: '1px solid var(--accent, #5f8279)', background: 'var(--accent-soft, rgba(95,130,121,0.10))' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                        Codice per <strong>{appenaEmesso.etichetta || 'nuovo accesso'}</strong> —{' '}
                        <span style={{ color: '#b04545' }}>si vede una sola volta</span>. Copialo e consegnalo adesso.
                    </p>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.7rem', flexWrap: 'wrap' }}>
                        <code style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.02em', padding: '0.45rem 0.7rem', background: 'var(--surface, #fff)', borderRadius: '0.5rem', border: '1px solid var(--border, #ccc)' }}>
                            {appenaEmesso.codice}
                        </code>
                        <button className="btn-secondary" type="button" onClick={() => copia(appenaEmesso.codice)}>
                            Copia
                        </button>
                        <button className="btn-ghost" type="button" onClick={() => setAppenaEmesso(null)}>
                            Ho salvato il codice
                        </button>
                    </div>
                </div>
            )}

            {codici.length > 3 && (
                <div className="form-group" style={{ maxWidth: '22rem', marginTop: '0.8rem' }}>
                    <label htmlFor="filtro-codici">Cerca per etichetta</label>
                    <input
                        id="filtro-codici"
                        type="search"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        placeholder="cerca…"
                    />
                </div>
            )}

            <StatoLista
                caricamento={caricamento}
                errore={errore}
                vuoto={visibili.length === 0}
                messaggioVuoto={
                    codici.length === 0
                        ? 'Nessun codice emesso. Emetti il primo.'
                        : 'Nessun codice con questa etichetta.'
                }
                onRiprova={ricarica}
            >
                <div className="card-list">
                    {visibili.map((c, i) => (
                        <div key={c.id} className="card" style={{ animationDelay: `${i * 55}ms` }}>
                            <div className="card-title">{c.etichetta || `Codice #${c.id}`}</div>
                            <div>
                                <span className={`badge ${c.attivo ? 'badge-success' : 'badge-muted'}`}>
                                    {c.attivo ? 'Attivo' : 'Revocato'}
                                </span>
                                <span className={`badge ${c.consensoDato ? 'badge-secondary' : 'badge-muted'}`}>
                                    {c.consensoDato ? 'Consenso dato' : 'Consenso in attesa'}
                                </span>
                                {c.chiavePropria && (
                                    <span className="badge badge-success" title="Paga le proprie risposte con la sua chiave API">
                                        chiave sua · {c.chiaveProvider}
                                    </span>
                                )}
                            </div>
                            <div className="card-detail" style={{ marginTop: '0.3rem', opacity: 0.75 }}>
                                Emesso il {formattaData(c.creatoIl)}
                                {c.ultimoUso && <> · ultimo uso {formattaData(c.ultimoUso)}</>}
                            </div>
                            {c.chiamate > 0 && (() => {
                                const token = (c.tokenInput || 0) + (c.tokenOutput || 0);
                                // Tre volte la media di chi usa il Companion: non e' una
                                // soglia con un significato, e' solo la riga che merita
                                // un'occhiata. Non blocca e non avvisa nessuno.
                                const fuoriScala = riepilogo.mediaAttivi > 0 && token > riepilogo.mediaAttivi * 3;
                                return (
                                    <div className="card-detail" style={{ marginTop: '0.2rem' }}>
                                        <strong>{c.chiamate}</strong> richieste ·{' '}
                                        <strong>{formattaToken(token)}</strong> token
                                        {fuoriScala && (
                                            <span style={{ color: '#b04545', fontWeight: 600 }}>
                                                {' '}— oltre il triplo della media, vale un'occhiata
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                            <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    className={c.attivo ? 'btn-ghost' : 'btn-secondary'}
                                    onClick={() => toggleStato(c)}
                                    disabled={azioneId === c.id}
                                >
                                    {azioneId === c.id ? '…' : (c.attivo ? 'Revoca accesso' : 'Riattiva')}
                                </button>
                                {/* La chiave la mette la persona stessa, dalle opzioni
                                    del Companion: qui non si puo' inserire, solo togliere
                                    — che serve per aiutare chi resta bloccato con una
                                    chiave che non funziona piu'. */}
                                {c.chiavePropria && (
                                    <button className="btn-ghost" onClick={() => togliChiave(c)} disabled={azioneId === c.id}>
                                        Togli la sua chiave
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </StatoLista>
        </div>
    );
}

export default CodiciPage;
