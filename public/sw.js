// Minimal PWA service worker: cache-first for static assets + SWR for others
const CACHE_NAME = 'amanjiwo-cache-v3';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/logo/logo-main.png',
  '/logo/logo-white.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET
  if (req.method !== 'GET') return;

  // For navigation requests, try network first then cache fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/'))
    );
    return;
  }

  // Cache-first ONLY for static assets (avoid caching API/auth responses)
  if (req.url.startsWith(self.location.origin)) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const isStatic =
      pathname.startsWith('/_next/static') ||
      pathname.endsWith('.css') ||
      pathname.endsWith('.js') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.jpeg') ||
      pathname.endsWith('.svg') ||
      pathname.endsWith('.ico') ||
      pathname.endsWith('.webmanifest') ||
      pathname.startsWith('/logo/') ||
      pathname.startsWith('/icons/');

    if (isStatic) {
      event.respondWith(
        caches.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return res;
          });
        })
      );
    }
  }
});
