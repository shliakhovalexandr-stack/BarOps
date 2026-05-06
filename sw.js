/* ============================================================
   BarOps Service Worker
   Кешування ресурсів для офлайн-режиму
   ============================================================ */

const CACHE_NAME = 'barops-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/shared/app.js',
  '/shared/tokens.css',
  '/shared/components.css',
  '/shared/tab-bar.css',
  '/pages/auth.js',
  '/pages/dashboard.js',
  '/pages/ocr.js',
  '/pages/inventory.js',
  '/pages/writeoff.js',
  '/pages/ordering.js',
  '/pages/recipes.js',
  '/pages/price-alert.js',
  '/pages/shift-log.js',
  '/pages/manager.js',
  '/pages/team.js',
  '/pages/profile.js',
  '/pages/excise.js',
  '/pages/debts.js',
  '/pages/analytics.js',
  '/pages/stock.js',
];

// Встановлення — кешуємо статичні файли
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Кешування статичних ресурсів');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Активація — видаляємо старий кеш
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — спочатку мережа, потім кеш
self.addEventListener('fetch', event => {
  // API запити не кешуємо
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Зберігаємо свіжу копію в кеш
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Мережа недоступна — беремо з кешу
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Для HTML сторінок повертаємо index.html
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
