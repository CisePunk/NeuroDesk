// NeuroDesk — service worker minimale, scritto a mano (niente workbox, niente
// dipendenze). Trasparente: si legge tutto qui.
//
// REGOLA DI PRIVACY (la ragione per cui è scritto a mano): le risposte di /api/*
// NON vengono MAI messe in cache. Le conversazioni restano sul server cifrato,
// non nella cache del dispositivo. In cache va solo il "guscio" statico dell'app.

const CACHE = 'neurodesk-shell-v2';

// Guscio noto da precaricare, così l'app apre anche offline.
const SHELL = [
  '/', '/index.html', '/404.html', '/manifest.webmanifest',
  '/favicon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Solo GET same-origin passa dalla cache; tutto il resto va in rete e basta.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // MAI in cache i dati sensibili: le API restano solo-rete.
  if (url.pathname.startsWith('/api/')) return;

  // Navigazioni: rete-prima, con il guscio offline di riserva.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() =>
        caches.match('/index.html').then((r) => r || caches.match('/404.html'))
      )
    );
    return;
  }

  // Asset di build (/assets/index-<hash>.js): il nome cambia a ogni deploy,
  // quindi sono immutabili — cache-prima, veloci e senza rischio di stantìo.
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }

  // Resto del guscio (icone, manifest, favicon): nome FISSO ma contenuto che
  // può cambiare tra un deploy e l'altro. Rete-prima, così l'aggiornamento
  // passa da solo appena si è online; la cache resta solo riserva offline.
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
