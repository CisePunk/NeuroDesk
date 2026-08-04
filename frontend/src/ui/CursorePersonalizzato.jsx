import { useEffect, useRef } from 'react';

/**
 * Cursore personalizzato: un cerchio grande con il pallino al centro che segue
 * il mouse, ispirato a centrireset.it.
 *
 * Perché in JS e non in CSS: `cursor: url(...)` è limitato a ~32px dai browser
 * (oltre, Firefox lo ignora del tutto). Qui il cursore sono due elementi nel DOM,
 * quindi grandi quanto vogliamo — utile per la visibilità.
 *
 * Il pallino segue il mouse in modo esatto e immediato; l'anello lo insegue con
 * un filo di ritardo (easing), come nel riferimento. Sopra gli elementi
 * cliccabili l'anello cresce. Tutto questo solo dove c'è un mouse vero: su touch
 * non c'è cursore da seguire e non tocchiamo niente.
 *
 * Nota d'onestà: nascondere il cursore di sistema scavalca l'eventuale
 * ingrandimento del puntatore impostato dall'utente nell'OS. È una scelta
 * estetica; per l'accessibilità pura degli ipovedenti quella di sistema resta la
 * via giusta.
 */
export default function CursorePersonalizzato() {
  const anelloRef = useRef(null);
  const pallinoRef = useRef(null);

  useEffect(() => {
    // Solo con un mouse vero: niente cursore da disegnare su touch.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    root.classList.add('cursore-attivo');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let ax = mx;
    let ay = my;
    let raf = 0;

    const poni = (el, x, y) => {
      if (el) el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    };

    function onMove(e) {
      mx = e.clientX;
      my = e.clientY;
      poni(pallinoRef.current, mx, my);
      if (ridotto) poni(anelloRef.current, mx, my); // senza easing: l'anello è preciso
    }

    function loop() {
      ax += (mx - ax) * 0.2;
      ay += (my - ay) * 0.2;
      poni(anelloRef.current, ax, ay);
      raf = requestAnimationFrame(loop);
    }

    // Sopra i cliccabili l'anello cresce (vedi .cursore-su-link nel CSS).
    function onOver(e) {
      const cliccabile = e.target.closest?.(
        'a, button, [role="button"], summary, label, input, select, textarea, [onclick]'
      );
      root.classList.toggle('cursore-su-link', !!cliccabile);
    }

    // Quando il mouse esce dalla finestra, nascondi gli elementi.
    function onLeave() {
      poni(pallinoRef.current, -100, -100);
      poni(anelloRef.current, -100, -100);
    }

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    if (!ridotto) raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf);
      root.classList.remove('cursore-attivo', 'cursore-su-link');
    };
  }, []);

  return (
    <>
      <div ref={anelloRef} className="cursore-anello" aria-hidden="true" />
      <div ref={pallinoRef} className="cursore-pallino" aria-hidden="true" />
    </>
  );
}
