/* Local files only. Gameplay and target words are never sent to a server. */
const CACHE = 'pyramid-static-v25';
const FILES = [
  './', './index.html', './styles.css', './engine.js', './app.js', './data/words.js',
  './manifest.webmanifest', './assets/icon.svg', './assets/icon-180.png',
  './assets/icon-192.png', './assets/icon-512.png',
  './data/global.json', './data/food.json', './data/animals.json', './data/geography.json',
  './data/body.json', './data/kids.json', './data/teens.json',
  './data/WORDNET-LICENSE.txt', './data/SOURCES.md'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new Request(file, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pyramid-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const known = FILES.some(file => new URL(file, self.registration.scope).pathname === url.pathname);
  if (!known) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL('./index.html', self.registration.scope))));
  } else {
    event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(cached => cached || fetch(event.request)));
  }
});
