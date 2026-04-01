const CACHE_NAME = 'intelhub-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches (including stale intelhub-v2)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for everything (cache is offline fallback only)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls and SSE streams — always go to network, never cache
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // All static assets — network-first, cache fallback for offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful same-origin responses for offline use
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)) // Offline: serve from cache
  );
});
