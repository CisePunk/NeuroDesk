import { useEffect, useState } from 'react';
import { testi } from '../i18n/lingua';

/**
 * Invito a installare NeuroDesk come app (PWA).
 *
 * L'installazione la offre il browser, non la pagina — e i browser non sono
 * d'accordo su come. Chrome/Edge (Android, desktop) emettono `beforeinstallprompt`:
 * lo intercettiamo e mostriamo un pulsante che lancia il loro dialog. Safari su
 * iPhone non emette niente e non ha un pulsante: l'unico modo è Condividi →
 * Aggiungi a Home, quindi lì mostriamo l'istruzione a parole.
 *
 * Se l'app è già installata (avviata in display-mode standalone) non mostriamo
 * niente: non ha senso invitare a installare ciò che è già installato.
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
  const [istruzioneIos, setIstruzioneIos] = useState(false);
  const [nascondi, setNascondi] = useState(giaInstallata());

  useEffect(() => {
    if (giaInstallata()) return;

    function onPrompt(e) {
      e.preventDefault(); // impedisce il mini-banner automatico: vogliamo il nostro pulsante
      setEvento(e);
    }
    function onInstalled() {
      setNascondi(true);
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (iOsSafari()) setIstruzioneIos(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (nascondi) return null;
  // Browser che non emette l'evento e non è iOS: nessun invito da mostrare.
  if (!evento && !istruzioneIos) return null;

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
        <p className="installa-hint">{t.installaIos}</p>
      )}
    </div>
  );
}
