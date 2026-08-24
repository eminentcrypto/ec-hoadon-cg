const CACHE_NAME = 'ecorp-hoadon-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/') ||
      url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
