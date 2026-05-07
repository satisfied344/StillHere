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
       Always resolves (never rejects) — if the call fails, returns { allowed: true }
       so a network error never silently blocks a user.
       Pass mediaUrls (string[]) to also moderate uploaded images. */
    check: async function (content, contentType, mediaUrls) {
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

      if (result.banned && result.bannedUntil) {
        var until = new Date(result.bannedUntil);
        var diff  = Math.ceil((until - Date.now()) / 3_600_000);
        var timeStr = diff >= 24
          ? Math.ceil(diff / 24) + (Math.ceil(diff / 24) === 1 ? ' day' : ' days')
          : diff + (diff === 1 ? ' hour' : ' hours');
        html += '<p class="mod-ban">Account suspended · ' + timeStr + '</p>';
      } else if (!result.banned && result.blocksLeft > 0) {
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
  };

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
