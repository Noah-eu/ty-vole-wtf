// service-worker.js - Simple PWA Service Worker for update notifications
// Version managed by git commit SHA, not timestamp
const VERSION = 'v1.0.0';

self.addEventListener('install', (e) => {
  // Don't call skipWaiting() here - wait for explicit message
  console.log('[SW] Install', VERSION);
});

self.addEventListener('activate', (e) => {
  // Don't call clients.claim() automatically
  console.log('[SW] Activate', VERSION);
  e.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received');
    self.skipWaiting();
  }
  if (e.data?.type === 'CLAIM_CLIENTS') {
    console.log('[SW] CLAIM_CLIENTS received');
    self.clients.claim();
  }
});

self.addEventListener('fetch', () => {
  // No caching strategy, passthrough
});
