// Applica il tema prima del render React, per non far lampeggiare la pagina.
// Sta in un file esterno (non inline) così la CSP può vietare gli script inline
// — la difesa vera contro un XSS che vorrebbe rubare il token di sessione.
(function () {
  var saved = localStorage.getItem('nd-theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();
