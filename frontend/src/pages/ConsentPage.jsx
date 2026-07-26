import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { daiConsenso } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui/ToastProvider';

function ConsentPage() {
  const navigate = useNavigate();
  const { segnaConsenso, logout } = useAuth();
  const toast = useToast();

  const [accettato, setAccettato] = useState(false);
  const [caricamento, setCaricamento] = useState(false);

  async function conferma() {
    if (!accettato) return;
    setCaricamento(true);
    try {
      const res = await daiConsenso();
      segnaConsenso(res?.token);
      toast.successo('Grazie. Buon lavoro con NeuroDesk.');
      navigate('/companion', { replace: true });
    } catch (err) {
      toast.errore(err.message);
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card auth-card--wide">
        <div className="auth-brand">
          <span className="auth-logo">Prima di iniziare</span>
        </div>

        <div className="consent-text">
          <p>
            NeuroDesk Companion ti aiuta a trasformare un blocco nel prossimo piccolo passo. Per farlo,
            quello che scrivi qui viene inviato a un servizio di intelligenza artificiale che genera la
            risposta.
          </p>
          <p>
            I servizi che usiamo sono <strong>Anthropic</strong> e <strong>OpenAI</strong>. Trattano i tuoi
            messaggi <strong>solo per conto nostro</strong>, per generare la risposta: non li usano per
            addestrare i loro modelli e non li usano per scopi propri. I dati possono essere trattati anche
            fuori dall'Unione Europea, con le garanzie previste dal GDPR.
          </p>
          <ul>
            <li><strong>Non registriamo il tuo nome</strong>: entri con un codice, non con i tuoi dati.</li>
            <li>
              Quello che scrivi può contenere informazioni delicate (salute, difficoltà, soldi): scrivi solo
              ciò con cui ti senti a tuo agio.
            </li>
            <li>
              Le tue conversazioni vengono <strong>salvate in forma cifrata</strong> così puoi riprenderle,
              e si <strong>cancellano da sole dopo 30 giorni</strong>. Puoi cancellarle quando vuoi dalle
              opzioni del Companion.
            </li>
            <li>Puoi <strong>smettere quando vuoi</strong>, revocare il consenso dalle opzioni del Companion e chiedere di cancellare il tuo accesso.</li>
            <li>NeuroDesk <strong>non fa diagnosi</strong> e non sostituisce medici, psicologi o servizi.</li>
          </ul>
        </div>

        <label className="consent-check">
          <input type="checkbox" checked={accettato} onChange={(e) => setAccettato(e.target.checked)} />
          <span>Ho letto e <strong>acconsento</strong> a usare NeuroDesk Companion in questa fase di test.</span>
        </label>

        <button
          type="button"
          className="btn-primary auth-submit"
          onClick={conferma}
          disabled={!accettato || caricamento}
        >
          {caricamento ? 'Un attimo…' : 'Continua'}
        </button>

        <button type="button" className="btn-ghost auth-toggle" onClick={logout} disabled={caricamento}>
          Esci
        </button>
      </div>
    </div>
  );
}

export default ConsentPage;
