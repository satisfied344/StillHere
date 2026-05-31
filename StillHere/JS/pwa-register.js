/* ═══════════════════════════════════════════════════════════════════
   pwa-register.js — register the service worker.

   Loaded on every page that opts into PWA behavior. Defers
   registration until after `load` so it never blocks first paint
   or steals bandwidth from the initial render. Silent on every
   error path — a broken SW must never break the page.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  /* Skip on localhost dev unless explicitly enabled — service workers
     during development cause stale-asset confusion that's hard to
     debug. Production (anything that isn't 127.0.0.1 / localhost) gets
     the SW. */
  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  if (isLocal && !/[?&]sw=1\b/.test(location.search)) return;

  /* Skip on the file:// protocol (Service Workers require HTTPS or
     localhost — same scheme they're served from). */
  if (location.protocol !== 'https:' && location.protocol !== 'http:') return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function (reg) {
        /* When a new SW takes control mid-session, reload once so
           the user gets the updated shell on the next click —
           never auto-reload while they're typing. Guarded so the
           reload happens at most once per page lifetime. */
        var reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          if (reloaded) return;
          reloaded = true;
          /* Only reload if the page is idle (no focused input). */
          var ae = document.activeElement;
          var typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
          if (!typing) location.reload();
        });
      })
      .catch(function () { /* silent — SW is best-effort */ });
  });
})();
