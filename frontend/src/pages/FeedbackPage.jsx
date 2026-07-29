import { useEffect, useState } from 'react';
import { getFeedbackSchema, inviaFeedback } from '../api/feedbackApi';
import { useToast } from '../ui/ToastProvider';
import { linguaCorrente, testiFeedback } from '../i18n/lingua';

function FeedbackPage() {
    const toast = useToast();
    // La lingua del browser decide sia i testi della pagina sia quelli delle
    // domande, che arrivano gia' tradotti dal backend. Chiedere un parere in una
    // lingua che non si parla significa ricevere i clic sui pulsanti e mai il
    // commento libero, che e' la parte che vale.
    const lingua = linguaCorrente();
    const t = testiFeedback(lingua);

    const [domande, setDomande] = useState([]);
    const [risposte, setRisposte] = useState({});
    const [descrizioneErrori, setDescrizioneErrori] = useState('');
    const [commento, setCommento] = useState('');

    const [caricamento, setCaricamento] = useState(true);
    const [errore, setErrore] = useState('');
    const [invio, setInvio] = useState(false);
    const [inviato, setInviato] = useState(false);

    useEffect(() => {
        let attivo = true;
        getFeedbackSchema(lingua)
            .then((d) => {
                if (attivo) setDomande(d ?? []);
            })
            .catch((err) => {
                if (attivo) setErrore(err.message);
            })
            .finally(() => {
                if (attivo) setCaricamento(false);
            });
        return () => {
            attivo = false;
        };
    }, [lingua]);

    function scegli(idDomanda, valore) {
        setRisposte((prev) => ({ ...prev, [idDomanda]: valore }));
    }

    const vuoto =
        Object.keys(risposte).length === 0 &&
        descrizioneErrori.trim() === '' &&
        commento.trim() === '';

    async function handleSubmit(event) {
        event.preventDefault();
        if (vuoto) return;
        setInvio(true);
        try {
            await inviaFeedback({ risposte, descrizioneErrori, commento });
            setInviato(true);
            toast.successo(t.grazieBreve);
        } catch (err) {
            toast.errore(err.message);
        } finally {
            setInvio(false);
        }
    }

    function nuovo() {
        setRisposte({});
        setDescrizioneErrori('');
        setCommento('');
        setInviato(false);
    }

    if (caricamento) {
        return (
            <div className="page">
                <div className="page-header"><h2>{t.titolo}</h2></div>
                <p className="muted">{t.caricamento}</p>
            </div>
        );
    }

    if (inviato) {
        return (
            <div className="page">
                <div className="page-header"><h2>{t.titolo}</h2></div>
                <div className="feedback-thanks">
                    <p><strong>{t.grazieTitolo}</strong> {t.grazieTesto}</p>
                    <button type="button" className="btn-secondary" onClick={nuovo}>
                        {t.altroFeedback}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h2>{t.titolo}</h2>
            </div>

            <p className="feedback-intro">{t.intro}</p>

            {errore && <p className="errore">{errore}</p>}

            <form className="form-card feedback-form" onSubmit={handleSubmit}>
                {domande.map((d) => (
                    <fieldset className="feedback-question" key={d.id}>
                        <legend>{d.testo}</legend>
                        <div className="feedback-options">
                            {d.opzioni.map((o) => (
                                <button
                                    type="button"
                                    key={o.valore}
                                    className={`feedback-option${risposte[d.id] === o.valore ? ' feedback-option--active' : ''}`}
                                    onClick={() => scegli(d.id, o.valore)}
                                    aria-pressed={risposte[d.id] === o.valore}
                                >
                                    {o.etichetta}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                ))}

                <div className="form-group">
                    <label htmlFor="descrizioneErrori">{t.etichettaErrori}</label>
                    <textarea
                        id="descrizioneErrori"
                        rows={3}
                        value={descrizioneErrori}
                        onChange={(e) => setDescrizioneErrori(e.target.value)}
                        placeholder={t.segnapostoErrori}
                        maxLength={4000}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="commento">{t.etichettaCommento}</label>
                    <textarea
                        id="commento"
                        rows={3}
                        value={commento}
                        onChange={(e) => setCommento(e.target.value)}
                        placeholder={t.segnapostoCommento}
                        maxLength={4000}
                    />
                </div>

                <button type="submit" className="btn-primary" disabled={invio || vuoto}>
                    {invio ? t.invioInCorso : t.invia}
                </button>
            </form>
        </div>
    );
}

export default FeedbackPage;
