import { LINGUE, linguaCorrente, impostaLingua } from '../i18n/lingua';

// Ogni lingua scritta nella propria lingua: si riconosce anche da chi non capisce
// quella attualmente attiva.
const NOMI = { it: 'Italiano', en: 'English', fr: 'Français' };

/**
 * Selettore di lingua.
 *
 * L'app deduce la lingua dal telefono, ma senza un modo per cambiarla un revisore
 * straniero resta bloccato sull'italiano (o chi ha il telefono in inglese non
 * vede mai l'italiano). Qui la si sceglie a mano.
 *
 * Alla scelta salviamo e ricarichiamo la pagina: testi() rilegge la lingua a ogni
 * render, quindi un reload la riapplica ovunque — menu, aiuto, consenso — senza
 * dover cablare un contesto reattivo dentro decine di componenti che chiamano
 * testi() da soli. Cambiare lingua è raro: un reload è un prezzo onesto per zero
 * rischi di pezzi rimasti nella lingua vecchia.
 */
export default function SelettoreLingua({ className = '' }) {
  const attuale = linguaCorrente();

  function scegli(lang) {
    if (lang === attuale) return;
    impostaLingua(lang);
    window.location.reload();
  }

  return (
    <div
      className={`selettore-lingua ${className}`.trim()}
      role="group"
      aria-label="Lingua · Language · Langue"
    >
      {LINGUE.map((lang) => (
        <button
          key={lang}
          type="button"
          className={`lingua-pill${lang === attuale ? ' attiva' : ''}`}
          aria-pressed={lang === attuale}
          onClick={() => scegli(lang)}
        >
          {NOMI[lang]}
        </button>
      ))}
    </div>
  );
}
