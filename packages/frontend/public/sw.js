const CACHE_NAME = 'promedio-notas-v3';
const DB_NAME = 'promedio-notas-offline';
const DB_VERSION = 1;

// --- Install ---
self.addEventListener('install', () => {
  self.skipWaiting();
});

// --- Activate ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// --- Fetch ---
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API requests: network-first, fallback to IndexedDB cache (handled by the app layer)
  // Let the axios interceptor handle offline API caching via IndexedDB
  if (request.url.includes('/api/')) return;

  // Navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets with hash: cache-first
  if (request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Icons & manifest: cache-first
  if (request.url.includes('/icons/') || request.url.includes('/manifest.json')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// --- Background Sync ---
// Triggered when the browser regains connectivity and there are queued mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-mutations') {
    event.waitUntil(replayMutationsFromSW());
  }
});

/**
 * Replay queued mutations directly from the service worker.
 * This runs even if the app tab is closed.
 */
async function replayMutationsFromSW() {
  const db = await openIDB();
  const mutations = await getAllFromStore(db, 'offlineQueue');

  if (!mutations.length) return;

  // Sort by timestamp
  mutations.sort((a, b) => a.timestamp - b.timestamp);

  const token = await getTokenFromClients();

  for (const mutation of mutations) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const options = {
        method: mutation.method,
        headers,
      };

      if (mutation.data && (mutation.method === 'POST' || mutation.method === 'PUT')) {
        options.body = JSON.stringify(mutation.data);
      }

      const response = await fetch(`/api${mutation.url.startsWith('/') ? mutation.url : '/' + mutation.url}`, options);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        // Success or client error (won't retry) — remove from queue
        await deleteFromStore(db, 'offlineQueue', mutation.id);
      } else {
        // Server error — stop, try again later
        break;
      }
    } catch {
      // Network still down — stop
      break;
    }
  }

  // Notify open clients that sync is done
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'sync-complete' });
  });
}

/**
 * Try to get the auth token from an open client window.
 */
async function getTokenFromClients() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      // We can't directly access localStorage from SW, so we'll
      // read from the IndexedDB or use a message channel
      // Fallback: parse from a known cookie or skip auth for background sync
    }
  } catch {
    // ignore
  }
  // Fallback: try to read from a cached auth response or skip
  // In practice, the app-layer replay (useOnlineStatus) handles most cases
  return null;
}

// --- IndexedDB helpers for SW context ---

function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('apiCache')) {
        db.createObjectStore('apiCache', { keyPath: 'url' });
      }
      if (!db.objectStoreNames.contains('offlineQueue')) {
        db.createObjectStore('offlineQueue', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteFromStore(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
