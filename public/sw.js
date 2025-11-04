// sw.js - PWA Service Worker v1.0.4
const CACHE_VERSION = 'v1.0.4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'runtime';

const ASSETS = [
  '/',
  '/index.html',
  '/chat.html',
  '/manifest.webmanifest?v=4',
  '/icons/icon-192.png?v=4',
  '/icons/icon-512.png?v=4',
  '/icons/maskable-192.png?v=4',
  '/icons/maskable-512.png?v=4',
  '/offline.html'
];

self.addEventListener('install', (e) => {
  console.log('[SW] install', CACHE_VERSION);
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  console.log('[SW] activate', CACHE_VERSION);
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map(k => {
            console.log('[SW] delete old cache:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  const url = new URL(e.request.url);
  const pathname = url.pathname;
  
  // Static assets: cache first
  const isStatic = ASSETS.some(asset => pathname === asset.split('?')[0]);
  
  if (isStatic) {
    e.respondWith(
      caches.match(e.request)
        .then(hit => hit || fetch(e.request).then(r => {
          return caches.open(STATIC_CACHE).then(c => {
            c.put(e.request, r.clone());
            return r;
          });
        }))
        .catch(() => caches.match('/offline.html'))
    );
  } 
  // Dynamic: network first
  else {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          return caches.open(RUNTIME_CACHE).then(c => {
            c.put(e.request, r.clone());
            return r;
          });
        })
        .catch(() => caches.match(e.request).then(res => res || caches.match('/offline.html')))
    );
  }
});
