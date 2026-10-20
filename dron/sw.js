// Oflayn ishlash uchun keshlash. Fayllar o'zgarsa, versiyani oshiring.
const CACHE = 'dron-lab-v3';
const FILES = [
  './',
  'index.html',
  'css/dron.css',
  'js/model.js',
  'js/sim.js',
  'js/content.js',
  'js/tuzilish-data.js',
  'js/darslik.js',
  'js/pidlab.js',
  'js/drone3d.js',
  'js/ovoz.js',
  'js/tuzilish.js',
  'js/app.js',
  'vendor/three.min.js',
  'manifest.webmanifest',
  'icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dron-lab-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Avval tarmoqdan, bo'lmasa keshdan (yangilanishlar darhol ko'rinadi)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
