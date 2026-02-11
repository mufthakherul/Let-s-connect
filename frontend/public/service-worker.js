/* eslint-disable no-restricted-globals */

const CACHE_VERSION = 'v4.0.0';
const CACHE_NAME = `lets-connect-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// API patterns that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/user\/profile/,
  /\/api\/content\/posts/,
  /\/api\/content\/blogs/
];

// Max age for cached API responses (2 minutes for real-time content)
const API_CACHE_MAX_AGE = 2 * 60 * 1000;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Force the waiting service worker to become active
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(cacheFirstStrategy(request));
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    // Return a basic error response
    return new Response('Network error', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network-first strategy for API requests with caching
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse.ok && shouldCacheAPIRequest(request)) {
      const cache = await caches.open(CACHE_NAME);
      const responseToCache = networkResponse.clone();
      
      // Add timestamp to response headers for cache invalidation
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, trying cache:', error);

    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Check if cached response is still valid
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      if (cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp, 10);
        if (age < API_CACHE_MAX_AGE) {
          console.log('[Service Worker] Serving from cache');
          return cachedResponse;
        }
      }
    }

    // Return error response
    return new Response(JSON.stringify({ 
      error: 'Network unavailable',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Determine if API request should be cached
function shouldCacheAPIRequest(request) {
  const url = new URL(request.url);
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  } else if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncPosts() {
  // Sync queued posts when back online
  console.log('[Service Worker] Syncing posts...');
  // Implementation would fetch from IndexedDB and POST to API
}

async function syncMessages() {
  // Sync queued messages when back online
  console.log('[Service Worker] Syncing messages...');
  // Implementation would fetch from IndexedDB and POST to API
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Let\'s Connect';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.priority === 'high'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification.tag);
  event.notification.close();

  // Handle notification action
  if (event.action) {
    console.log('[Service Worker] Notification action:', event.action);
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        const url = event.notification.data?.url || '/';
        return clients.openWindow(url);
      })
  );
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME)
    );
  }
});

console.log('[Service Worker] Loaded version:', CACHE_VERSION);
