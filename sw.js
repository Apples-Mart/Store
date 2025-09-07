const CACHE_NAME = 'apples-mart-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './p.json', // مهم لتخزين ملف الأصناف الأساسي
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/html5-qrcode',
  'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js',
  'icons/icon-192x192.png', // أيقونة أساسية للعرض
  'icons/icon-512x512.png'
];

// 1. تثبيت الـ Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. تفعيل الـ Service Worker وحذف أي بيانات قديمة
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. اعتراض طلبات الشبكة وتقديم الملفات من الذاكرة المؤقتة أولاً
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إذا وجدنا الملف في الذاكرة المؤقتة، نعيده مباشرة
        if (response) {
          return response;
        }
        // إذا لم نجده، نطلبه من الشبكة
        return fetch(event.request);
      }
    )
  );
});
