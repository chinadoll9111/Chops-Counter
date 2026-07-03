const CACHE_NAME = "chops-counter-v1.4";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json"
];

// Installs the app files and any external styles into her internal memory chip
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // Clear out older broken layouts
          }
        })
      );
    })
  );
  self.clients.claim();
});

// THE CURE: If she goes offline, instantly serve her layout styles from local phone storage
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Pull directly from phone memory chip
      }
      
      return fetch(event.request).then((networkResponse) => {
        // Dynamically grab and lock any background files her phone requests
        if (event.request.method === "GET") {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch(() => {
        // Silent safety fail gracefully if completely dead zone
        return null;
      });
    })
  );
});
