import { useEffect, useRef, useState } from 'react';
import { sendCompanionMessage, getCompanionHealth } from '../api/companionApi';
import {
    salvaScambio,
    getSessioni,
    getSessione,
    cancellaCronologia,
    impostaEtichettaMessaggio,
} from '../api/companionSessionApi';
import { revocaConsenso } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui/ToastProvider';
import { testi } from '../i18n/lingua';
import { impostaChiaveAi, rimuoviChiaveAi, getMe } from '../api/authApi';

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

// Solo su schermo stretto form e risposta si impilano (una colonna): è lì che
// serve portare la vista sulla risposta da sola. Su desktop stanno affiancate.
function schermoStretto() {
    return typeof window !== 'undefined' && window.matchMedia
        && window.matchMedia('(max-width: 1024px)').matches;
}

function CompanionPage() {
    const toast = useToast();
    const { ruolo, segnaRevocaConsenso } = useAuth();
    const textareaRef = useRef(null);
    const fondoRef = useRef(null); // fine della conversazione: ci si scorre dopo l'invio
    // Stato iniziale ripristinato dal browser (istantaneo, regge refresh e disconnessioni).
    const [mode, setMode] = useState(() => leggiCache()?.mode ?? 'crisis_mode');
    const [message, setMessage] = useState('');
    const [includeProfile, setIncludeProfile] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // { role, content, id?, etichetta? }. id ed etichetta arrivano solo per i
    // messaggi già salvati sul server: una bolla appena scritta non li ha finché
    // salvaScambio() non risponde (vedi handleSubmit).
    const [conversation, setConversation] = useState(() => leggiCache()?.conversation ?? []);
    const [sessioneId, setSessioneId] = useState(() => leggiCache()?.sessioneId ?? null);
    // Id del messaggio da cui mandare la cronologia al modello, invece che da
    // tutto l'inizio. null = cronologia intera (comportamento di sempre).
    const [daTagId, setDaTagId] = useState(null);
    // Editor dell'etichetta aperto su un messaggio: { id, testo }. Uno solo alla
    // volta, come "cosa vuol dire?" nel resto dell'app.
    const [etichettaInModifica, setEtichettaInModifica] = useState(null);
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

    // "Bring your own token": lo stato della PROPRIA chiave. Il testo della
    // chiave vive solo qui e sparisce appena salvato — non torna mai indietro
    // dal server, nemmeno a chi l'ha messa.
    const [chiaveMia, setChiaveMia] = useState(null);   // { chiavePropria, chiaveProvider }
    const [chiaveTesto, setChiaveTesto] = useState('');
    const [chiaveProv, setChiaveProv] = useState('anthropic');
    const [chiaveInCorso, setChiaveInCorso] = useState(false);

    useEffect(() => {
        let vivo = true;
        getMe()
            .then(d => { if (vivo) setChiaveMia({ chiavePropria: d?.chiavePropria, chiaveProvider: d?.chiaveProvider }); })
            .catch(() => { /* non e' un motivo per rompere la pagina */ });
        return () => { vivo = false; };
    }, []);

    async function salvaChiaveMia() {
        setChiaveInCorso(true);
        try {
            await impostaChiaveAi(chiaveProv, chiaveTesto);
            setChiaveTesto('');
            setChiaveMia({ chiavePropria: true, chiaveProvider: chiaveProv });
            toast.successo(t.chiaveSalvata);
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setChiaveInCorso(false);
        }
    }

    async function togliChiaveMia() {
        setChiaveInCorso(true);
        try {
            await rimuoviChiaveAi();
            setChiaveMia({ chiavePropria: false, chiaveProvider: null });
            toast.successo(t.chiaveTolta);
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setChiaveInCorso(false);
        }
    }
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
                    setConversation(det.messaggi.map(m => ({
                        role: m.ruolo, content: m.contenuto, id: m.id, etichetta: m.etichetta,
                    })));
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

    // Su telefono la risposta esce sotto il form: dopo l'invio (e all'arrivo della
    // risposta) porto la vista in fondo alla conversazione da sola, così non si
    // deve scorrere giù a cercarla. Le risposte sono brevi per scelta, quindi in
    // fondo si vede tutta. Su desktop stanno affiancate: qui non fa nulla.
    useEffect(() => {
        if (!schermoStretto()) return;
        if (conversation.length === 0 && !caricamento) return;
        const id = requestAnimationFrame(() =>
            fondoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        );
        return () => cancelAnimationFrame(id);
    }, [conversation, caricamento]);

    async function handleSubmit(event) {
        event.preventDefault();
        setErrore('');

        const cleanMessage = message.trim();
        if (!cleanMessage) {
            setErrore(t.compVuoto);
            return;
        }

        const base = conversation;
        // Se e' stato scelto un punto di partenza (un messaggio etichettato), la
        // cronologia mandata al modello riparte da li' invece che dall'inizio:
        // meno token, e la persona sa con certezza cosa il modello sta ricevendo
        // di lei in questo scambio.
        const daIndice = daTagId ? base.findIndex(m => m.id === daTagId) : -1;
        const baseStorico = daIndice >= 0 ? base.slice(daIndice) : base;
        const history = baseStorico.map(m => ({ role: m.role, content: m.content }));
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
                // Solo ora i due messaggi hanno un id: e' quello che serve per
                // poterli etichettare. Li aggiorno per indice (gli ultimi due),
                // non per contenuto: due bolle uguali per errore andrebbero
                // altrimenti a confondersi.
                if (saved?.messaggioUtenteId && saved?.messaggioCompanionId) {
                    setConversation(prev => {
                        if (prev.length < 2) return prev;
                        const aggiornata = [...prev];
                        aggiornata[aggiornata.length - 2] = {
                            ...aggiornata[aggiornata.length - 2], id: saved.messaggioUtenteId,
                        };
                        aggiornata[aggiornata.length - 1] = {
                            ...aggiornata[aggiornata.length - 1], id: saved.messaggioCompanionId,
                        };
                        return aggiornata;
                    });
                }
            } catch { /* memoria server non disponibile: resta la copia locale, non etichettabile */ }
        } catch (err) {
            // Rollback del messaggio ottimista, così può riprovare senza doppioni.
            setConversation(base);
            setMessage(cleanMessage);
            setErrore(err.message);
        } finally {
            setCaricamento(false);
            // Su schermo stretto la vista è appena scesa sulla risposta: dare il
            // fuoco al campo la riporterebbe su (il browser scorre da sé
            // sull'elemento a fuoco) e la risposta sparirebbe prima di essere
            // letta. Lì si torna al campo col pulsante "scrivi", quando lo
            // decide chi legge. Su desktop il fuoco resta, comodo per chi usa la
            // tastiera, ma senza il permesso di spostare la vista.
            if (!schermoStretto()) {
                setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 50);
            }
        }
    }

    // Pulsante "scrivi": riporta al campo di scrittura in un tocco, senza
    // scorrere su a mano. Lo centro e poi gli do il fuoco, pronto a digitare.
    function tornaAlCampo() {
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => textareaRef.current?.focus(), 350);
    }

    function nuovaConversazione() {
        window.speechSynthesis?.cancel();
        setParlando(false);
        setConversation([]);
        setSessioneId(null);
        setDaTagId(null);
        setEtichettaInModifica(null);
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
        // La voce segue la lingua di chi legge: leggere una risposta inglese
        // con la pronuncia italiana la rende incomprensibile.
        u.lang = t.codiceVoce;
        u.rate = 0.95; // un filo più lento: aiuta la comprensione
        u.onend = () => setParlando(false);
        u.onerror = () => setParlando(false);
        setParlando(true);
        synth.speak(u);
    }

    // Copia UN messaggio, non l'intera conversazione: e' il bisogno diverso da
    // "scarica la conversazione", che esporta tutto in un file. L'API
    // Clipboard puo' rifiutare (permesso negato, contesto non sicuro): in
    // quel caso lo si dice invece di far sparire il clic nel nulla.
    async function copiaMessaggio(testo) {
        try {
            await navigator.clipboard.writeText(testo);
            toast.successo(t.compCopiato);
        } catch {
            toast.errore(t.compCopiaFallita);
        }
    }

    // Salva (o toglie, se il testo e' vuoto) l'etichetta di un messaggio GIA'
    // salvato sul server. Aggiorna lo stato locale solo dopo la conferma del
    // server: cosi' un'etichetta che sembra salvata lo e' davvero.
    async function salvaEtichetta(messaggioId, testoGrezzo) {
        const testo = testoGrezzo.trim();
        try {
            await impostaEtichettaMessaggio(sessioneId, messaggioId, testo || null);
            setConversation(prev => prev.map(m =>
                m.id === messaggioId ? { ...m, etichetta: testo || null } : m));
            // Se si e' tolta l'etichetta usata come punto di partenza, si torna
            // alla cronologia intera: un riferimento a un'etichetta sparita
            // sarebbe silenziosamente sbagliato.
            if (!testo && daTagId === messaggioId) setDaTagId(null);
            setEtichettaInModifica(null);
            toast.successo(testo ? t.compEtichettaSalvata : t.compEtichettaTolta);
        } catch (err) {
            toast.errore(err.message || t.compEtichettaFallita);
        }
    }

    function scaricaIstruzioni() {
        if (conversation.length === 0) return;
        const righe = conversation.map(m =>
            (m.role === 'user' ? t.compTu + ':\n' : 'Companion:\n') + m.content
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
    // Messaggi etichettati e già salvati: sono le sole voci selezionabili come
    // punto di partenza. Un'etichetta su un messaggio non ancora salvato non
    // può comparire qui (non ha id), e infatti il pulsante per crearla è
    // disabilitato finché quell'id non arriva.
    const messaggiEtichettati = conversation.filter(m => m.id && m.etichetta);
    const indiceDaTag = daTagId ? conversation.findIndex(m => m.id === daTagId) : -1;
    const conteggioDaTag = indiceDaTag >= 0 ? conversation.length - indiceDaTag : 0;

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
                        <span className="companion-step-label">{t.compPasso1b}</span>
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
                        <label className="companion-step-label" htmlFor="companion-input">{t.compPasso2}</label>
                        <textarea
                            id="companion-input"
                            ref={textareaRef}
                            className="companion-textarea"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            rows={5}
                            placeholder={t.compSegnaposto}
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
                        ) : vuota ? t.compInvia : t.compContinua}
                    </button>

                    {!vuota && (
                        <div className="companion-thread-actions">
                            {ttsDisponibile && (
                                <button type="button" className="btn-secondary" onClick={ascolta}>
                                    <span aria-hidden="true">{parlando ? '⏹' : '🔊'}</span> {parlando ? t.compFerma : t.compAscolta}
                                </button>
                            )}
                            <button type="button" className="btn-secondary" onClick={scaricaIstruzioni}>
                                ↓ {t.compScarica}
                            </button>
                            <button type="button" className="btn-ghost" onClick={nuovaConversazione}>
                                {t.compNuova}
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
                            {showAdvanced ? '▾' : '▸'} {t.compAvanzate}
                        </button>
                        {showAdvanced && (
                            <div id="companion-advanced-panel">
                                <label className="companion-profile-check">
                                    <input
                                        type="checkbox"
                                        checked={includeProfile}
                                        onChange={(event) => setIncludeProfile(event.target.checked)}
                                    />
                                    {t.compProfilo}
                                    <span className="companion-profile-note">{t.compProfiloNota}</span>
                                </label>
                                <button type="button" className="companion-clear-history" onClick={cancellaTutto}>
                                    {t.compCancellaCronologia}
                                </button>
                                {ruolo === 'STUDENTE' && (
                                    <button type="button" className="companion-clear-history" onClick={revocaMioConsenso}>
                                        {t.compRevoca}
                                    </button>
                                )}

                                {/* La chiave la mette la persona stessa: non passa
                                    dalle mani di chi gestisce NeuroDesk, che ne vede
                                    solo l'esistenza. */}
                                {ruolo === 'STUDENTE' && chiaveMia && (
                                    <div className="chiave-mia">
                                        <h4>{t.chiaveTitolo}</h4>
                                        {chiaveMia.chiavePropria ? (
                                            <>
                                                <p className="chiave-attiva">
                                                    ✓ {t.chiaveAttiva} <span>({chiaveMia.chiaveProvider})</span>
                                                </p>
                                                <button
                                                    type="button"
                                                    className="btn-ghost"
                                                    onClick={togliChiaveMia}
                                                    disabled={chiaveInCorso}
                                                >
                                                    {t.chiaveTogli}
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <p>{t.chiaveSpiega}</p>
                                                <div className="form-group">
                                                    <label htmlFor="chiave-prov">{t.chiaveFornitore}</label>
                                                    <select id="chiave-prov" value={chiaveProv} onChange={(e) => setChiaveProv(e.target.value)}>
                                                        <option value="anthropic">Anthropic</option>
                                                        <option value="openai">OpenAI</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label htmlFor="chiave-mia">{t.chiaveCampo}</label>
                                                    <input
                                                        id="chiave-mia"
                                                        type="password"
                                                        value={chiaveTesto}
                                                        onChange={(e) => setChiaveTesto(e.target.value)}
                                                        placeholder={t.chiaveSegnaposto}
                                                        autoComplete="off"
                                                        spellCheck={false}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    onClick={salvaChiaveMia}
                                                    disabled={chiaveInCorso || chiaveTesto.trim().length < 20}
                                                >
                                                    {chiaveInCorso ? t.chiaveSalvataggio : t.chiaveSalva}
                                                </button>
                                            </>
                                        )}
                                        <p className="chiave-nota">{t.chiaveNota}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Compare solo se c'e' almeno un'etichetta da poter scegliere: senza,
                        sarebbe un controllo vuoto che non serve a niente. */}
                    {messaggiEtichettati.length > 0 && (
                        <div className="companion-da-qui">
                            <label htmlFor="da-qui">{t.compDaQuiTitolo}</label>
                            <select
                                id="da-qui"
                                value={daTagId ?? ''}
                                onChange={(e) => setDaTagId(e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">{t.compDaQuiIntera}</option>
                                {messaggiEtichettati.map(m => (
                                    <option key={m.id} value={m.id}>{m.etichetta}</option>
                                ))}
                            </select>
                            {daTagId && conteggioDaTag > 0 && (
                                <span className="companion-da-qui-conta">
                                    {conteggioDaTag} {t.compDaQuiMessaggiEtichetta}
                                </span>
                            )}
                        </div>
                    )}

                    <p className="companion-notice">
                        {t.compAvviso}
                    </p>
                </form>

                <section className="companion-panel">
                    <div className="companion-panel-header">
                        <span className="companion-panel-title">{t.compPannello}</span>
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
                                    <div className="companion-msg-head">
                                        <span className="companion-msg-label">
                                            {m.role === 'user' ? t.compTu : 'Companion'}
                                        </span>
                                        <div className="companion-msg-azioni">
                                            <button
                                                type="button"
                                                className="companion-msg-azione"
                                                onClick={() => copiaMessaggio(m.content)}
                                                aria-label={t.compCopia}
                                                title={t.compCopia}
                                            >
                                                <span aria-hidden="true">⧉</span>
                                            </button>
                                            {/* Etichettare ha senso solo su un messaggio già salvato: senza
                                                id non c'è dove persistere l'etichetta. Il pulsante resta
                                                visibile ma disabilitato, con il motivo nel title, invece di
                                                sparire — sparire farebbe sembrare la funzione assente. */}
                                            <button
                                                type="button"
                                                className="companion-msg-azione"
                                                onClick={() => setEtichettaInModifica({ id: m.id, testo: m.etichetta || '' })}
                                                aria-label={m.etichetta ? t.compEtichettaModifica : t.compEtichettaAggiungi}
                                                title={m.id ? (m.etichetta ? t.compEtichettaModifica : t.compEtichettaAggiungi) : t.compEtichettaNonSalvato}
                                                disabled={!m.id}
                                            >
                                                <span aria-hidden="true">🏷</span>
                                            </button>
                                        </div>
                                    </div>

                                    {m.etichetta && etichettaInModifica?.id !== m.id && (
                                        <p className="companion-msg-etichetta">
                                            <span aria-hidden="true">🏷</span> {m.etichetta}
                                        </p>
                                    )}

                                    {/* Guardia esplicita su etichettaInModifica, non solo sull'id:
                                        "undefined === undefined" è vero, e una bolla appena scritta
                                        (senza id, come l'editor chiuso) ci sarebbe caduta dentro,
                                        provando a leggere .testo da un editor che non esiste. */}
                                    {etichettaInModifica && etichettaInModifica.id === m.id && (
                                        <form
                                            className="companion-msg-etichetta-editor"
                                            onSubmit={(e) => { e.preventDefault(); salvaEtichetta(m.id, etichettaInModifica.testo); }}
                                        >
                                            <input
                                                type="text"
                                                value={etichettaInModifica.testo}
                                                onChange={(e) => setEtichettaInModifica(v => ({ ...v, testo: e.target.value }))}
                                                placeholder={t.compEtichettaSegnaposto}
                                                maxLength={60}
                                                autoFocus
                                            />
                                            <button type="submit" className="btn-secondary">{t.compEtichettaSalva}</button>
                                            {m.etichetta && (
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    onClick={() => salvaEtichetta(m.id, '')}
                                                >
                                                    {t.compEtichettaTogli}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="btn-secondary"
                                                onClick={() => setEtichettaInModifica(null)}
                                            >
                                                {t.compEtichettaAnnulla}
                                            </button>
                                        </form>
                                    )}

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
                                    <span>Provider: {lastMeta.provider ?? t.compNessunaChiamata}</span>
                                    {lastMeta.usage?.estimatedInputTokens && (
                                        <span>Token stimati: {lastMeta.usage.estimatedInputTokens}</span>
                                    )}
                                </div>
                            )}
                            <div ref={fondoRef} className="companion-fondo" aria-hidden="true" />
                        </div>
                    )}
                </section>
            </div>

            {/* Pulsante "scrivi": sempre a portata mentre leggi la risposta, per
                tornare al campo senza scorrere su a mano. Compare solo quando c'è
                una conversazione; il CSS lo mostra solo su schermo stretto. */}
            {!vuota && (
                <button
                    type="button"
                    className="companion-scrivi-fab"
                    onClick={tornaAlCampo}
                    aria-label={t.compScriviAria}
                >
                    <span aria-hidden="true">✎</span> {t.compScrivi}
                </button>
            )}
        </div>
    );
}

export default CompanionPage;
