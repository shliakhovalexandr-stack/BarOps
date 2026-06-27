/* ============================================================
   BarOps Service Worker
   Кешування ресурсів для офлайн-режиму
   ============================================================ */

const CACHE_NAME = 'barops-v103';

// Тільки справді статичні ресурси (CSS, маніфест)
// JS-сторінки НЕ precache — вони завантажуються при першому відкритті
// і кешуються runtime-стратегією (network-first)
const STATIC_ASSETS = [
  '/manifest.json',
  '/shared/tokens.css',
  '/shared/components.css',
  '/shared/tab-bar.css',
];

// Встановлення — кешуємо тільки CSS/маніфест (не кидаємо помилку якщо щось не завантажилось)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(
        STATIC_ASSETS.map(url =>
          fetch(url).then(res => {
            if (res.ok) cache.put(url, res);
          }).catch(() => {})
        )
      ))
      .then(() => self.skipWaiting())
  );
});

// Активація — видаляємо всі старі кеші
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;

  // API запити — завжди мережа, без кешування
  if (event.request.url.includes('/api/')) return;

  // index.html — завжди мережа (щоб нові деплої застосовувались одразу)
  if (
    event.request.url.endsWith('/') ||
    event.request.url.endsWith('/index.html') ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // JS/CSS/інші ресурси — network first, оновлюємо кеш, fallback на кеш
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          // Клонуємо СИНХРОННО, до return — інакше тіло вже спожите сторінкою
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Web Push: показ сповіщення ──
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'BarOps';
  const options = {
    body:  data.body || '',
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag:   data.tag || undefined,
    data:  { url: data.url || '/' },
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Клік по сповіщенню: відкрити/сфокусувати додаток ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if ('focus' in c) { c.focus(); if ('navigate' in c && url !== '/') c.navigate(url).catch(() => {}); return; }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
