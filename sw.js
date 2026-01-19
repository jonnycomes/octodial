// Development mode - set to true during development, false for production
const DEV_MODE = false;

const CACHE_NAME = `octodial-v${Date.now()}`;
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

self.addEventListener('install', event => {
    // Skip waiting in dev mode to update immediately
    if (DEV_MODE) {
        self.skipWaiting();
    }
    
    if (!DEV_MODE) {
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(cache => cache.addAll(urlsToCache))
        );
    }
});

self.addEventListener('fetch', event => {
    if (DEV_MODE) {
        // In dev mode, always fetch from network with cache-busting
        const url = new URL(event.request.url);
        url.searchParams.set('_t', Date.now());
        
        event.respondWith(
            fetch(url.href, {
                cache: 'no-cache'
            }).catch(() => {
                // Fallback to original request if cache-busted fails
                return fetch(event.request);
            })
        );
    } else {
        // Production mode - use caching
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request);
                })
        );
    }
});

self.addEventListener('activate', event => {
    // Take control immediately in dev mode
    if (DEV_MODE) {
        self.clients.claim();
        // Clear all caches in dev mode
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    } else {
        // Production mode - only clear old caches
        const cacheWhitelist = [CACHE_NAME];
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheWhitelist.indexOf(cacheName) === -1) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        );
    }
});