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
})();
