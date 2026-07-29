import { useEffect, useRef, useState } from 'react';
import { sendCompanionMessage, getCompanionHealth } from '../api/companionApi';
import {
    salvaScambio,
    getSessioni,
    getSessione,
    cancellaCronologia,
} from '../api/companionSessionApi';
import { revocaConsenso } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui/ToastProvider';
import { testi } from '../i18n/lingua';

// Le modalita' prendono i testi dal dizionario: il valore ('crisis_mode', ...)
// non cambia mai con la lingua, perche' e' quello che viaggia verso il server e
// decide come risponde il Companion. Cambia solo cosa si legge a schermo.
function costruisciModes(t) {
    return [
        { value: 'crisis_mode',      label: t.modoBloccoL,     hint: t.modoBloccoH,     description: t.modoBloccoD },
        { value: 'study_mode',       label: t.modoStudioL,     hint: t.modoStudioH,     description: t.modoStudioD },
        { value: 'bureaucracy_mode', label: t.modoBurocraziaL, hint: t.modoBurocraziaH, description: t.modoBurocraziaD },
        { value: 'work_mode',        label: t.modoLavoroL,     hint: t.modoLavoroH,     description: t.modoLavoroD },
        { value: 'autonomy_mode',    label: t.modoAutonomieL,  hint: t.modoAutonomieH,  description: t.modoAutonomieD },
    ];
}

const PROFILE_TEMPLATE = {
    energy: 'bassa',
    memory: 'fragile',
    needs: ['micro-passaggi', 'tono semplice', 'niente liste lunghe'],
};

// Cache della conversazione in corso: resiste a refresh e cadute di rete, ma vive in
// sessionStorage -> muore quando si chiude la scheda. Prima era in localStorage (in
// chiaro, a tempo indeterminato): su un dispositivo condiviso restava leggibile a
// chiunque. Copia cifrata autorevole resta sul server, ripristinata al rientro.
const ACTIVE_KEY = 'nd-companion-active';

// Bonifica una tantum: rimuove la vecchia copia in chiaro lasciata in localStorage
// dalle versioni precedenti (i tester che non hanno mai fatto logout).
try { localStorage.removeItem(ACTIVE_KEY); } catch { /* ignora */ }

function leggiCache() {
    try {
        const raw = sessionStorage.getItem(ACTIVE_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw);
        return {
            conversation: Array.isArray(p.conversation) ? p.conversation : [],
            sessioneId: p.sessioneId ?? null,
            mode: p.mode ?? null,
        };
    } catch {
        return null;
    }
}

