const CACHE_NAME = 'qr-studio-cache-v1';
const ASSETS_TO_CACHE = [
    '/qr-studio',
    '/index.tsx', // This represents dev mode, in prod it will be built files
    '/favicon.ico',
];

self.addEventListener('install', (event) =>
{
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
        {
            // Best effort caching for dev/prod paths
            return cache.addAll(ASSETS_TO_CACHE).catch(err =>
            {
                console.warn('SW Install cache failed (expected in dev)', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) =>
{
    event.waitUntil(
        caches.keys().then((keys) =>
        {
            return Promise.all(
                keys.map((key) =>
                {
                    if (key !== CACHE_NAME)
                    {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) =>
{
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    // Network first for APIs or Supabase, Cache fallback for offline
    event.respondWith(
        fetch(event.request)
            .then((response) =>
            {
                // Cache successful non-API responses
                if (response && response.status === 200 && response.type === 'basic')
                {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) =>
                    {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() =>
            {
                // Fallback to cache if offline
                return caches.match(event.request).then((response) =>
                {
                    if (response)
                    {
                        return response;
                    }
                    // If navigation request and not in cache, fallback to main PWA skeleton
                    if (event.request.mode === 'navigate')
                    {
                        return caches.match('/qr-studio');
                    }
                    return new Response('Network error happened', {
                        status: 408,
                        headers: { 'Content-Type': 'text/plain' },
                    });
                });
            })
    );
});
