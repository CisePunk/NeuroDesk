import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMe } from '../api/authApi';
import { clearToken, getToken, setToken as saveToken } from '../api/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [ruolo, setRuolo] = useState(null);
  const [consensoDato, setConsensoDato] = useState(true);
  const [caricato, setCaricato] = useState(false);

  const logout = useCallback(() => {
    clearToken();
    // Pulisce la conversazione Companion salvata nel browser: su un dispositivo
    // condiviso non deve restare materiale sensibile dell'utente precedente.
    // sessionStorage e' l'archivio attuale; localStorage per le copie legacy.
    sessionStorage.removeItem('nd-companion-active');
    localStorage.removeItem('nd-companion-active');
    setTokenState(null);
    setRuolo(null);
    setConsensoDato(true);
  }, []);

  // All'avvio (o quando cambia il token) recupera ruolo e stato consenso.
  useEffect(() => {
    let attivo = true;
    async function caricaMe() {
      if (!token) {
        setCaricato(true);
        return;
      }
      try {
        const me = await getMe();
        if (!attivo) return;
        setRuolo(me.ruolo);
        setConsensoDato(me.consensoDato);
      } catch {
        if (attivo) logout();
      } finally {
        if (attivo) setCaricato(true);
      }
    }
    caricaMe();
    return () => {
      attivo = false;
    };
  }, [token, logout]);

  // Logout automatico quando una chiamata riceve 401 (token scaduto).
  useEffect(() => {
    window.addEventListener('nd-unauthorized', logout);
    return () => window.removeEventListener('nd-unauthorized', logout);
  }, [logout]);

  const login = useCallback((nuovoToken, nuovoRuolo, consensoRichiesto) => {
    saveToken(nuovoToken);
    setTokenState(nuovoToken);
    setRuolo(nuovoRuolo);
    setConsensoDato(!consensoRichiesto);
    setCaricato(true);
  }, []);

  // Dopo il consenso il backend rilascia un token NUOVO (con consenso=true):
  // va salvato, altrimenti il vecchio token verrebbe rifiutato dal companion.
  const segnaConsenso = useCallback((nuovoToken) => {
    if (nuovoToken) {
      saveToken(nuovoToken);
      setTokenState(nuovoToken);
    }
    setConsensoDato(true);
  }, []);

  const value = {
    isAuth: !!token,
    ruolo,
    consensoDato,
    caricato,
    login,
    logout,
    segnaConsenso,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
