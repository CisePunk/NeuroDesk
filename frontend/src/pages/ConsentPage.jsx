import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { daiConsenso } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../ui/ToastProvider';
import { testi } from '../i18n/lingua';

/**
 * Schermata del consenso.
 *
 * Tradotta prima di tutto il resto dell'app, e non per comodita': un consenso
 * vale se e' informato, e informato vuol dire che chi lo da' ha capito cosa sta
 * accettando. Finche' era solo in italiano, chi non legge l'italiano cliccava
 * "Continua" su un testo che spiega che i suoi messaggi vanno a un servizio di
 * intelligenza artificiale, che possono contenere dati di salute e che escono
 * dall'Unione Europea. Quel consenso era debole.
 *
 * L'italiano resta la versione di riferimento, ed e' scritto in fondo alla
 * schermata: la traduzione serve a far capire, non a sostituire l'informativa.
 */
function ConsentPage() {
  const navigate = useNavigate();
  const { segnaConsenso, logout } = useAuth();
  const toast = useToast();
  const t = testi();

  const [accettato, setAccettato] = useState(false);
  const [caricamento, setCaricamento] = useState(false);

  async function conferma() {
    if (!accettato) return;
    setCaricamento(true);
    try {
      const res = await daiConsenso();
      segnaConsenso(res?.token);
      toast.successo(t.consensoGrazie);
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
          <h1 className="auth-logo">{t.consensoTitolo}</h1>
        </div>

        <div className="consent-text">
          <p>{t.consensoP1}</p>
          <p>
            {t.consensoP2a} <strong>Anthropic</strong> {t.consensoP2b} <strong>OpenAI</strong>.{' '}
            {t.consensoP2c} <strong>{t.consensoP2d}</strong>{t.consensoP2e}
          </p>
          <ul>
            <li><strong>{t.consensoNome}</strong>{t.consensoNomeSeg}</li>
            <li>{t.consensoDelicate}</li>
            <li>
              {t.consensoCifraA} <strong>{t.consensoCifraB}</strong> {t.consensoCifraC}{' '}
              <strong>{t.consensoCifraD}</strong>{t.consensoCifraE}
            </li>
            <li>{t.consensoSmettiA} <strong>{t.consensoSmettiB}</strong>{t.consensoSmettiC}</li>
            <li>{t.consensoDiagnosiA} <strong>{t.consensoDiagnosiB}</strong> {t.consensoDiagnosiC}</li>
          </ul>
        </div>

        <label className="consent-check">
          <input type="checkbox" checked={accettato} onChange={(e) => setAccettato(e.target.checked)} />
          <span>{t.consensoSpuntaA} <strong>{t.consensoSpuntaB}</strong> {t.consensoSpuntaC}</span>
        </label>

        <button
          type="button"
          className="btn-primary auth-submit"
          onClick={conferma}
          disabled={!accettato || caricamento}
        >
          {caricamento ? t.consensoAttendi : t.consensoContinua}
        </button>

        <button type="button" className="btn-ghost auth-toggle" onClick={logout} disabled={caricamento}>
          {t.consensoEsci}
        </button>

        {/* Detto apertamente: la traduzione serve a capire, l'italiano fa fede.
            Nasconderlo sarebbe scorretto verso chi legge l'inglese o il francese. */}
        <p className="consent-riferimento">{t.consensoRiferimento}</p>
      </div>
    </div>
  );
}

export default ConsentPage;
