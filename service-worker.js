// service-worker.js

const CACHE_NAME = 'apples-mart-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // ملاحظة: بما أن الأنماط والجافاسكريبت مدمجة، فلا حاجة لإضافتها هنا.
  // إذا قمت بفصلها في ملفات خارجية، يجب إضافتها هنا.
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700&display=swap',
  'https://raw.githubusercontent.com/Apples-Mart/store/main/products.json'
];

// 1. تثبيت Service Worker وتخزين الموارد الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // استخدام addAll يضمن أن جميع الموارد تم تخزينها بنجاح
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. تفعيل Service Worker وتنظيف الكاش القديم
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // حذف أي كاش لا يتطابق مع CACHE_NAME الحالي
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. اعتراض طلبات الشبكة وتقديم الرد من الكاش (Cache First)
self.addEventListener('fetch', event => {
  // لا تقم بتخزين طلبات Firebase Realtime Database
  if (event.request.url.includes('.firebaseio.com')) {
    return;
  }
  
  // لا تقم بتخزين طلبات المصادقة
  if (event.request.url.includes('firebaseapp.com')) {
     return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إذا كان الطلب موجودًا في الكاش، قم بإرجاعه
        if (response) {
          return response;
        }

        // إذا لم يكن موجودًا، قم بجلبه من الشبكة
        return fetch(event.request).then(
          networkResponse => {
            // التأكد من أن الرد صالح
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !networkResponse.type.endsWith('cors')) {
              return networkResponse;
            }

            // استنساخ الرد لأن الرد هو stream ويمكن استهلاكه مرة واحدة فقط
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // تخزين الرد الجديد في الكاش للمستقبل
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      }).catch(() => {
        // يمكنك هنا إرجاع صفحة "أنت غير متصل" احتياطية إذا فشل كل شيء
        // return caches.match('/offline.html');
      })
  );
});
