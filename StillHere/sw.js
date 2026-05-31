/* ═══════════════════════════════════════════════════════════════════
   sw.js — StillHere service worker.

   Conservative strategy:
     • App shell (CSS/JS/fonts/icons) — cache-first with background
       revalidation. Lets the site boot offline-ish and very fast.
     • HTML pages — network-first with a cache fallback, so users
       always see fresh content when online but a stale page when
       the network drops.
     • Supabase / analytics calls — bypass the SW completely (we never
       want to serve stale data, and Supabase auth requires fresh
       requests).
     • Offline navigation fallback — /offline.html (re-uses /404.html
       look-and-feel if /offline.html isn't there).

   No precache list: we let the cache fill organically from real
   traffic. That way adding a new page never requires bumping a
   manifest — only the CACHE_VERSION constant invalidates everything.
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'sh-v1';
const SHELL_CACHE   = CACHE_VERSION + '-shell';
const PAGES_CACHE   = CACHE_VERSION + '-pages';

const OFFLINE_URL = '/offline.html';

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(PAGES_CACHE)
      .then(function (cache) {
        /* Pre-cache the offline fallback so we have something to
           show when both network and page-cache miss. */
        return cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))
          .catch(function () { /* offline.html may not exist — fine */ });
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        // Drop every cache from older versions.
        if (k.indexOf(CACHE_VERSION) !== 0) return caches.delete(k);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Hosts whose responses must NEVER hit our cache. */
const BYPASS_HOSTS = [
  'supabase.co',
  'supabase.in',
  'vercel-insights.com',
  'vercel-scripts.com',
  '_vercel'      // /_vercel/insights, /_vercel/speed-insights
];

function shouldBypass(url) {
  for (var i = 0; i < BYPASS_HOSTS.length; i++) {
    if (url.host.indexOf(BYPASS_HOSTS[i]) !== -1) return true;
    if (url.pathname.indexOf(BYPASS_HOSTS[i]) !== -1) return true;
  }
  return false;
}

function isShellAsset(url) {
  // Same-origin CSS / JS / fonts / images / icons.
  if (url.origin !== self.location.origin) return false;
  return /\.(?:css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|gif|ico)$/i.test(url.pathname);
}

function isHtmlNav(req, url) {
  if (req.mode === 'navigate') return true;
  if (req.destination === 'document') return true;
  if (url.origin === self.location.origin && /\.html?$/i.test(url.pathname)) return true;
  return false;
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);

  /* 1. Bypass third-party / API / analytics. */
  if (shouldBypass(url)) return;

  /* 2. HTML navigation → network-first with cache fallback. */
  if (isHtmlNav(req, url)) {
    event.respondWith(
      fetch(req).then(function (res) {
        // Store a copy for offline use.
        var copy = res.clone();
        caches.open(PAGES_CACHE).then(function (c) {
          c.put(req, copy);
        }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match(req).then(function (cached) {
          if (cached) return cached;
          return caches.match(OFFLINE_URL);
        });
      })
    );
    return;
  }

  /* 3. Shell assets → cache-first with background revalidation. */
  if (isShellAsset(url)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var network = fetch(req).then(function (res) {
            // Only cache successful, basic / cors responses.
            if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
              cache.put(req, res.clone()).catch(function () {});
            }
            return res;
          }).catch(function () { return cached; });
          return cached || network;
        });
      })
    );
    return;
  }

  /* 4. Everything else → just pass through. */
});

/* Allow the page to ask us to skip-waiting (useful for "update now"
   flows we may add later). */
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
