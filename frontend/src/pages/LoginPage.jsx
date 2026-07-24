import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [codice, setCodice] = useState('');
  const [password, setPassword] = useState('');
  const [mostraPassword, setMostraPassword] = useState(false);
  const [errore, setErrore] = useState('');
  const [caricamento, setCaricamento] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!codice.trim()) {
      setErrore('Inserisci il tuo codice di accesso.');
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
          <span className="auth-logo">NeuroDesk</span>
          <span className="auth-tagline">Entra con il tuo codice</span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="auth-field">
            <span>Codice di accesso</span>
            <input
              type="text"
              value={codice}
              onChange={(e) => setCodice(e.target.value)}
              placeholder="es. neuro-xxxx-xxxx-xxxx-xxxx"
              autoComplete="off"
              autoFocus
              disabled={caricamento}
            />
          </label>

          {mostraPassword && (
            <label className="auth-field">
              <span>Password (solo per la scuola)</span>
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
            {caricamento ? 'Accesso…' : 'Entra'}
          </button>

          <button
            type="button"
            className="btn-ghost auth-toggle"
            onClick={() => setMostraPassword((v) => !v)}
            disabled={caricamento}
          >
            {mostraPassword ? '← Entra come tester (solo codice)' : 'Sei la scuola? Accedi con password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
