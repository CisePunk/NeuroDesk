import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { testi } from '../i18n/lingua';
import InstallaApp from '../ui/InstallaApp';
import SelettoreLingua from '../ui/SelettoreLingua';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const t = testi();

  const [codice, setCodice] = useState('');
  const [password, setPassword] = useState('');
  const [mostraPassword, setMostraPassword] = useState(false);
  const [errore, setErrore] = useState('');
  const [caricamento, setCaricamento] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codice.trim()) {
      setErrore(t.loginCodiceMancante);
      return;
    }
    setErrore('');
    setCaricamento(true);
    try {
      const res = await apiLogin(codice, mostraPassword ? password : '');
      login(res.token, res.ruolo, res.consensoRichiesto);
      navigate('/', { replace: true });
    } catch (err) {
      setErrore(err.message);
    } finally {
      setCaricamento(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <h1 className="auth-logo">NeuroDesk</h1>
          <span className="auth-tagline">{t.loginTagline}</span>
        </div>

        <div className="auth-ruolo" role="radiogroup" aria-label={t.loginComeEntrare}>
          <span className="auth-ruolo-label">{t.loginComeEntrare}</span>
          <div className="auth-ruolo-opzioni">
            <label className={`auth-ruolo-opt${!mostraPassword ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="ruolo-accesso"
                checked={!mostraPassword}
                onChange={() => { setMostraPassword(false); setErrore(''); }}
                disabled={caricamento}
              />
              <span>
                <strong>{t.loginRuoloTester}</strong>
                <small>{t.loginRuoloTesterNota}</small>
              </span>
            </label>
            <label className={`auth-ruolo-opt${mostraPassword ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="ruolo-accesso"
                checked={mostraPassword}
                onChange={() => { setMostraPassword(true); setErrore(''); }}
                disabled={caricamento}
              />
              <span>
                <strong>{t.loginRuoloAdmin}</strong>
                <small>{t.loginRuoloAdminNota}</small>
              </span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>{t.loginCampoCodice}</span>
            <input
              type="text"
              value={codice}
              onChange={(e) => setCodice(e.target.value)}
              placeholder={t.loginSegnaposto}
              autoComplete="off"
              autoFocus
              disabled={caricamento}
            />
          </label>

          {mostraPassword && (
            <label className="auth-field">
              <span>{t.loginCampoPassword}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={caricamento}
              />
            </label>
          )}

          {errore && (
            <p className="auth-error" role="alert">
              {errore}
            </p>
          )}

          <button type="submit" className="btn-primary auth-submit" disabled={caricamento}>
            {caricamento ? t.loginInCorso : t.loginEntra}
          </button>
        </form>
      </div>

      <SelettoreLingua />
      <InstallaApp />
    </div>
  );
}

export default LoginPage;