function CompanionPage() {
    const toast = useToast();
    const { ruolo, segnaRevocaConsenso } = useAuth();
    const textareaRef = useRef(null);
    // Stato iniziale ripristinato dal browser (istantaneo, regge refresh e disconnessioni).
    const [mode, setMode] = useState(() => leggiCache()?.mode ?? 'crisis_mode');
    const [message, setMessage] = useState('');
    const [includeProfile, setIncludeProfile] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [conversation, setConversation] = useState(() => leggiCache()?.conversation ?? []); // [{ role, content }]
    const [sessioneId, setSessioneId] = useState(() => leggiCache()?.sessioneId ?? null);
    const [lastMeta, setLastMeta] = useState(null); // { provider, usage }
    const [providerConfigurato, setProviderConfigurato] = useState(null); // stato reale da /health
    const [errore, setErrore] = useState('');
    const [caricamento, setCaricamento] = useState(false);
    const [parlando, setParlando] = useState(false); // TTS: sta leggendo la risposta ad alta voce
    // Voce del dispositivo (SpeechSynthesis): gira in locale, non tocca il server.
    const ttsDisponibile = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Lingua di chi legge: decide le etichette delle modalita' e i testi fissi
    // della pagina. Il valore della modalita' che viaggia al server non cambia.
    const t = testi();
    const MODES = costruisciModes(t);
    const activeMode = MODES.find(item => item.value === mode);

    // Stato reale del servizio: così il badge non afferma "mock" quando l'AI è vera.
    useEffect(() => {
        let attivo = true;
        getCompanionHealth()
            .then(h => { if (attivo) setProviderConfigurato(h?.provider ?? null); })
            .catch(() => { /* stato ignoto: il badge non afferma nulla */ });
        return () => { attivo = false; };
    }, []);

    // Ferma la voce se si lascia la pagina: niente audio che continua a sorpresa.
    useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

    // Se non c'era nulla nel browser, provo a riprendere l'ultima sessione dal server.
    useEffect(() => {
        try {
            if (sessionStorage.getItem(ACTIVE_KEY)) return; // già ripristinata dalla cache locale
        } catch { /* nessuna cache leggibile: si riprende dal server */ }
        let attivo = true;
        getSessioni()
            .then(list => {
                if (!attivo || !list || list.length === 0) return null;
                return getSessione(list[0].id).then(det => {
                    if (!attivo) return;
                    setSessioneId(det.id);
                    setConversation(det.messaggi.map(m => ({ role: m.ruolo, content: m.contenuto })));
                });
            })
            .catch(() => { /* nessuna memoria da riprendere: si parte puliti */ });
        return () => { attivo = false; };
    }, []);

    // Salvo in locale a ogni cambiamento, così un refresh o una caduta non perde nulla.
    // La scrittura può fallire (quota piena, Safari privato): se l'eccezione uscisse
    // da un effetto, React smonterebbe l'app e l'utente vedrebbe una pagina bianca.
    // La copia autorevole è comunque cifrata sul server, quindi qui si può ignorare.
    useEffect(() => {
        try {
            if (conversation.length === 0 && sessioneId == null) {
                sessionStorage.removeItem(ACTIVE_KEY);
                return;
            }
            sessionStorage.setItem(ACTIVE_KEY, JSON.stringify({ sessioneId, mode, conversation }));
        } catch { /* niente copia locale: resta quella sul server */ }
    }, [conversation, sessioneId, mode]);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrore('');

        const cleanMessage = message.trim();
        if (!cleanMessage) {
            setErrore(t.compVuoto);
            return;
        }

        const base = conversation;
        const history = base.map(m => ({ role: m.role, content: m.content }));
        setConversation([...base, { role: 'user', content: cleanMessage }]);
        setMessage('');
        setCaricamento(true);

        try {
            const data = await sendCompanionMessage({
                message: cleanMessage,
                mode,
                profile: includeProfile ? PROFILE_TEMPLATE : null,
                history,
            });
            setConversation([...base,
                { role: 'user', content: cleanMessage },
                { role: 'assistant', content: data.reply },
            ]);
            setLastMeta({ provider: data.provider, usage: data.usage });

            // Salvataggio cifrato sul server. Se fallisce, la conversazione resta
            // comunque nel browser e scaricabile: non blocco l'utente.
            try {
                const saved = await salvaScambio({
                    sessioneId,
                    titolo: activeMode?.label,
                    messaggioUtente: cleanMessage,
                    rispostaCompanion: data.reply,
                });
                if (saved?.sessioneId) setSessioneId(saved.sessioneId);
            } catch { /* memoria server non disponibile: resta la copia locale */ }
        } catch (err) {
            // Rollback del messaggio ottimista, così può riprovare senza doppioni.
            setConversation(base);
            setMessage(cleanMessage);
            setErrore(err.message);
        } finally {
            setCaricamento(false);
            setTimeout(() => textareaRef.current?.focus(), 50);
        }
    }

    function nuovaConversazione() {
        window.speechSynthesis?.cancel();
        setParlando(false);
        setConversation([]);
        setSessioneId(null);
        setMessage('');
        setLastMeta(null);
        setErrore('');
        try { sessionStorage.removeItem(ACTIVE_KEY); } catch { /* ignora */ }
        setTimeout(() => textareaRef.current?.focus(), 50);
    }

    // Legge ad alta voce l'ultima risposta del Companion. La voce è quella del
    // dispositivo (browser/OS): nessuna chiamata al server, nessun costo.
    function ascolta() {
        const synth = window.speechSynthesis;
        if (!synth) return;
        if (parlando) { synth.cancel(); setParlando(false); return; }
        let testo = '';
        for (let i = conversation.length - 1; i >= 0; i -= 1) {
            if (conversation[i].role === 'assistant') { testo = conversation[i].content; break; }
        }
        if (!testo) return;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(testo);
        u.lang = 'it-IT';
        u.rate = 0.95; // un filo più lento: aiuta la comprensione
        u.onend = () => setParlando(false);
        u.onerror = () => setParlando(false);
        setParlando(true);
        synth.speak(u);
    }

    function scaricaIstruzioni() {
        if (conversation.length === 0) return;
        const righe = conversation.map(m =>
            (m.role === 'user' ? 'Tu:\n' : 'Companion:\n') + m.content
        );
        const testo = [t.compConversazione, '', ...righe].join('\n\n');
        const blob = new Blob([testo], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'neurodesk-companion.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function revocaMioConsenso() {
        if (!window.confirm(t.compRevocaChiedi)) {
            return;
        }
        try {
            const res = await revocaConsenso();
            // Nuovo token con consenso=false: da qui l'app riporta alla pagina del consenso.
            segnaRevocaConsenso(res?.token);
            toast.successo(t.compRevocato);
        } catch (err) {
            toast.errore(err.message);
        }
    }

    async function cancellaTutto() {
        if (!window.confirm(t.compCancellaChiedi)) {
            return;
        }
        try {
            await cancellaCronologia();
            nuovaConversazione();
            toast.successo(t.compCancellata);
        } catch (err) {
            toast.errore(err.message);
        }
    }

    const vuota = conversation.length === 0;

    return (
        <div className="page companion-page">
            <div className="page-header companion-header">
                <div>
                    <h1>{t.compTitolo}</h1>
                    <p className="subtitle">
                        {t.compSottotitolo}
                        <br />
                        <strong>{t.compComeSiUsaA}</strong> {t.compComeSiUsaB}{' '}
                        <strong>{t.compComeSiUsaC}</strong> {t.compComeSiUsaD}{' '}
                        <span aria-hidden="true">👇</span>
                    </p>
                </div>
                {(() => {
                    // Verità sul provider: dopo un messaggio uso il dato reale (lastMeta);
                    // prima, lo stato letto da /health; se ancora ignoto, non affermo nulla.
                    const p = lastMeta?.provider ?? providerConfigurato;
                    if (!p) return null;
                    const testo = p === 'mock' ? t.compMock : `Provider: ${p}`;
                    return <span className="badge badge-secondary">{testo}</span>;
                })()}
            </div>

            <div className="companion-grid">
                <form className="form-card companion-form" onSubmit={handleSubmit}>

                    <div className="companion-step">
                        <span className="companion-step-label">1 — In che area sei bloccata?</span>
                        <div className="mode-grid">
                            {MODES.map(item => (
                                <button
                                    key={item.value}
                                    type="button"
                                    className={`mode-card${mode === item.value ? ' mode-card--active' : ''}`}
                                    onClick={() => setMode(item.value)}
                                    aria-pressed={mode === item.value}
                                >
                                    <span className="mode-card-name">{item.label}</span>
                                    <span className="mode-card-hint">{item.hint}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="companion-step">
                        <label className="companion-step-label" htmlFor="companion-input">2 — Cosa non riesci a fare adesso?</label>
                        <textarea
                            id="companion-input"
                            ref={textareaRef}
                            className="companion-textarea"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            rows={5}
                            placeholder="Scrivi pure come vuoi. Non serve essere precisa."
                        />
                    </div>

                    {errore && <p className="errore">{errore}</p>}

                    <button
                        type="submit"
                        className="btn-primary companion-submit"
                        disabled={caricamento}
                    >
                        {caricamento ? (
                            <>
                                Invio in corso
                                <span className="companion-dots">
                                    <span /><span /><span />
                                </span>
                            </>
                        ) : vuota ? t.compInvia : 'Continua'}
                    </button>

                    {!vuota && (
                        <div className="companion-thread-actions">
                            {ttsDisponibile && (
                                <button type="button" className="btn-secondary" onClick={ascolta}>
                                    <span aria-hidden="true">{parlando ? '⏹' : '🔊'}</span> {parlando ? 'Ferma' : t.compAscolta}
                                </button>
                            )}
                            <button type="button" className="btn-secondary" onClick={scaricaIstruzioni}>
                                ↓ Scarica la conversazione
                            </button>
                            <button type="button" className="btn-ghost" onClick={nuovaConversazione}>
                                Nuova conversazione
                            </button>
                        </div>
                    )}

                    <div className="companion-advanced">
                        <button
                            type="button"
                            className="companion-advanced-toggle"
                            onClick={() => setShowAdvanced(v => !v)}
                            aria-expanded={showAdvanced}
                            aria-controls="companion-advanced-panel"
                        >
                            {showAdvanced ? '▾' : '▸'} Opzioni avanzate
                        </button>
                        {showAdvanced && (
                            <div id="companion-advanced-panel">
                                <label className="companion-profile-check">
                                    <input
                                        type="checkbox"
                                        checked={includeProfile}
                                        onChange={(event) => setIncludeProfile(event.target.checked)}
                                    />
                                    Includi profilo funzionale minimale
                                    <span className="companion-profile-note"> — può consumare token in modalità AI reale</span>
                                </label>
                                <button type="button" className="companion-clear-history" onClick={cancellaTutto}>
                                    Cancella la mia cronologia
                                </button>
                                {ruolo === 'STUDENTE' && (
                                    <button type="button" className="companion-clear-history" onClick={revocaMioConsenso}>
                                        Revoca il consenso
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <p className="companion-notice">
                        Companion non sostituisce medico, terapeuta, tutor o consulente. Se stai male, parlane con una persona di cui ti fidi o con il tuo medico.
                    </p>
                </form>

                <section className="companion-panel">
                    <div className="companion-panel-header">
                        <span className="companion-panel-title">Conversazione</span>
                        <span className="badge">{activeMode?.label}</span>
                    </div>

                    {vuota && !caricamento ? (
                        <div className="companion-empty">
                            <p className="companion-empty-mode">{activeMode?.description}</p>
                            <p className="companion-empty-cta">{t.compDescrivi}</p>
                        </div>
                    ) : (
                        <div className="companion-thread" aria-live="polite" aria-atomic="false" aria-busy={caricamento}>
                            {conversation.map((m, i) => (
                                <div
                                    key={i}
                                    className={`companion-msg companion-msg--${m.role === 'user' ? 'user' : 'assistant'}`}
                                >
                                    <span className="companion-msg-label">
                                        {m.role === 'user' ? 'Tu' : 'Companion'}
                                    </span>
                                    <div className="companion-msg-body">{m.content}</div>
                                </div>
                            ))}

                            {caricamento && (
                                <div className="companion-panel-loading">
                                    <span className="companion-dots companion-dots--lg">
                                        <span /><span /><span />
                                    </span>
                                    <p>{t.compInvioInCorso}</p>
                                </div>
                            )}

                            {lastMeta && !caricamento && (
                                <div className="companion-meta">
                                    <span>Provider: {lastMeta.provider ?? 'nessuna chiamata AI'}</span>
                                    {lastMeta.usage?.estimatedInputTokens && (
                                        <span>Token stimati: {lastMeta.usage.estimatedInputTokens}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default CompanionPage;
