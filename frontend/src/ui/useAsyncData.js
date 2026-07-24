import { useCallback, useEffect, useState } from 'react';

// Carica dati asincroni gestendo in modo uniforme caricamento/errore.
// `loader` deve essere una funzione STABILE (importata, non inline).
export function useAsyncData(loader) {
  const [dati, setDati] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState('');
  const [nonce, setNonce] = useState(0);

  const ricarica = useCallback(() => {
    setCaricamento(true);
    setErrore('');
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let attivo = true;
    async function esegui() {
      try {
        const d = await loader();
        if (attivo) {
          setDati(d);
          setErrore('');
        }
      } catch (err) {
        if (attivo) setErrore(err.message || 'Si è verificato un errore.');
      } finally {
        if (attivo) setCaricamento(false);
      }
    }
    esegui();
    return () => {
      attivo = false;
    };
  }, [loader, nonce]);

  return { dati, caricamento, errore, ricarica };
}
