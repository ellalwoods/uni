// Network-first service worker: works offline, and always picks up new content when online.
// Bump CACHE and keep ASSETS in step with index.html whenever a file is added.
const CACHE = 'uni-v7';
const ASSETS = ['./', 'index.html', 'styles.css', 'uni.js', 'content/courses.js', 'content/ica.js', 'content/corporate.js', 'content/ailaw.js', 'cloud-config.js', 'app.js', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(a => new Request(a, { cache: 'reload' }))))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});
