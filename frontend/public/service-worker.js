/* eslint-disable no-restricted-globals */

// Bump manually when cache invalidation is required.
const CACHE_VERSION = 'v13-mobile-pwa-1';
const CACHE_NAME = `milonexa-${CACHE_VERSION}`;

const SYNC_DB_NAME = 'milonexa-sync-db';
const SYNC_STORE_NAME = 'queued-requests';
const MAX_SYNC_ATTEMPTS = 5;
const SW_DEBUG = false;
const swLog = (...args) => { if (SW_DEBUG) console.log(...args); };
const swWarn = (...args) => { if (SW_DEBUG) console.warn(...args); };

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icon.svg',
  '/logo.png'
];

// API patterns that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/user\/profile/,
  /\/api\/content\/posts/,
  /\/api\/content\/blogs/,
  /\/api\/messaging\/notifications/
];

// Max age for cached API responses (5 minutes)
const API_CACHE_MAX_AGE = 5 * 60 * 1000;

const MUTATION_SYNC_PATTERNS = [
  {
    tag: 'sync-posts',
    pattern: /\/api\/content\/posts(\/|$)/
  },
  {
    tag: 'sync-messages',
    pattern: /\/api\/messaging\/(conversations\/[^/]+\/messages|messages)(\/|$)/
  }
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  swLog('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      swLog('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Force the waiting service worker to become active
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  swLog('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            swLog('[Service Worker] Deleting old cache:', cacheName);
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

  // Handle offline queue for selected mutating requests
  if (request.method !== 'GET') {
    const syncTag = getSyncTagForRequest(request);
    if (syncTag) {
      event.respondWith(handleMutationRequest(request, syncTag));
    }
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // For navigations, prefer fresh HTML from network to avoid serving stale
  // index.html that can reference outdated JS bundles.
  if (request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(request));
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
    swWarn('[Service Worker] Fetch failed:', error);

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    // Bubble as network error instead of synthetic 408 to avoid noisy app logs.
    return Response.error();
  }
}

// Navigation requests should prefer network so shell updates are applied
// immediately, while still providing offline fallback.
async function navigationNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response('Offline', {
      status: 503,
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
    swLog('[Service Worker] Network request failed, trying cache:', error);

    // Try to serve from cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Check if cached response is still valid
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      if (cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp, 10);
        if (age < API_CACHE_MAX_AGE) {
          swLog('[Service Worker] Serving from cache');
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

function getSyncTagForRequest(request) {
  const url = new URL(request.url);
  const matched = MUTATION_SYNC_PATTERNS.find(({ pattern }) => pattern.test(url.pathname));
  return matched?.tag || null;
}

async function handleMutationRequest(request, syncTag) {
  try {
    return await fetch(request.clone());
  } catch (error) {
    const queued = await queueRequestForSync(request, syncTag);

    if (queued) {
      await registerSyncTag(syncTag);
      return new Response(JSON.stringify({
        queued: true,
        offline: true,
        message: 'Request queued and will sync when online'
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: 'Network unavailable',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function queueRequestForSync(request, tag) {
  try {
    const payload = await serializeRequestForQueue(request, tag);
    if (!payload) {
      return false;
    }

    await addQueuedRequest(payload);
    swLog('[Service Worker] Request queued for sync:', tag, payload.url);
    return true;
  } catch (error) {
    console.error('[Service Worker] Failed to queue request for sync:', error);
    return false;
  }
}

async function serializeRequestForQueue(request, tag) {
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const contentType = request.headers.get('content-type') || '';
  let body = null;

  if (!['GET', 'HEAD'].includes(request.method)) {
    if (contentType.includes('multipart/form-data')) {
      // Binary uploads are skipped for now and should be retried by the app.
      return null;
    }

    body = await request.clone().text();
  }

  return {
    url: request.url,
    method: request.method,
    headers,
    body,
    tag,
    queuedAt: Date.now(),
    attempts: 0
  };
}

function openSyncDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in self)) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const openRequest = indexedDB.open(SYNC_DB_NAME, 1);

    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
        const store = db.createObjectStore(SYNC_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('tag', 'tag', { unique: false });
      }
    };

    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error || new Error('Failed to open sync database'));
  });
}

async function addQueuedRequest(payload) {
  const db = await openSyncDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SYNC_STORE_NAME);
    const addRequest = store.add(payload);

    addRequest.onsuccess = () => resolve(addRequest.result);
    addRequest.onerror = () => reject(addRequest.error);

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function getQueuedRequestsByTag(tag) {
  const db = await openSyncDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE_NAME, 'readonly');
    const store = transaction.objectStore(SYNC_STORE_NAME);
    const index = store.index('tag');
    const getRequest = index.getAll(tag);

    getRequest.onsuccess = () => resolve(getRequest.result || []);
    getRequest.onerror = () => reject(getRequest.error);

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function deleteQueuedRequest(id) {
  const db = await openSyncDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SYNC_STORE_NAME);
    const deleteRequest = store.delete(id);

    deleteRequest.onsuccess = () => resolve(true);
    deleteRequest.onerror = () => reject(deleteRequest.error);

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function updateQueuedRequest(item) {
  const db = await openSyncDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(SYNC_STORE_NAME);
    const putRequest = store.put(item);

    putRequest.onsuccess = () => resolve(true);
    putRequest.onerror = () => reject(putRequest.error);

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function registerSyncTag(tag) {
  if (!('sync' in self.registration)) {
    return;
  }

  try {
    await self.registration.sync.register(tag);
  } catch (error) {
    console.warn('[Service Worker] Unable to register sync tag:', tag, error);
  }
}

async function incrementSyncAttempt(item) {
  const attempts = (item.attempts || 0) + 1;

  if (attempts >= MAX_SYNC_ATTEMPTS) {
    await deleteQueuedRequest(item.id);
    return;
  }

  await updateQueuedRequest({ ...item, attempts });
}

async function replayQueuedRequests(tag) {
  const queuedRequests = await getQueuedRequestsByTag(tag);

  for (const item of queuedRequests) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
        credentials: 'include'
      });

      if (response.ok) {
        await deleteQueuedRequest(item.id);
      } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        // Client-side validation/auth errors should not loop forever.
        await deleteQueuedRequest(item.id);
      } else {
        await incrementSyncAttempt(item);
      }
    } catch (error) {
      await incrementSyncAttempt(item);
    }
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  swLog('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  } else if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncPosts() {
  swLog('[Service Worker] Syncing posts...');
  await replayQueuedRequests('sync-posts');
}

async function syncMessages() {
  swLog('[Service Worker] Syncing messages...');
  await replayQueuedRequests('sync-messages');
}

// Push notifications
self.addEventListener('push', (event) => {
  swLog('[Service Worker] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Let\'s Connect';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/logo.png',
    badge: '/icon.svg',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.priority === 'high',
    vibrate: data.vibrate || [120, 40, 120]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  swLog('[Service Worker] Notification clicked:', event.notification.tag);
  event.notification.close();

  // Handle notification action
  if (event.action) {
    swLog('[Service Worker] Notification action:', event.action);
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const destination = event.notification.data?.url || '/';

        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            if ('navigate' in client) {
              client.navigate(destination);
            }
            return client.focus();
          }
        }

        // Open new window
        return clients.openWindow(destination);
      })
  );
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  swLog('[Service Worker] Message received:', event.data);

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
      caches.keys().then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
    );
  } else if (event.data.type === 'REGISTER_SYNC' && event.data.tag) {
    event.waitUntil(
      registerSyncTag(event.data.tag)
    );
  }
});

swLog('[Service Worker] Loaded version:', CACHE_VERSION);
