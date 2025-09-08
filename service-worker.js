// service-worker.js

const APP_SHELL_CACHE_NAME = 'apples-mart-shell-v1';
const DATA_CACHE_NAME = 'apples-mart-data-v1';

// الملفات الأساسية للتطبيق التي لا تتغير كثيرًا
const urlsToCache = [
  '/',
  '/index.html',
  // سيتم تخزين الموارد الخارجية (الخطوط، الأيقونات) ديناميكيًا عند أول طلب
];

// 1. تثبيت Service Worker وتخزين واجهة التطبيق
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE_NAME).then(cache => {
      console.log('Caching app shell');
      // skipWaiting() يجبر الـ service worker الجديد على التفعيل فورًا
      self.skipWaiting(); 
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. تفعيل Service Worker وتنظيف الكاش القديم
self.addEventListener('activate', event => {
  const cacheWhitelist = [APP_SHELL_CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // clients.claim() يضمن أن الـ service worker الحالي يتحكم في الصفحة فورًا
        return self.clients.claim();
    })
  );
});

// 3. اعتراض طلبات الشبكة
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // تجاهل طلبات Firebase للسماح لها بالعمل بشكل طبيعي
  if (requestUrl.hostname.includes('.firebaseio.com') || requestUrl.hostname.includes('firebaseapp.com')) {
    return;
  }

  // استراتيجية "Stale-While-Revalidate" لملف products.json
  // هذه الاستراتيجية تقدم الملف من الكاش فورًا (للسرعة)، ثم تطلب تحديثًا من الشبكة في الخلفية.
  // هذا يضمن أن التطبيق يفتح بسرعة دائمًا، وفي نفس الوقت يحصل على أحدث البيانات عند توفر اتصال بالإنترنت.
  // هذه الطريقة أفضل من وضع حد زمني (3 أيام) لأنها تضمن استمرارية عمل التطبيق حتى لو انقطع الاتصال لأكثر من 3 أيام.
  if (requestUrl.pathname.endsWith('products.json')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          // طلب تحديث من الشبكة في الخلفية
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // إذا نجح الطلب، قم بتحديث الكاش بالنسخة الجديدة
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
              console.error('Fetch failed for products.json:', err);
          });

          // إرجاع النسخة المخزنة فورًا إذا كانت موجودة، وإلا انتظر نتيجة الطلب من الشبكة
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else {
    // استراتيجية "Cache First" لباقي الطلبات (واجهة التطبيق، الخطوط، الأيقونات)
    // هذا مناسب للملفات التي لا تتغير كثيرًا.
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // إذا وجد في الكاش، أرجعه، وإلا اطلبه من الشبكة
        return cachedResponse || fetch(event.request).then(networkResponse => {
          // قم بتخزين الموارد الجديدة في الكاش لاستخدامها لاحقًا
          return caches.open(APP_SHELL_CACHE_NAME).then(cache => {
            if (networkResponse.ok) {
                 cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  }
});

