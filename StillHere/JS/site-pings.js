/* ───────────────────────────────────────────────────────────────
   site-pings.js
   Calls the `site_ping` RPC once on page load, then keeps pinging
   every 30 seconds while the tab is visible. The server stores
   ONLY a timestamp — no IP, no fingerprint, no path — so this is
   a privacy-neutral way to power "X online right now / Y total"
   without any new tracking.

   Behaviour:
   • Waits for the Supabase JS lib to be present.
   • Pings on initial load.
   • Pings every 30s — but ONLY while document.visibilityState
     is "visible", so background tabs don't inflate "online" counts.
   • Skips when offline / network errors silently.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* Wait until both Supabase JS and the project config are loaded.
     Pages load supabase-js + supabase-config.js + (often) session.js
     before this file, but on slow networks there can still be a race. */
  function whenSupabaseReady(cb) {
    if (typeof window.supabase !== 'undefined'
        && window.SH_SUPABASE_URL
        && window.SH_SUPABASE_KEY) {
      return cb();
    }
    setTimeout(function () { whenSupabaseReady(cb); }, 80);
  }

  whenSupabaseReady(function () {
    var db;
    try {
      if (window.__shSharedSupabase) {
        db = window.__shSharedSupabase;
      } else {
        db = window.supabase.createClient(window.SH_SUPABASE_URL, window.SH_SUPABASE_KEY);
      }
    } catch (_) { return; }

    /* Stable per-tab session id (lives in sessionStorage). Distinct
       across tabs but constant for one tab — so the "online" counter
       in site_stats() can COUNT DISTINCT and reflect actual unique
       sessions, not raw pings. Closing the tab forgets the id; opening
       a new one mints a fresh one. */
    var sessionId = null;
    try {
      sessionId = sessionStorage.getItem('sh_ping_sid');
      if (!sessionId) {
        sessionId = 's_' + Date.now().toString(36) + '_' +
                    Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('sh_ping_sid', sessionId);
      }
    } catch (_) {
      sessionId = 's_' + Math.random().toString(36).slice(2, 10);
    }

    function ping() {
      try { db.rpc('site_ping', { p_session: sessionId }); } catch (_) {}
    }

    /* Initial ping on load */
    ping();

    /* Keep-alive pings — every 30 seconds while tab is visible.
       This is what makes "online right now" accurate: a user with
       the tab open for 5 minutes will generate ~10 pings, so the
       "pings in last 5 minutes" count maps roughly to actual
       open-tab sessions. */
    var INTERVAL_MS = 30 * 1000;
    setInterval(function () {
      if (document.visibilityState === 'visible') ping();
    }, INTERVAL_MS);

    /* When the user returns to the tab after a long pause, ping
       once immediately so they re-enter the "online" set without
       waiting up to 30s. */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') ping();
    });
  });
})();
