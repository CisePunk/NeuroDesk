import { useRef, useState } from 'react';
import { sendCompanionMessage } from '../api/companionApi';

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

function CompanionPage() {
    const textareaRef = useRef(null);
    const [mode, setMode] = useState('crisis_mode');
    const [message, setMessage] = useState('');
    const [includeProfile, setIncludeProfile] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [reply, setReply] = useState(null);
    const [errore, setErrore] = useState('');
    const [caricamento, setCaricamento] = useState(false);

    const activeMode = MODES.find(item => item.value === mode);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrore('');
        setReply(null);

        const cleanMessage = message.trim();
        if (!cleanMessage) {
            setErrore('Serve almeno una parola per continuare.');
            return;
        }

        setCaricamento(true);
        try {
            const data = await sendCompanionMessage({
                message: cleanMessage,
                mode,
                profile: includeProfile ? PROFILE_TEMPLATE : null,
            });
            setReply(data);
        } catch {
            setErrore('Il Companion non risponde. Assicurati che il servizio sia attivo su 127.0.0.1:8090.');
        } finally {
            setCaricamento(false);
        }
    }

    function handleReset() {
        setReply(null);
        setMessage('');
        setTimeout(() => textareaRef.current?.focus(), 50);
    }

    return (
        <div className="page companion-page">
            <div className="page-header companion-header">
                <div>
                    <h2>Companion</h2>
                    <p className="subtitle">Un passo piccolo quando tutto sembra troppo.</p>
                </div>
                <span className="badge badge-secondary">
                    {reply?.provider ? `Provider: ${reply.provider}` : 'AI mock attiva'}
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
                        ) : 'Aiutami a fare il prossimo passo'}
                    </button>

                    <div className="companion-advanced">
                        <button
                            type="button"
                            className="companion-advanced-toggle"
                            onClick={() => setShowAdvanced(v => !v)}
                        >
                            {showAdvanced ? '▾' : '▸'} Opzioni avanzate
                        </button>
                        {showAdvanced && (
                            <label className="companion-profile-check">
                                <input
                                    type="checkbox"
                                    checked={includeProfile}
                                    onChange={(event) => setIncludeProfile(event.target.checked)}
                                />
                                Includi profilo funzionale minimale
                                <span className="companion-profile-note"> — può consumare token in modalità AI reale</span>
                            </label>
                        )}
                    </div>

                    <p className="companion-notice">
                        Companion non sostituisce medico, terapeuta, tutor o consulente. In emergenza chiama il 112.
                    </p>
                </form>

                <section className="companion-panel">
                    <div className="companion-panel-header">
                        <span className="companion-panel-title">Risposta</span>
                        <span className="badge">{activeMode?.label}</span>
                    </div>

                    {caricamento ? (
                        <div className="companion-panel-loading">
                            <span className="companion-dots companion-dots--lg">
                                <span /><span /><span />
                            </span>
                            <p>Sto preparando un passo concreto...</p>
                        </div>
                    ) : !reply ? (
                        <div className="companion-empty">
                            <p className="companion-empty-mode">{activeMode?.description}</p>
                            <p className="companion-empty-cta">Descrivi il blocco nel form e invia.</p>
                        </div>
                    ) : (
                        <>
                            {reply.risk?.level === 'high' && (
                                <div className="companion-risk">
                                    Rischio alto rilevato. Dai priorità alla sicurezza e contatta subito aiuto reale.
                                </div>
                            )}
                            <div className="companion-reply">
                                {reply.reply}
                            </div>
                            <div className="companion-reply-actions">
                                <button
                                    type="button"
                                    className="btn-secondary companion-reset"
                                    onClick={handleReset}
                                >
                                    Scrivi un altro blocco
                                </button>
                                <div className="companion-meta">
                                    <span>Provider: {reply.provider ?? 'nessuna chiamata AI'}</span>
                                    {reply.usage?.estimatedInputTokens && (
                                        <span>Token stimati: {reply.usage.estimatedInputTokens}</span>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}

export default CompanionPage;
