import { useEffect, useState } from 'react';
import { getFeedbackSchema, inviaFeedback } from '../api/feedbackApi';
import { useToast } from '../ui/ToastProvider';

function FeedbackPage() {
    const toast = useToast();

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
        getFeedbackSchema()
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
    }, []);

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
            toast.successo('Grazie! Il tuo feedback è stato inviato.');
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
                <div className="page-header"><h2>Feedback</h2></div>
                <p className="muted">Caricamento…</p>
            </div>
        );
    }

    if (inviato) {
        return (
            <div className="page">
                <div className="page-header"><h2>Feedback</h2></div>
                <div className="feedback-thanks">
                    <p><strong>Grazie di cuore.</strong> Il tuo parere ci aiuta a migliorare NeuroDesk.</p>
                    <button type="button" className="btn-secondary" onClick={nuovo}>
                        Lascia un altro feedback
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h2>Feedback</h2>
            </div>

            <p className="feedback-intro">
                Siamo in fase di test: dicci com'è andata. Bastano pochi tocchi, i commenti sono facoltativi.
            </p>

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
                    <label htmlFor="descrizioneErrori">Se hai avuto errori o blocchi, descrivili</label>
                    <textarea
                        id="descrizioneErrori"
                        rows={3}
                        value={descrizioneErrori}
                        onChange={(e) => setDescrizioneErrori(e.target.value)}
                        placeholder="Es. cliccando su Salva non succedeva niente…"
                        maxLength={4000}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="commento">Altri commenti (facoltativo)</label>
                    <textarea
                        id="commento"
                        rows={3}
                        value={commento}
                        onChange={(e) => setCommento(e.target.value)}
                        placeholder="Cosa ti è piaciuto, cosa cambieresti…"
                        maxLength={4000}
                    />
                </div>

                <button type="submit" className="btn-primary" disabled={invio || vuoto}>
                    {invio ? 'Invio…' : 'Invia feedback'}
                </button>
            </form>
        </div>
    );
}

export default FeedbackPage;
