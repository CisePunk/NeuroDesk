import { useMemo, useState } from 'react';
import { getCodici, emettiCodice, impostaStatoCodice, getConsumo, rimuoviChiaveCodice, rinominaCodice } from '../api/codiciApi';
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

// Con l'ora: "chi ha usato e QUANDO" ha bisogno del minuto, non solo del giorno.
function formattaDataOra(iso) {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleString('it-IT', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
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
    // I revocati stanno nascosti: sono quasi tutti codici di prova, e gonfiavano
    // i conteggi al punto da rendere la pagina difficile da leggere.
    const [mostraRevocati, setMostraRevocati] = useState(false);
    // Rinomina in linea: id del codice in modifica e testo corrente.
    const [rinominaId, setRinominaId] = useState(null);
    const [nuovoNome, setNuovoNome] = useState('');

    const riepilogo = useMemo(() => ({
        totale: codici.length,
        attivi: codici.filter(c => c.attivo).length,
        revocati: codici.filter(c => !c.attivo).length,
        // Il consenso si conta solo su chi e' ancora attivo: includere i revocati
        // (quasi tutti prove) faceva sembrare che avessero accettato in molti piu'.
        conConsenso: codici.filter(c => c.attivo && c.consensoDato).length,
        // Chi ha DAVVERO usato il Companion, dai messaggi: il numero che le serve
        // a colpo d'occhio, senza aprire card per card.
        hannoUsato: codici.filter(c => c.messaggiUsati > 0).length,
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
        let lista = mostraRevocati ? codici : codici.filter(c => c.attivo);
        if (q) lista = lista.filter(c => (c.etichetta || '').toLowerCase().includes(q));
        return lista;
    }, [codici, filtro, mostraRevocati]);

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

    async function salvaNome(c) {
        setAzioneId(c.id);
        try {
            await rinominaCodice(c.id, nuovoNome);
            setRinominaId(null);
            toast.successo('Etichetta aggiornata.');
            ricarica();
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setAzioneId(null);
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
                    <strong>{riepilogo.attivi}</strong> accessi attivi ·{' '}
                    <strong>{riepilogo.conConsenso}</strong> hanno dato il consenso ·{' '}
                    <strong style={{ color: 'var(--success)' }}>{riepilogo.hannoUsato}</strong> hanno usato il Companion
                    {riepilogo.tokenTotali > 0 && (
                        <> · <strong>{formattaToken(riepilogo.tokenTotali)}</strong> token consumati in tutto</>
                    )}
                    {riepilogo.revocati > 0 && (
                        <>
                            {' · '}
                            <button
                                type="button"
                                className="link-inline"
                                onClick={() => setMostraRevocati(v => !v)}
                            >
                                {mostraRevocati
                                    ? `nascondi i ${riepilogo.revocati} revocati`
                                    : `mostra anche i ${riepilogo.revocati} revocati`}
                            </button>
                        </>
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
                            {rinominaId === c.id ? (
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        type="text"
                                        value={nuovoNome}
                                        onChange={(e) => setNuovoNome(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') salvaNome(c); if (e.key === 'Escape') setRinominaId(null); }}
                                        maxLength={60}
                                        autoFocus
                                        style={{ flex: '1 1 12rem' }}
                                    />
                                    <button className="btn-primary" onClick={() => salvaNome(c)} disabled={azioneId === c.id}>
                                        Salva
                                    </button>
                                    <button className="btn-ghost" onClick={() => setRinominaId(null)}>Annulla</button>
                                </div>
                            ) : (
                                <div className="card-title" style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                                    <span>{c.etichetta || `Codice #${c.id}`}</span>
                                    <button
                                        type="button"
                                        className="link-inline"
                                        style={{ fontSize: '0.78rem', fontWeight: 400 }}
                                        onClick={() => { setRinominaId(c.id); setNuovoNome(c.etichetta || ''); }}
                                    >
                                        rinomina
                                    </button>
                                </div>
                            )}
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
                            </div>

                            {/* ATTIVITA' REALE, dai messaggi: chi ha usato il Companion e
                                quando. Copre anche chi l'ha usato prima che nascesse il
                                conteggio dei token (28 luglio 2026). */}
                            {c.messaggiUsati > 0 ? (
                                <div className="card-detail" style={{ marginTop: '0.3rem' }}>
                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                        ✓ ha usato il Companion
                                    </span>{' — '}
                                    <strong>{c.messaggiUsati}</strong> {c.messaggiUsati === 1 ? 'messaggio' : 'messaggi'}
                                    <div style={{ opacity: 0.75, marginTop: '0.15rem' }}>
                                        prima volta {formattaDataOra(c.primaAttivita)}
                                        {c.ultimaAttivita && c.ultimaAttivita !== c.primaAttivita && (
                                            <> · ultima {formattaDataOra(c.ultimaAttivita)}</>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="card-detail" style={{ marginTop: '0.3rem', opacity: 0.6 }}>
                                    non è ancora entrato nel Companion
                                </div>
                            )}

                            {c.chiamate > 0 && (() => {
                                const token = (c.tokenInput || 0) + (c.tokenOutput || 0);
                                // Tre volte la media di chi usa il Companion: non e' una
                                // soglia con un significato, e' solo la riga che merita
                                // un'occhiata. Non blocca e non avvisa nessuno.
                                const fuoriScala = riepilogo.mediaAttivi > 0 && token > riepilogo.mediaAttivi * 3;
                                return (
                                    <div className="card-detail" style={{ marginTop: '0.2rem', opacity: 0.75 }}>
                                        token consumati: <strong>{formattaToken(token)}</strong>
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
