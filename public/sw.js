// RealWorth.ai Service Worker
// Bump version to invalidate caches on deploy
const CACHE_VERSION = 'v6-2025-12-05';
const CACHE_NAME = `realworth-${CACHE_VERSION}`;
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.svg',
  '/apple-touch-icon.png',
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first strategy for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API routes - always fetch fresh
  if (url.pathname.startsWith('/api/')) return;

  // Skip auth callbacks
  if (url.pathname.includes('auth')) return;

  // For navigation requests, try network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/'))
    );
    return;
  }

  // For Next.js bundles, use stale-while-revalidate
  // This serves cached content immediately but updates cache in background
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          // Return cached response immediately, update cache in background
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // For other static assets, try cache first, then network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200) {
          return response;
        }
        // Cache successful responses for static assets
        if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?)$/)) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});
