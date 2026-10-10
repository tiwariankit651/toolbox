/* Bumping CACHE is what actually ships a new common.js or style.css to people
   who have already visited. The previous version cached both of those
   cache-first and never revalidated, so a visitor from before the shared
   storage helpers were added kept getting the old common.js forever and every
   tool threw "storeGet is not defined". Keep this name in step with any change
   to the files in PRECACHE. */
const CACHE = 'fth-v4';
const PRECACHE = ['/', '/css/style.css', '/js/common.js'];

/* Our own JS and CSS must never be served from cache without checking the
   network first, otherwise a stale copy outlives any deploy. Third-party and
   immutable assets stay cache-first, which is where the offline win is. */
const ALWAYS_REVALIDATE = /\/(js|css)\/|\.(js|css)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      /* Take over open tabs immediately so a stale worker cannot keep serving
         the old bundle for the rest of the session. */
      .then(() => self.clients.claim())
  );
});

/* Let the page ask the waiting worker to activate at once. */
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isHTML = e.request.headers.get('accept')?.includes('text/html')
              || url.pathname.endsWith('/')
              || url.pathname.endsWith('.html');

  const sameOrigin = url.origin === self.location.origin;
  const isOwnCode = sameOrigin && ALWAYS_REVALIDATE.test(url.pathname);

  if (isHTML || isOwnCode) {
    /* Network-first: always try the live copy, fall back to cache only when
       genuinely offline. This keeps the offline promise while making sure a
       deploy actually reaches returning visitors. */
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    /* Cache-first for everything else, refreshing the entry in the background
       so a cached asset cannot go stale indefinitely either. */
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
        return cached || network;
      })
    );
  }
});
