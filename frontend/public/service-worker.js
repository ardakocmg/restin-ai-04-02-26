/**
 * Service Worker - Offline Asset Caching & Network Resilience
 * 
 * Strategies:
 * - Static assets: Cache-first
 * - API calls: Network-first with offline fallback
 * - Images: Cache-first with network fallback
 */

const CACHE_VERSION = 'restin-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install - Cache static assets
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('⚠️ Some assets failed to cache:', err);
      });
    })
  );

  self.skipWaiting();
});

// Activate - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('restin-') && name !== STATIC_CACHE && name !== API_CACHE && name !== IMAGE_CACHE)
          .map((name) => {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  self.clients.claim();
});

// Fetch - Handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Auth - Bypass Service Worker
  if (url.pathname.startsWith('/api/auth/')) {
    return;
  }

  // Bypass Service Worker for local development ports and Edge Gateway
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    if (url.port === '8080' || url.port === '8081' || url.port === '5000' || url.port === '3000' || url.port === '8001') {
      return;
    }
  }

  // API calls - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
  }
  // Images - Cache first
  else if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  }
  // Static assets - Cache first
  else {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  }
});

// Network-first strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);

    // Cache successful GET requests
    if (request.method === 'GET' && response.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed - try cache
    const cached = await caches.match(request);

    if (cached) {
      console.log('📦 Serving from cache (offline):', request.url);
      return cached;
    }

    // No cache - return offline response with clear error
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: 'OFFLINE',
          message: 'Network access failed and no cached response available.'
        },
        offline: true
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache-first strategy (for static assets)
async function cacheFirstStrategy(request, cacheName) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (request.method === 'GET' && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    // Network failed and no cache
    console.error('❌ Asset not available offline:', request.url);

    return new Response('Offline - Asset not cached', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Background sync for queued operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  // This would trigger the SyncService from the client
  // Send message to all clients to start sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'TRIGGER_SYNC',
      timestamp: new Date().toISOString()
    });
  });
}

// Push notifications for sync status
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  if (data.type === 'SYNC_COMPLETE') {
    self.registration.showNotification('Sync Complete', {
      body: `${data.synced_count} operations synced successfully`,
      icon: '/logo192.png',
      badge: '/logo192.png'
    });
  }
});

console.log('🚀 Service Worker loaded');
