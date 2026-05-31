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

    /* Lightweight LOCAL check — synchronous, no network call, no AI.
       Only fires on the hardcoded slur blacklist (extreme profanity /
       targeted insults). Used as a first pass before the AI call so
       we save round-trips on obvious cases. */
    checkLight: function (text) {
      if (isBlacklisted(text || '')) {
        return { allowed: false, reason: 'profanity', label: 'Strong profanity or slur' };
      }
      return { allowed: true };
    },

    /* Letter-specific check — designed for quiet-letters where the
       bar is intentionally low. We call the AI moderate function but
       only HARD-BLOCK when the category is something a recipient
       cannot reply to or defend themselves from (they can only read).
       Categories ALLOWED through (the AI may still flag them):
         · plain profanity        (блять / fuck / shit)
         · emotional intensity    (anger, grief, longing)
         · soft sexual references
         · spam / link
       Categories BLOCKED:
         · targeted_insult        (ты тупое уебище)
         · harassment / hate      (slurs aimed at someone)
         · threat / violence
         · self-harm encouragement to another person
         · doxxing / personal info
         · sexual_minors / illegal — never. */
    checkLetter: async function (text) {
      // No local profanity pre-check here — letters intentionally
      // allow venting / cursing ("пиздец какой ты" should post).
      // Only the AI decides, because only it can distinguish
      // "profanity as venting" from "profanity as a weapon".
      //
      // Tiny safety net for the most unambiguous targeted slurs that
      // are NEVER OK regardless of context (always personal attacks,
      // never venting). Catches signed-out users where the AI
      // doesn't run.
      //
      // IMPORTANT: JavaScript `\b` is ASCII-only — `\bуебищ\b` does
      // NOT match Cyrillic text. We use Unicode-aware boundaries via
      // `(?<![\p{L}])` lookbehind and a Cyrillic-tail match so we
      // catch all inflections (уебище, уебища, уебищу, уебищем …).
      var CYR_BLOCK = /(?<![\p{L}])(?:уебищ|уёбищ|долбо[её]б|дебилоид|имбецил)[\p{L}]*/iu;
      var LAT_BLOCK = /\b(?:faggot|nigger|nigga|retard|kike|chink|gook|tranny|dyke)s?\b/i;
      var t = text || '';
      if (CYR_BLOCK.test(t) || LAT_BLOCK.test(t)) {
        return { allowed: false, reason: 'targeted_insult', label: 'Direct personal attack' };
      }

      // Network call to AI. If signed-out OR network fails, it
      // fails open via check() (same as everywhere else).
      var raw = await this.check(text, 'post');
      if (!raw || raw.allowed !== false) return { allowed: true };

      // 3. We have an AI block decision. Translate the reason into
      //    "is this severe enough to refuse the letter".
      var reason = String(raw.reason || '').toLowerCase();
      var label  = raw.label  || 'flagged';

      // Categories we ALWAYS allow through for letters (profanity is
      // OK in a letter to mom, anger is OK, sexual chat is just
      // embarrassing not harmful since no one can reply).
      var ALWAYS_ALLOW = [
        'profanity',
        'mild',
        'mild_profanity',
        'soft',
        'sexual',
        'sexual_general',
        'spam',
        'link',
        'links',
        'low_quality',
        'off_topic',
      ];
      if (ALWAYS_ALLOW.some(function (k) { return reason.indexOf(k) !== -1; })) {
        return { allowed: true };
      }

      // ── Loving-context allow ────────────────────────────────
      // Letters often contain hyperbole between intimates
      // ("я тебя убью"/"i could kill you" jokingly). AI can't tell
      // banter from a real threat. If the message contains clear
      // signals of love / longing / apology, treat threat/violence
      // categories as banter and let them through. The recipient
      // can never reply on this platform — harm vector is small.
      var LOVING_CONTEXT = /(\bлюбл|\bобожа|\bсосе|скучаю|скуча|целую|целова|обнима|жду тебя|мил[аы]й|милая|любимы|любима|родн[аы]я|родной|солныш|солнце моё|маленьк[аыо]|зайк|котёнок|baby|babe|honey|sweetheart|darling|love you|miss you|i love|i miss|love ya|i'?d die for|sorry|forgive me|прости меня|извини|жалко|жаль)/i;
      var SOFT_THREAT_REASONS = ['threat', 'violence', 'self_harm', 'self-harm'];
      var isSoftThreat = SOFT_THREAT_REASONS.some(function (k) {
        return reason.indexOf(k) !== -1;
      });
      if (isSoftThreat && LOVING_CONTEXT.test(text || '')) {
        return { allowed: true };
      }

      // Everything else (targeted_insult, harassment, hate, hard
      // threat with no love context, doxx, sexual_minors, illegal, …)
      // → block.
      return {
        allowed: false,
        reason:  reason || 'flagged',
        label:   label,
      };
    },

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
      /* Previous behaviour skipped moderation entirely for anonymous
         users — that meant anyone posting a comment without an account
         could write anything bad. Now we ALWAYS call the edge function,
         using the publishable (anon) key as Bearer when no user JWT is
         present. The edge function decides whether to moderate or
         fail-open — but at least the request is made. */

      try {
        var body = { content: content, contentType: contentType };
        if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
          body.mediaUrls = mediaUrls;
        }
        if (typeof postAuthorId === 'string' && postAuthorId) {
          body.postAuthorId = postAuthorId;
        }

        var bearer = jwt || window.SH_SUPABASE_KEY || '';
        var res = await fetch(FUNCTION_URL, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        window.SH_SUPABASE_KEY || '',
            'Authorization': 'Bearer ' + bearer,
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
      var mt = function (k, fb) { return (window.SH_I18N && window.SH_I18N.t(k)) || fb; };

      var label = result.label || mt('mod.label.violation', 'Community guidelines violation');
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
        var timeStr;
        if (diff >= 24) {
          var days = Math.ceil(diff / 24);
          timeStr = days + ' ' + mt(days === 1 ? 'mod.time.day' : 'mod.time.days', days === 1 ? 'day' : 'days');
        } else {
          timeStr = diff + ' ' + mt(diff === 1 ? 'mod.time.hour' : 'mod.time.hours', diff === 1 ? 'hour' : 'hours');
        }
        html += '<p class="mod-ban">' + mt('mod.banned', 'Account suspended') + ' · ' + timeStr + '</p>';
      } else if (!result.banned && typeof result.blocksLeft === 'number' && result.blocksLeft > 0) {
        var n = result.blocksLeft;
        var attemptLabel = mt(n === 1 ? 'mod.attempt.one' : 'mod.attempt.many', n === 1 ? 'attempt remaining' : 'attempts remaining');
        html += '<p class="mod-warn">' + n + ' ' + attemptLabel + '</p>';
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
