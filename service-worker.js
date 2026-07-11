const CACHE_NAME = 'eyes-alarm-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/schedule.js',
  './js/notify.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

// Clicking a dose notification marks it complete: message any open tab, or
// open one with the dose id in the query string so app.js can apply it on load.
self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (data.doseId) {
        allClients.forEach((client) => client.postMessage({ type: 'COMPLETE_DOSE', doseId: data.doseId }));
      }
      if (allClients.length > 0) {
        allClients[0].focus();
      } else {
        const base = new URL('./', self.registration.scope).href;
        const url = data.doseId ? `${base}?complete=${encodeURIComponent(data.doseId)}` : base;
        await self.clients.openWindow(url);
      }
    })()
  );
});
