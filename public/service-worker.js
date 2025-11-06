// service-worker.js - Simple PWA Service Worker for update notifications
self.addEventListener('install', () => {
  // No precaching, just wait for activation
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', () => {
  // No caching strategy, passthrough
});
