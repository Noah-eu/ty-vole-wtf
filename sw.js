// sw.js
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'runtime';

// Přednačti základ
const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)));
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

// Navigace = network-first s fallbackem na offline.html
// Statika z PRECACHE = cache-first
// Ostatní = stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass SW caching for track API endpoints (always network-first)
  if (
    url.pathname.startsWith('/.netlify/functions/get-tracks') ||
    url.pathname.startsWith('/.netlify/functions/daily-song') ||
    url.pathname.startsWith('/tracks/')
  ) {
    event.respondWith(fetch(req));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(req)) || caches.match('/offline.html'))
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
