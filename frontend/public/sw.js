const CACHE_NAME = 'neosync-v1';
const DYNAMIC_CACHE_NAME = 'neosync-dynamic-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pop.mp3',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-http requests (e.g., chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Exclude non-GET requests from caching
  if (event.request.method !== 'GET') {
    return;
  }

  // Check if it is an API request to cache dynamically
  const isApiRequest = url.pathname.endsWith('.php') || url.href.includes('/api/');
  const isExcluded = url.pathname.includes('login.php') || 
                     url.pathname.includes('logout.php') ||
                     url.pathname.includes('download.php') ||
                     url.pathname.includes('export_') ||
                     url.pathname.includes('version.json'); // version.json must never be cached

  if (isApiRequest) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.error('API fetch failed:', err);
        return new Response(JSON.stringify({ status: 'error', message: 'Offline connection error.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Cache-first for standard static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch((err) => {
        console.error('Fetch failed:', err);
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});

