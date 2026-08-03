// NeuroDesk — service worker minimale, scritto a mano (niente workbox, niente
// dipendenze). Trasparente: si legge tutto qui.
//
// REGOLA DI PRIVACY (la ragione per cui è scritto a mano): le risposte di /api/*
// NON vengono MAI messe in cache. Le conversazioni restano sul server cifrato,
// non nella cache del dispositivo. In cache va solo il "guscio" statico dell'app.

const CACHE = 'neurodesk-shell-v1';

// Guscio noto da precaricare. Gli asset di build hanno il nome con hash e
// entrano in cache a runtime (cache-first): quando esce un deploy nuovo il nome
// cambia, quindi non resta mai servita una versione vecchia.
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

  // Asset statici (JS/CSS/immagini con hash): cache-prima, poi rete.
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
});
