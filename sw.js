const CACHE = 'na-zdravje-v9';
const PRECACHE = [
  '/index.html',
  '/landing.html',
  '/css/styles.css',
  '/css/landing.css',
  '/js/app.js',
  '/js/state.js',
  '/js/screens.js',
  '/js/deck.js',
  '/js/audio.js',
  '/js/confetti.js',
  '/js/analytics.js',
  '/js/entitlement.js',
  '/js/landing.js',
  '/js/data/cards.classic.js',
  '/js/data/cards.spicy.js',
  '/manifest.webmanifest',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Skip Google Fonts and any cross-origin requests
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
