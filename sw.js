/* Offline shell.
 *
 * The document is deliberately never served from cache while the network is
 * reachable, and is fetched with cache:'no-store' so the browser's own HTTP
 * cache cannot satisfy it either. A cached document replays the headers it was
 * stored with, which quietly pins the app to an old version.
 *
 * Story content is network-first for the same reason but louder: he edits it
 * often, and she must never be reading a version he has already fixed. The
 * cached copy is only there so the app still opens on the Underground.
 *
 * Bump CACHE whenever the shell list changes.
 */
const CACHE = 'us-v1';
const DOC = 'index.html';
const SHELL = [
  './', DOC,
  'src/main.js', 'src/stations.js', 'src/theme.js', 'src/card.js',
  'src/terrain.js', 'src/finds.js', 'src/tend.js', 'src/homestead.js', 'src/panel.js',
  'src/backend.js', 'src/app.css',
  'manifest.webmanifest',
  'assets/icons/icon-180.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  const isDoc = e.request.mode === 'navigate' || e.request.destination === 'document';
  if (isDoc) {
    e.respondWith(
      fetch(url.href, {cache: 'no-store', credentials: 'same-origin'})
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(DOC, copy)); return r; })
        .catch(() => caches.match(DOC)));
    return;
  }

  if (url.pathname.includes('/content/')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
        .catch(() => caches.match(e.request)));
    return;
  }

  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
