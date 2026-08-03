import { useEffect, useState } from 'react';
import { testi } from '../i18n/lingua';

/**
 * Invito a installare NeuroDesk come app (PWA).
 *
 * L'installazione la offre il browser, non la pagina — e i browser non sono
 * d'accordo su come. Chrome/Edge (Android, desktop) emettono `beforeinstallprompt`:
 * lo intercettiamo e mostriamo un pulsante che lancia il loro dialog. Ma quell'evento
 * NON arriva se l'app è già installata, e su Safari iPhone non arriva mai. In quei
 * casi il pulsante da solo lascerebbe la pagina muta — chi vuole (ri)mettere l'app
 * sulla Home non troverebbe niente. Perciò, quando l'evento non c'è, mostriamo
 * comunque le istruzioni a parole: quelle di Safari, o quelle generiche del menu.
 *
 * Se l'app è già aperta come app (display-mode standalone) non mostriamo niente:
 * lì l'invito non ha senso.
 */

function giaInstallata() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // Safari iOS espone questo flag quando gira dalla schermata Home.
    window.navigator.standalone === true
  );
}

function iOsSafari() {
  const ua = navigator.userAgent || '';
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPad su iPadOS si presenta come un Mac: lo riconosciamo dal touch.
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  // Chrome/Firefox/Edge su iOS non possono installare: solo Safari.
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIOS && isSafari;
}

export default function InstallaApp() {
  const t = testi();
  const [evento, setEvento] = useState(null); // beforeinstallprompt (Chrome/Edge)
  const [manuale, setManuale] = useState(null); // null | 'ios' | 'generico'
  const [nascondi, setNascondi] = useState(giaInstallata());

  useEffect(() => {
    if (giaInstallata()) return;

    let timer;
    function onPrompt(e) {
      e.preventDefault(); // impedisce il mini-banner automatico: vogliamo il nostro pulsante
      setEvento(e);
      setManuale(null); // il pulsante batte le istruzioni: se possiamo installare, installiamo
      clearTimeout(timer);
    }
    function onInstalled() {
      setNascondi(true);
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (iOsSafari()) {
      setManuale('ios');
    } else {
      // Diamo a Chrome un attimo per emettere l'evento. Se non arriva — già
      // installata, o browser che non lo supporta — mostriamo le istruzioni
      // manuali invece di restare muti.
      timer = setTimeout(() => setManuale((m) => m || 'generico'), 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      clearTimeout(timer);
    };
  }, []);

  if (nascondi) return null;
  if (!evento && !manuale) return null;

  async function installa() {
    if (!evento) return;
    evento.prompt();
    try {
      await evento.userChoice;
    } catch {
      /* l'utente ha chiuso il dialog: nessun problema */
    }
    setEvento(null); // l'evento è monouso
  }

  return (
    <div className="installa-app">
      {evento ? (
        <button type="button" className="btn-ghost installa-btn" onClick={installa}>
          {t.installaApp}
        </button>
      ) : (
        <p className="installa-hint">{manuale === 'ios' ? t.installaIos : t.installaManuale}</p>
      )}
    </div>
  );
}
