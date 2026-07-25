import { useEffect, useRef, useState } from 'react';
import { sendCompanionMessage } from '../api/companionApi';
import {
    salvaScambio,
    getSessioni,
    getSessione,
    cancellaCronologia,
} from '../api/companionSessionApi';
import { useToast } from '../ui/ToastProvider';

const MODES = [
    {
        value: 'crisis_mode',
        label: 'Blocco',
        hint: 'Quando tutto sembra troppo',
        description: 'Riceverai una sola micro-azione da 2 a 5 minuti. Niente liste, niente piani. Solo il passo più piccolo possibile da fare adesso.',
    },
    {
        value: 'study_mode',
        label: 'Studio',
        hint: 'Testi, esami, memoria',
        description: 'Il materiale viene diviso in blocchi piccoli. Se serve, verranno create domande brevi per aiutarti a ricordare.',
    },
    {
        value: 'bureaucracy_mode',
        label: 'Burocrazia',
        hint: 'Documenti e uffici',
        description: "Viene creata una checklist o una bozza di messaggio. I dati vanno sempre verificati con l'ente competente.",
    },
    {
        value: 'work_mode',
        label: 'Lavoro',
        hint: 'Annunci e candidature',
        description: 'Si parte dai tuoi vincoli reali: salute, energia, orari, stress. Nessuna scelta definitiva, solo il passo successivo.',
    },
    {
        value: 'autonomy_mode',
        label: 'Autonomie',
        hint: 'Soldi, casa, routine',
        description: 'Affrontiamo una sola area alla volta: soldi, casa, routine o scadenze. Nessuna panoramica complessa.',
    },
];

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
    const textareaRef = useRef(null);
    // Stato iniziale ripristinato dal browser (istantaneo, regge refresh e disconnessioni).
    const [mode, setMode] = useState(() => leggiCache()?.mode ?? 'crisis_mode');
    const [message, setMessage] = useState('');
    const [includeProfile, setIncludeProfile] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [conversation, setConversation] = useState(() => leggiCache()?.conversation ?? []); // [{ role, content }]
    const [sessioneId, setSessioneId] = useState(() => leggiCache()?.sessioneId ?? null);
    const [lastMeta, setLastMeta] = useState(null); // { provider, usage }
    const [errore, setErrore] = useState('');
    const [caricamento, setCaricamento] = useState(false);

    const activeMode = MODES.find(item => item.value === mode);

    // Se non c'era nulla nel browser, provo a riprendere l'ultima sessione dal server.
    useEffect(() => {
        if (sessionStorage.getItem(ACTIVE_KEY)) return; // già ripristinata dalla cache locale
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
    useEffect(() => {
        if (conversation.length === 0 && sessioneId == null) {
            sessionStorage.removeItem(ACTIVE_KEY);
            return;
        }
        sessionStorage.setItem(ACTIVE_KEY, JSON.stringify({ sessioneId, mode, conversation }));
    }, [conversation, sessioneId, mode]);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrore('');

        const cleanMessage = message.trim();
        if (!cleanMessage) {
            setErrore('Serve almeno una parola per continuare.');
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
        setConversation([]);
        setSessioneId(null);
        setMessage('');
        setLastMeta(null);
        setErrore('');
        sessionStorage.removeItem(ACTIVE_KEY);
        setTimeout(() => textareaRef.current?.focus(), 50);
    }

    function scaricaIstruzioni() {
        if (conversation.length === 0) return;
        const righe = conversation.map(m =>
            (m.role === 'user' ? 'Tu:\n' : 'Companion:\n') + m.content
        );
        const testo = ['NeuroDesk Companion — i tuoi passaggi', '', ...righe].join('\n\n');
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

    async function cancellaTutto() {
        if (!window.confirm('Vuoi cancellare tutta la tua cronologia salvata? L\'operazione non è reversibile.')) {
            return;
        }
        try {
            await cancellaCronologia();
            nuovaConversazione();
            toast.successo('Cronologia cancellata.');
        } catch (err) {
            toast.errore(err.message);
        }
    }

    const vuota = conversation.length === 0;

    return (
        <div className="page companion-page">
            <div className="page-header companion-header">
                <div>
                    <h2>Companion</h2>
                    <p className="subtitle">
                        Il tuo aiuto pratico, un passo piccolo quando tutto sembra troppo.
                        <br />
                        <strong>Come si usa:</strong> scegli l'area qui sotto, scrivi cosa ti blocca e premi il pulsante — ricevi <strong>un solo piccolo passo</strong> da fare. 👇
                    </p>
                </div>
                <span className="badge badge-secondary">
                    {lastMeta?.provider ? `Provider: ${lastMeta.provider}` : 'AI mock attiva'}
                </span>
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
                        <span className="companion-step-label">2 — Cosa non riesci a fare adesso?</span>
                        <textarea
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
                        ) : vuota ? 'Aiutami a fare il prossimo passo' : 'Continua'}
                    </button>

                    {!vuota && (
                        <div className="companion-thread-actions">
                            <button type="button" className="btn-secondary" onClick={scaricaIstruzioni}>
                                ↓ Scarica le istruzioni
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
                        >
                            {showAdvanced ? '▾' : '▸'} Opzioni avanzate
                        </button>
                        {showAdvanced && (
                            <>
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
                            </>
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
                            <p className="companion-empty-cta">Descrivi il blocco nel form e invia.</p>
                        </div>
                    ) : (
                        <div className="companion-thread">
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
                                    <p>Sto preparando un passo concreto...</p>
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
