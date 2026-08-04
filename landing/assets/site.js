/* NeuroDesk landing — comportamenti condivisi: menu mobile, pagina corrente, banner cookie. */
(function () {
  'use strict';

  // --- Menu mobile: apri/chiudi ---
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('siteNav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --- Evidenzia la pagina corrente nel menu ---
  if (nav) {
    var path = location.pathname.split('/').pop() || 'index.html';
    var links = nav.querySelectorAll('a[data-nav]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('data-nav') === path) {
        links[i].classList.add('is-current');
        links[i].setAttribute('aria-current', 'page');
      }
    }
  }

  // --- Pulsante "Accedi" all'applicazione, su tutte le pagine ---
  // L'etichetta segue la lingua della pagina (<html lang>): sulle versioni EN/FR
  // comparirebbe altrimenti una parola italiana in mezzo a un menu tradotto.
  var ETICHETTA_ACCEDI = { it: 'Accedi', en: 'Sign in', fr: 'Se connecter' };
  if (nav && !nav.querySelector('.nav-accedi')) {
    var lingua = (document.documentElement.getAttribute('lang') || 'it').slice(0, 2).toLowerCase();
    var accedi = document.createElement('a');
    accedi.href = 'https://app.neurodesk.it';
    accedi.className = 'nav-accedi';
    accedi.textContent = ETICHETTA_ACCEDI[lingua] || ETICHETTA_ACCEDI.it;
    nav.appendChild(accedi);
  }

  // --- Banner cookie (solo cookie tecnici, nessun tracciamento) ---
  var banner = document.getElementById('cookieBanner');
  if (banner) {
    var ok = false;
    try { ok = localStorage.getItem('nd-cookie-ok') === '1'; } catch (e) {}
    if (!ok) { banner.hidden = false; }
    var okBtn = document.getElementById('cookieOk');
    if (okBtn) {
      okBtn.addEventListener('click', function () {
        try { localStorage.setItem('nd-cookie-ok', '1'); } catch (e) {}
        banner.hidden = true;
      });
    }
  }

  // --- Cursore "a mirino" (cerchio + pallino) che segue il mouse, come sull'app
  //     e ispirato a centrireset.it. Elementi nel DOM: grandi quanto serve (un
  //     cursore CSS è tappato a 32px). Solo su mouse; l'anello insegue con easing,
  //     il pallino è preciso. ---
  (function cursore() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = document.documentElement;

    var anello = document.createElement('div');
    anello.className = 'cursore-anello';
    anello.setAttribute('aria-hidden', 'true');
    var pallino = document.createElement('div');
    pallino.className = 'cursore-pallino';
    pallino.setAttribute('aria-hidden', 'true');
    document.body.appendChild(anello);
    document.body.appendChild(pallino);
    root.classList.add('cursore-attivo');

    var mx = window.innerWidth / 2, my = window.innerHeight / 2, ax = mx, ay = my;
    function poni(el, x, y) { el.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%)'; }

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      poni(pallino, mx, my);
      if (ridotto) poni(anello, mx, my);
    }, { passive: true });

    document.addEventListener('mouseover', function (e) {
      var cliccabile = e.target.closest ? e.target.closest('a, button, [role="button"], summary, label, input, select, textarea, [onclick]') : null;
      if (cliccabile) { root.classList.add('cursore-su-link'); } else { root.classList.remove('cursore-su-link'); }
    }, { passive: true });

    document.addEventListener('mouseleave', function () { poni(pallino, -100, -100); poni(anello, -100, -100); });

    if (!ridotto) {
      (function loop() {
        ax += (mx - ax) * 0.2; ay += (my - ay) * 0.2;
        poni(anello, ax, ay);
        requestAnimationFrame(loop);
      })();
    }
  })();

  // --- Tasto "torna su": compare dopo un po' di scroll, riporta in cima ---
  (function tornaSu() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'torna-su';
    btn.setAttribute('aria-label', 'Torna su');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V6"/><path d="M6 12l6-6 6 6"/></svg>';
    document.body.appendChild(btn);
    function aggiorna() {
      if (window.scrollY > 500) { btn.classList.add('is-visible'); } else { btn.classList.remove('is-visible'); }
    }
    window.addEventListener('scroll', aggiorna, { passive: true });
    aggiorna();
    btn.addEventListener('click', function () {
      var ridotto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: ridotto ? 'auto' : 'smooth' });
    });
  })();
})();
