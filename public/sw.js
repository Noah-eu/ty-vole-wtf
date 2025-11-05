// sw.js
const CACHE_VERSION = 'v1.0.6';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'runtime';

// Získej base path z location service workeru
const BASE = self.registration.scope;

// Přednačti základ - použij absolutní cesty s verzí
const PRECACHE = [
  '/',
  '/index.html',
  '/chat.html',
  '/offline.html',
  '/manifest.webmanifest?v=6',
  '/icons/icon-192.png?v=6',
  '/icons/icon-512.png?v=6',
  '/icons/maskable-192.png?v=6',
  '/icons/maskable-512.png?v=6'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE).catch(e => console.error('Precache failed:', e))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => ![STATIC_CACHE, RUNTIME_CACHE].includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Navigace = network-first s fallbackem na cache
// Statika z PRECACHE = cache-first
// Ostatní = stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(req)) || caches.match('./offline.html'))
    );
    return;
  }

  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((c) => c || fetch(req)));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((netRes) => {
          if (netRes && netRes.status === 200 && netRes.type === 'basic') {
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, netRes.clone()));
          }
          return netRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
