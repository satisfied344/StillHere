/* ═══════════════════════════════════════════════════════════════
   moderation.js — frontend helper for AI content moderation
   Calls the Supabase Edge Function "moderate" before any submit.

   Usage:
     window.SH_MOD.check(content, contentType)
       → Promise<{ allowed: boolean, ... }>

   contentType: 'post' | 'comment' | 'reply' | 'username'
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var FUNCTION_URL = window.SH_SUPABASE_URL + '/functions/v1/moderate';

  /* ── Hardcoded slur blacklist (names/usernames only) ─────
     Two layers:
     1. ROOTS — Russian slur roots that appear inside compound words
        (e.g. "хуе" catches хуеглот, хуесос, хуеплёт, etc.)
     2. WORDS — full slur words that must match exactly
     ─────────────────────────────────────────────────────── */

  // Root substrings — if the name contains ANY of these, block it
  var SLUR_ROOTS = [
    'хуй','хуе','хуё','хуи',   // хуеглот, хуесос, хуеплёт, etc.
    'пизд',                     // пиздец-derived compounds
    'ёбл','ёбан','ебал',        // ёбаный-derived compounds
    'пидор','пидар',            // пидорас and variants
    'педер','педик',
  ];

  // Full words — checked as substrings after stripping spaces/hyphens
  var SLUR_WORDS = [
    'шлюха','шлюшка','блядь','блядина','бляд',
    'чмо','чмошник','чмошница',
    'мразь','мразота',
    'ублюдок','ублюдина',
    'мудак','мудила','мудозвон',
    'долбоёб','долбоеб',
    'шалава','потаскуха','потаскун',
    'сука','сучка',
    'урод','уродина',
    // English
    'faggot','nigger','nigga','retard','cunt','whore','slut',
    'kike','spic','chink','gook','tranny','dyke',
  ];

  function isBlacklisted(text) {
    var lower    = text.toLowerCase();
    // Strip ALL separators/punctuation — catches "ху-е-глот", "п.и.д.о.р" etc.
    var stripped = lower.replace(/[\s\-_'.­​]/g, '');
    // 1. Root check — on BOTH versions
    if (SLUR_ROOTS.some(function (r) {
      return lower.indexOf(r) !== -1 || stripped.indexOf(r) !== -1;
    })) return true;
    // 2. Full-word check — on stripped version
    if (SLUR_WORDS.some(function (w) { return stripped.indexOf(w) !== -1; })) return true;
    return false;
  }

  /* ── Public API ──────────────────────────────────────────── */
  window.SH_MOD = {

    /* Username check — no JWT required (user not logged in yet at registration).
       Returns { allowed, reason, label } */
    checkUsername: async function (username) {
      // Fast local check first — catch obvious slurs without a network round-trip
      if (isBlacklisted(username)) {
        return { allowed: false, reason: 'targeted_insult', label: 'Direct insult or harassment' };
      }

      try {
        var res = await fetch(FUNCTION_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: username, contentType: 'username' }),
        });

        if (!res.ok) return { allowed: true };
        return await res.json();

      } catch (err) {
        console.warn('[SH_MOD] Username check failed, failing open:', err);
        return { allowed: true };
      }
    },

    /* Main check. Returns the full response object from the Edge Function.
       Always resolves (never rejects).
       Pass mediaUrls (string[]) to also moderate uploaded images.
       Pass postAuthorId (string) when checking a comment/reply so the
       backend knows there's a vulnerable post author to protect. */
    check: async function (content, contentType, mediaUrls, postAuthorId) {
      var jwt = await getJwt();
      if (!jwt) {
        // Not logged in — anonymous content, skip moderation
        return { allowed: true };
      }

      try {
        var body = { content: content, contentType: contentType };
        if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
          body.mediaUrls = mediaUrls;
        }
        if (typeof postAuthorId === 'string' && postAuthorId) {
          body.postAuthorId = postAuthorId;
        }

        var res = await fetch(FUNCTION_URL, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + jwt,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          console.warn('[SH_MOD] Edge function returned', res.status);
          // Network/HTTP error — fail open ONLY here. Real moderation
          // decisions (including service_unavailable) come back as 200
          // with allowed:false in the body.
          return { allowed: true };
        }

        return await res.json();

      } catch (err) {
        console.warn('[SH_MOD] Network error, failing open:', err);
        return { allowed: true };
      }
    },

    /* Render a block error inside a container element.
       el     — the container where the message will appear
       result — object returned by SH_MOD.check() */
    showBlock: function (el, result) {
      if (!el) return;

      var label = result.label || 'Community guidelines violation';
      var html = '<p class="mod-error">✕ ' + label + '</p>';

      if (result.retry) {
        // service_unavailable — soft, retryable error, no block counter
        el.innerHTML = html;
        el.style.display = 'block';
        return;
      }

      if (result.banned && result.bannedUntil) {
        var until = new Date(result.bannedUntil);
        var diff  = Math.ceil((until - Date.now()) / 3_600_000);
        var timeStr = diff >= 24
          ? Math.ceil(diff / 24) + (Math.ceil(diff / 24) === 1 ? ' day' : ' days')
          : diff + (diff === 1 ? ' hour' : ' hours');
        html += '<p class="mod-ban">Account suspended · ' + timeStr + '</p>';
      } else if (!result.banned && typeof result.blocksLeft === 'number' && result.blocksLeft > 0) {
        html += '<p class="mod-warn">' + result.blocksLeft + ' attempt' + (result.blocksLeft === 1 ? '' : 's') + ' remaining</p>';
      }

      el.innerHTML = html;
      el.style.display = 'block';
    },

    /* Clear the error container */
    clearError: function (el) {
      if (!el) return;
      el.innerHTML = '';
      el.style.display = 'none';
    },

    /* ── REPORTS ──────────────────────────────────────────────
       Submit a user report. Calls the submit_report RPC which
       handles uniqueness, weights, and escalation. If the new
       state is 'ai_reviewing', triggers the strict-review fn.
       Returns { ok, error?, total_weight?, new_state? }.

       Note: we reuse the *same* supabase client instance across
       calls so the user's session token is attached automatically.
       (createClient() each time loses the auth context, and would
       make every call look anonymous — bug fixed.)
       ──────────────────────────────────────────────────────── */
    report: async function (targetType, targetId, reason) {
      if (targetType !== 'post' && targetType !== 'comment') {
        return { ok: false, error: 'invalid_target' };
      }
      if (!targetId) return { ok: false, error: 'missing_id' };

      var db = getSharedClient();
      if (!db) return { ok: false, error: 'supabase_not_loaded' };

      /* Anonymous fallback fingerprint — stable per device */
      var fp = null;
      try {
        fp = localStorage.getItem('sh_anon_fp');
        if (!fp) {
          fp = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem('sh_anon_fp', fp);
        }
      } catch (_) {}

      console.log('[SH_MOD.report] calling RPC', { targetType, targetId, fp: fp ? fp.slice(0, 10) + '…' : null });

      var rpc;
      try {
        rpc = await db.rpc('submit_report', {
          p_target_type: targetType,
          p_target_id:   targetId,
          p_reason:      reason || null,
          p_fingerprint: fp
        });
      } catch (err) {
        console.error('[SH_MOD.report] RPC threw:', err);
        return { ok: false, error: 'network', detail: String(err) };
      }
      console.log('[SH_MOD.report] RPC raw:', rpc);
      if (rpc.error) {
        console.error('[SH_MOD.report] RPC error:', rpc.error);
        return { ok: false, error: rpc.error.message || 'rpc_error', code: rpc.error.code, hint: rpc.error.hint };
      }
      var data = rpc.data || {};
      if (data.ok === false) return data; // e.g. { ok:false, error:'already_reported' }

      /* Fire-and-forget kick to strict-review whenever the server
         tells us a review is warranted. Uses the supabase client's
         functions.invoke() which handles CORS + auth headers
         automatically — no manual fetch needed. */
      if (data.should_review || data.new_state === 'ai_reviewing') {
        db.functions.invoke('strict-review', {
          body: { target_type: targetType, target_id: targetId }
        }).then(function (r) {
          console.log('[strict-review] response:', r);
        }).catch(function (e) {
          console.warn('[strict-review] kick failed (cron will retry):', e);
        });
      }

      return data;
    },
  };

  /* Cache one shared client so the user's JWT is carried on every call.
     Also expose it on window so other modules (site-pings.js, etc.)
     can reuse instead of spawning a second GoTrueClient — silences the
     "Multiple GoTrueClient instances detected" warning. */
  function getSharedClient() {
    if (window.__shSharedSupabase) return window.__shSharedSupabase;
    if (!window.supabase || !window.SH_SUPABASE_URL || !window.SH_SUPABASE_KEY) return null;
    window.__shSharedSupabase = window.supabase.createClient(
      window.SH_SUPABASE_URL,
      window.SH_SUPABASE_KEY
    );
    return window.__shSharedSupabase;
  }

  /* ── Internal helpers ────────────────────────────────────── */

  async function getJwt() {
    try {
      var db = window.supabase.createClient(
        window.SH_SUPABASE_URL,
        window.SH_SUPABASE_KEY
      );
      var { data } = await db.auth.getSession();
      return data?.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  function plural(n, one, few, many) {
    var mod10  = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11)               return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

})();
