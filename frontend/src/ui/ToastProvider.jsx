import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let contatore = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const rimuovi = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const mostra = useCallback(
    (messaggio, tipo) => {
      const id = ++contatore;
      setToasts((t) => [...t, { id, messaggio, tipo }]);
      timers.current[id] = setTimeout(() => rimuovi(id), 5000);
    },
    [rimuovi],
  );

  const api = {
    info: (m) => mostra(m, 'info'),
    successo: (m) => mostra(m, 'successo'),
    errore: (m) => mostra(m, 'errore'),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tipo}`} role="status" onClick={() => rimuovi(t.id)}>
            {t.messaggio}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}
