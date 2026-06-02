/* ══════════════════════════════════════════════════════════════════
   notifications.js — bell icon, dropdown, realtime toasts.

   Loaded after session.js + supabase-config.js on pages that have a
   nav (.top-info). Works for any signed-in user; quietly does
   nothing for anonymous visitors.

   Wires three things:
     1. Bell icon in the nav with an unread-count badge.
     2. Click → dropdown with the last 12 notifications (mark all read).
     3. Supabase Realtime subscription → small corner toast on live
        delivery + badge bumps.

   The toast styling matches the existing site .toast (warm-dark in
   dark theme, paper in light). Self-contained CSS injected once.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Boot guard ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  /* Mobile-only: scrolling closes any open floating panel — burger
     menu, notifications bell, post kebab. Lives here (in
     notifications.js) because this file is loaded on every page
     with a navbar — putting the logic here makes it run site-wide
     without touching every page's HTML. Gated on matchMedia so
     desktop is never affected. Passive listener — never blocks
     scroll perf. */
  (function closeFloatingOnScrollMobile() {
    var mq = window.matchMedia('(max-width: 900px)');
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      if (!mq.matches) return;
      var y = window.scrollY;
      if (Math.abs(y - lastY) < 8) { lastY = y; return; }
      lastY = y;

      // Post kebab dropdowns (any page that renders posts).
      document.querySelectorAll('.post-menu-down.show').forEach(function (m) {
        m.classList.remove('show');
      });
      // Burger menu panels.
      document.querySelectorAll('.main-menu-panel.is-open').forEach(function (p) {
        p.classList.remove('is-open');
        var trg = p.closest('.main-menu-dropdown');
        var btn = trg && trg.querySelector('.main-menu-trigger');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      // Notifications panel.
      var notifP = document.getElementById('shNotifPanel');
      if (notifP && notifP.classList.contains('is-open')) {
        notifP.classList.remove('is-open');
        var bell = document.getElementById('shNotifBell');
        if (bell) bell.setAttribute('aria-expanded', 'false');
      }
      /* Tooltips on data-presence-tooltip pills (e.g. "no advice")
         open via :focus — blur on scroll so they close. */
      var fe = document.activeElement;
      if (fe && fe.hasAttribute && fe.hasAttribute('data-presence-tooltip')) {
        try { fe.blur(); } catch (_) {}
      }
    }, { passive: true });
  })();

  function init() {
    var nav = document.querySelector('.top-info .nav');
    if (!nav) return;                                  // no nav on this page
    if (document.getElementById('shNotifBell')) return;// already booted
    if (!window.supabase || !window.SH_SUPABASE_URL) return;

    injectStyles();
    var ui = buildUi(nav);
    bootSession(ui);
  }

  /* ──────────────────────────────────────────────────────────────
     A. Styles (paper / warm-dark, matches site)
     ────────────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('sh-notif-styles')) return;
    var s = document.createElement('style');
    s.id = 'sh-notif-styles';
    s.textContent = [
      /* ── Bell — calm, matches inline-icon hover behavior of nav. ──
         No round chip background, no label. Just the Phosphor bell
         at the same 24px size as nav icons, with a hover lift. */
      '.sh-notif-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;',
        'padding:8px;background:transparent;border:none;cursor:pointer;',
        'color:var(--ink-mid,#6e5f53);transition:color .2s ease,transform .3s ease;}',
      /* Calm hover: same gentle lift as .nav-link:hover, plus a
         small tilt on the glyph — no ringing/jingling, intentionally
         quiet so a notifications icon never reads as anxious. */
      '.sh-notif-bell:hover{color:var(--ink,#1a1410);transform:translateY(-1px);}',
      '.sh-notif-bell svg{width:24px;height:24px;display:block;color:inherit;',
        'transition:transform .3s ease;transform-origin:50% 30%;}',
      '.sh-notif-bell:hover svg{transform:rotate(-6deg);}',
      '.sh-notif-bell .sh-notif-badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;',
        'padding:0 4px;border-radius:999px;background:var(--accent-2,#d6533c);color:#fff;font-size:9.5px;',
        'font-weight:700;display:inline-flex;align-items:center;justify-content:center;line-height:1;',
        'box-shadow:0 0 0 2px var(--paper,#f4ead6);font-family:"Ubuntu",sans-serif;pointer-events:none;}',
      '.sh-notif-bell .sh-notif-badge:empty,.sh-notif-bell .sh-notif-badge.is-zero{display:none;}',
      'html[data-theme="dark"] .sh-notif-bell{color:rgba(244,234,214,.65);}',
      'html[data-theme="dark"] .sh-notif-bell:hover{color:#f4ead6;}',
      'html[data-theme="dark"] .sh-notif-bell .sh-notif-badge{box-shadow:0 0 0 2px #1a1410;}',

      /* ── Dropdown ─────────────────────────────────────────────── */
      '.sh-notif-panel{position:absolute;top:calc(100% + 8px);right:0;min-width:340px;max-width:380px;',
        'max-height:480px;overflow-y:auto;background:var(--paper-soft,#fffaf0);color:var(--ink,#1a1410);',
        'border:1px solid var(--line,rgba(26,20,16,.14));border-radius:12px;',
        'box-shadow:0 20px 56px -20px rgba(26,20,16,.40);font-family:"Ubuntu",sans-serif;',
        'opacity:0;visibility:hidden;transform:translateY(-6px);',
        'transition:opacity .2s ease,visibility .2s ease,transform .2s ease;z-index:9500;}',
      '.sh-notif-panel.is-open{opacity:1;visibility:visible;transform:translateY(0);}',
      '.sh-notif-wrap{position:relative;display:inline-block;}',

      '.sh-notif-head{display:flex;align-items:center;justify-content:space-between;gap:8px;',
        'padding:13px 16px 9px;border-bottom:1px solid var(--line-soft,rgba(26,20,16,.08));}',
      /* "notifications" — Caveat, same vocabulary as widget-titles
         (.widget.support .widget-title is Caveat 22px). Soft brand
         accent without the heavy tape / tilt feel of the toast. */
      '.sh-notif-head h3{margin:0;font-family:"Caveat",cursive;font-size:22px;font-weight:600;',
        'color:var(--ink,#1a1410);line-height:1;}',
      '.sh-notif-clear{background:transparent;border:none;color:var(--ink-light,#8a7a6e);font-family:inherit;',
        'font-size:12px;cursor:pointer;padding:4px 6px;border-radius:4px;transition:color .2s ease;}',
      '.sh-notif-clear:hover{color:var(--accent-2,#d6533c);}',

      '.sh-notif-list{list-style:none;margin:0;padding:4px 0;}',
      '.sh-notif-item{display:flex;align-items:flex-start;gap:10px;padding:11px 16px;text-decoration:none;',
        'color:inherit;border-left:2px solid transparent;transition:background .15s ease;}',
      '.sh-notif-item:hover{background:rgba(26,20,16,.035);}',
      /* Subtle salmon dot at the start to mark unread, + very faint bg. */
      '.sh-notif-item.is-unread{border-left-color:var(--accent-2,#d6533c);background:rgba(214,83,60,.025);}',
      '.sh-notif-icon{flex-shrink:0;width:26px;height:26px;border-radius:50%;background:rgba(214,83,60,.10);',
        'color:var(--accent-2,#d6533c);display:inline-flex;align-items:center;justify-content:center;}',
      '.sh-notif-icon svg{width:13px;height:13px;}',
      'html[data-theme="dark"] .sh-notif-item:hover{background:rgba(244,234,214,.04);}',
      'html[data-theme="dark"] .sh-notif-item.is-unread{background:rgba(214,83,60,.08);}',
      '.sh-notif-body{flex:1;min-width:0;}',
      '.sh-notif-text{margin:0;font-size:13px;line-height:1.45;color:var(--ink-mid,#6e5f53);}',
      /* Caveat accent for the actor name — same family as the dropdown
         header, just smaller. Keeps the brand voice without screaming. */
      '.sh-notif-text .sh-notif-who{font-family:"Caveat",cursive;font-weight:600;font-size:18px;',
        'color:var(--ink,#1a1410);line-height:1;letter-spacing:.005em;margin-right:2px;}',
      'html[data-theme="dark"] .sh-notif-text{color:rgba(244,234,214,.75);}',
      'html[data-theme="dark"] .sh-notif-text .sh-notif-who{color:#f4ead6;}',
      '.sh-notif-preview{margin:3px 0 0;font-size:12px;line-height:1.4;color:var(--ink-mid,#6e5f53);',
        'overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}',
      '.sh-notif-time{margin:3px 0 0;font-size:11px;color:var(--ink-light,#8a7a6e);}',

      '.sh-notif-empty{padding:32px 16px 28px;text-align:center;color:var(--ink-light,#8a7a6e);',
        'font-size:13px;line-height:1.55;}',
      '.sh-notif-empty em{font-family:"Caveat",cursive;font-style:normal;font-size:20px;font-weight:600;',
        'color:var(--ink-mid,#6e5f53);display:block;margin-bottom:2px;line-height:1;}',

      /* "show N more" button at the end of the collapsed list. */
      '.sh-notif-more{display:block;width:100%;padding:11px 16px;background:transparent;',
        'border:none;border-top:1px solid var(--line-soft,rgba(26,20,16,.08));',
        'color:var(--accent-2,#d6533c);font-family:inherit;font-size:12.5px;font-weight:600;',
        'cursor:pointer;text-align:center;transition:background .2s ease,color .2s ease;}',
      '.sh-notif-more:hover{background:rgba(214,83,60,.06);color:#b8462f;}',
      'html[data-theme="dark"] .sh-notif-more{border-top-color:rgba(244,234,214,.10);}',
      'html[data-theme="dark"] .sh-notif-more:hover{background:rgba(214,83,60,.15);}',

      /* Dark theme overrides */
      'html[data-theme="dark"] .sh-notif-panel{background:#26201a;border-color:rgba(244,234,214,.14);color:#f4ead6;}',
      'html[data-theme="dark"] .sh-notif-head{border-bottom-color:rgba(244,234,214,.10);}',
      'html[data-theme="dark"] .sh-notif-head h3{color:#f4ead6;}',
      'html[data-theme="dark"] .sh-notif-item:hover{background:rgba(244,234,214,.05);}',
      'html[data-theme="dark"] .sh-notif-item.is-unread{background:rgba(214,83,60,.10);}',
      'html[data-theme="dark"] .sh-notif-text{color:#f4ead6;}',
      'html[data-theme="dark"] .sh-notif-preview{color:rgba(244,234,214,.65);}',
      'html[data-theme="dark"] .sh-notif-time{color:rgba(244,234,214,.45);}',
      'html[data-theme="dark"] .sh-notif-empty{color:rgba(244,234,214,.55);}',
      'html[data-theme="dark"] .sh-notif-empty em{color:rgba(244,234,214,.75);}',
      'html[data-theme="dark"] .sh-notif-clear{color:rgba(244,234,214,.55);}',

      /* ── Realtime corner toast ──────────────────────────────────
         Clean paper card. No tilt, no tape, no italics — just a calm
         neutral card with the site's colors. Top-right of viewport. */
      '.sh-notif-toast{position:fixed;top:90px;right:24px;bottom:auto;left:auto;max-width:320px;width:auto;',
        'background:var(--paper-soft,#fffaf0);color:var(--ink,#1a1410);',
        'border:1px solid var(--line,rgba(26,20,16,.14));border-radius:10px;',
        'padding:13px 16px;font-family:"Ubuntu",sans-serif;font-size:13px;line-height:1.45;',
        'box-shadow:0 14px 36px -14px rgba(26,20,16,.25),0 2px 4px rgba(26,20,16,.04);',
        'transform:translateY(-12px);opacity:0;',
        'transition:opacity .25s ease,transform .3s ease;',
        'z-index:1000;display:flex;align-items:flex-start;gap:10px;text-decoration:none;cursor:pointer;}',
      '.sh-notif-toast.is-show{opacity:1;transform:translateY(0);}',
      '.sh-notif-toast .sh-notif-toast-icon{flex-shrink:0;width:24px;height:24px;border-radius:50%;',
        'background:rgba(214,83,60,.12);color:var(--accent-2,#d6533c);display:inline-flex;',
        'align-items:center;justify-content:center;margin-top:1px;}',
      '.sh-notif-toast .sh-notif-toast-icon svg{width:13px;height:13px;}',
      '.sh-notif-toast .sh-notif-toast-body{flex:1;min-width:0;}',
      '.sh-notif-toast .sh-notif-toast-text{margin:0;color:var(--ink-mid,#6e5f53);font-size:13px;}',
      /* Caveat accent for the name — same family/role as the dropdown
         header and the widget-titles around the site. No tilt / tape. */
      '.sh-notif-toast .sh-notif-who{font-family:"Caveat",cursive;font-weight:600;font-size:20px;',
        'color:var(--ink,#1a1410);line-height:1;letter-spacing:.005em;margin-right:2px;}',
      '.sh-notif-toast .sh-notif-toast-preview{margin:4px 0 0;font-size:12.5px;color:var(--ink-mid,#6e5f53);',
        'overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}',
      /* Dark theme — warm-dark surface. */
      'html[data-theme="dark"] .sh-notif-toast{background:#26201a;border-color:rgba(244,234,214,.14);',
        'color:#f4ead6;box-shadow:0 14px 36px -14px rgba(0,0,0,.5),0 2px 4px rgba(0,0,0,.2);}',
      'html[data-theme="dark"] .sh-notif-toast .sh-notif-toast-text{color:rgba(244,234,214,.75);}',
      'html[data-theme="dark"] .sh-notif-toast .sh-notif-who{color:#f4ead6;}',
      'html[data-theme="dark"] .sh-notif-toast .sh-notif-toast-preview{color:rgba(244,234,214,.65);}',

      /* Mobile — keep it small, top of viewport */
      '@media (max-width:520px){',
        '.sh-notif-panel{position:fixed;top:auto;right:8px;left:8px;min-width:0;max-width:none;}',
        '.sh-notif-toast{right:12px;left:12px;top:72px;bottom:auto;max-width:none;}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ──────────────────────────────────────────────────────────────
     B. UI scaffolding
     ────────────────────────────────────────────────────────────── */
  function buildUi(nav) {
    var wrap = document.createElement('div');
    wrap.className = 'sh-notif-wrap';
    /* Bell stays hidden until bootSession() confirms an authed user.
       Guests should never see a notifications icon — there's nothing
       it can do for them and it clutters the navbar. */
    wrap.style.display = 'none';
    /* Local i18n helper — falls back to the English literal when
       SH_I18N isn't ready (e.g. early boot). */
    var nt = function (k, fb) { return (window.SH_I18N && window.SH_I18N.t(k)) || fb; };

    wrap.innerHTML =
      '<button type="button" class="sh-notif-bell" id="shNotifBell" aria-label="' + nt('nt.aria', 'Notifications') + '" aria-haspopup="true" aria-expanded="false">' +
        /* Phosphor "Bell" regular weight, 24px — same family as the
           other nav icons (about / contacts / updates / profile). */
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
          '<path d="M221.8,175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"/>' +
        '</svg>' +
        '<span class="sh-notif-badge is-zero" id="shNotifBadge"></span>' +
      '</button>' +
      '<div class="sh-notif-panel" id="shNotifPanel" role="menu" aria-labelledby="shNotifBell">' +
        '<div class="sh-notif-head">' +
          '<h3>' + nt('nt.title', 'notifications') + '</h3>' +
          '<button type="button" class="sh-notif-clear" id="shNotifClear">' + nt('nt.clear', 'mark all read') + '</button>' +
        '</div>' +
        '<ul class="sh-notif-list" id="shNotifList">' +
          '<li class="sh-notif-empty"><em>' + nt('nt.empty.tag', 'nothing new') + '</em>' + nt('nt.empty.text', 'quiet for now.') + '</li>' +
        '</ul>' +
      '</div>';

    // Insert as the LAST child before the dropdown menu trigger, so
    // it sits next to the profile / menu icons.
    var menu = nav.querySelector('.main-menu-dropdown');
    if (menu) nav.insertBefore(wrap, menu);
    else      nav.appendChild(wrap);

    var ui = {
      wrap:    wrap,
      bell:    wrap.querySelector('#shNotifBell'),
      panel:   wrap.querySelector('#shNotifPanel'),
      badge:   wrap.querySelector('#shNotifBadge'),
      list:    wrap.querySelector('#shNotifList'),
      clearBtn:wrap.querySelector('#shNotifClear'),
    };

    ui.bell.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !ui.panel.classList.contains('is-open');
      /* Opening the notifications dropdown closes any open burger
         menu, and vice versa (the burger handler itself closes us).
         We close menus directly here instead of relying on
         SH_closeAllMenus, so this works on every page regardless of
         whether nav-menu.js has been loaded. */
      if (willOpen) {
        document.querySelectorAll('.main-menu-panel.is-open').forEach(function (p) {
          p.classList.remove('is-open');
          var wrap2 = p.closest('.main-menu-dropdown');
          var b = wrap2 && wrap2.querySelector('.main-menu-trigger');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
      }
      ui.panel.classList.toggle('is-open', willOpen);
      ui.bell.setAttribute('aria-expanded', String(willOpen));
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && ui.panel.classList.contains('is-open')) {
        ui.panel.classList.remove('is-open');
        ui.bell.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ui.panel.classList.contains('is-open')) {
        ui.panel.classList.remove('is-open');
        ui.bell.setAttribute('aria-expanded', 'false');
      }
    });
    /* Capture-phase listener: ANY burger-trigger click closes the
       notifications panel before the burger's own handler opens its
       menu — gives us mutual exclusion without having to touch the
       inline burger code on every page. */
    document.addEventListener('click', function (e) {
      var trig = e.target.closest && e.target.closest('.main-menu-trigger');
      if (trig && ui.panel.classList.contains('is-open')) {
        ui.panel.classList.remove('is-open');
        ui.bell.setAttribute('aria-expanded', 'false');
      }
    }, true);
    return ui;
  }

  /* ──────────────────────────────────────────────────────────────
     C. Session boot + Supabase wiring
     ────────────────────────────────────────────────────────────── */
  function bootSession(ui) {
    // Re-use the single client kept in window._sbClient (used by
    // session.js / ai-chat.js); create one if it isn't there yet.
    if (!window._sbClient) {
      window._sbClient = window.supabase.createClient(
        window.SH_SUPABASE_URL, window.SH_SUPABASE_KEY
      );
    }
    var sb = window._sbClient;

    sb.auth.getSession().then(function (s) {
      var user = s && s.data && s.data.session && s.data.session.user;
      if (!user) { ui.wrap.style.display = 'none'; return; }
      /* Authed → reveal bell (it was hidden in buildUi to keep
         guests from briefly seeing it flash). */
      ui.wrap.style.display = '';
      ui.userId = user.id;

      // Initial load + realtime subscription.
      loadRecent(sb, ui);
      wireClearBtn(sb, ui);
      subscribeRealtime(sb, ui);
    });
  }

  /* How many to show in the collapsed dropdown.
     Anything past this lives behind a "show N more" button. */
  var PREVIEW_LIMIT = 3;
  var MAX_FETCH     = 30;

  function loadRecent(sb, ui) {
    /* ONLY unread — once you read a row it disappears from the
       dropdown (user request). Read rows still live in DB so future
       analytics can use them. */
    sb.from('notifications')
      .select('id, actor_id, type, target_post_id, target_comment_id, preview, created_at, read_at')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(MAX_FETCH)
      .then(function (res) {
        if (res.error) {
          console.warn('[notifications] load error:', res.error.message);
          return;
        }
        ui.cache = res.data || [];
        ui.expanded = false;

        /* Resolve actor names via a single batched profiles lookup,
           then re-render. Initial render uses "someone" placeholder
           so the dropdown isn't empty while the name fetch is in
           flight. */
        renderList(ui);
        updateBadge(ui, ui.cache.length);
        var ids = uniqueActorIds(ui.cache);
        if (ids.length) {
          fetchActorNames(sb, ids).then(function (map) {
            ui.actorNames = Object.assign(ui.actorNames || {}, map);
            renderList(ui);
          });
        }
      });
  }

  /* Fetch display names for a batch of actor_ids. Returns a promise
     resolving to { uuid → "display name" }. Anonymous commenters
     (actor_id NULL) are skipped — we display "someone" for them. */
  function fetchActorNames(sb, actorIds) {
    return sb.from('profiles')
      .select('id, username, display_name')
      .in('id', actorIds)
      .then(function (res) {
        var map = {};
        (res.data || []).forEach(function (p) {
          map[p.id] = (p.display_name && p.display_name.trim()) || p.username || '';
        });
        return map;
      });
  }
  function uniqueActorIds(rows) {
    var set = {};
    (rows || []).forEach(function (n) { if (n.actor_id) set[n.actor_id] = true; });
    return Object.keys(set);
  }

  function unread(n) { return !n.read_at; }

  /* Strip HTML tags + decode common entities so previews read as plain
     text on the client side too (defensive: legacy rows + anything the
     trigger didn't catch). */
  function stripHtml(s) {
    if (!s) return '';
    return String(s)
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wireClearBtn(sb, ui) {
    ui.clearBtn.addEventListener('click', function () {
      sb.rpc('mark_notifications_read').then(function () {
        /* Once marked read, the user wants them GONE from the
           dropdown — not just dimmed. They stay in the DB for
           analytics but disappear from the UI immediately. */
        ui.cache = [];
        ui.expanded = false;
        renderList(ui);
        updateBadge(ui, 0);
      });
    });
  }

  function subscribeRealtime(sb, ui) {
    /* Realtime delivery respects RLS — so we MUST pass the user's
       access token to the realtime socket. Without this, the broker
       sees an anon connection, RLS rejects, and your own row never
       reaches you even though it exists in the DB. The JS client
       sometimes auto-syncs auth + realtime, but explicitly setting
       it here is the one move that always works. */
    sb.auth.getSession().then(function (s) {
      var jwt = s && s.data && s.data.session && s.data.session.access_token;
      if (jwt && sb.realtime && typeof sb.realtime.setAuth === 'function') {
        try { sb.realtime.setAuth(jwt); } catch (_) {}
      }

      var ch = sb.channel('notifications:' + ui.userId);
      ch.on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: 'user_id=eq.' + ui.userId,
      }, function (payload) {
        var n = payload && payload.new;
        if (!n) return;
        /* Push into the cache + re-render so collapse / "show more"
           logic applies. Newest first. */
        ui.cache = ui.cache || [];
        ui.cache.unshift(n);
        if (ui.cache.length > MAX_FETCH) ui.cache.length = MAX_FETCH;
        renderList(ui);
        updateBadge(ui, ui.cache.length);

        // Corner toast (only if the panel isn't already open).
        if (!ui.panel.classList.contains('is-open')) showToast(n, ui);

        /* Resolve actor name in the background, then re-render so
           "someone" turns into their handle once the lookup lands. */
        if (n.actor_id && !(ui.actorNames && ui.actorNames[n.actor_id])) {
          fetchActorNames(sb, [n.actor_id]).then(function (map) {
            ui.actorNames = Object.assign(ui.actorNames || {}, map);
            renderList(ui);
            // also patch the open toast if it's still on screen
            var openToast = document.querySelector('.sh-notif-toast .sh-notif-who');
            if (openToast && map[n.actor_id]) openToast.textContent = map[n.actor_id];
          });
        }
      }).subscribe(function (status, err) {
        if (err) console.warn('[notifications] subscribe error:', err);
        else     console.debug('[notifications] subscribe status:', status);
      });

      // Keep realtime auth fresh when the user's session refreshes.
      sb.auth.onAuthStateChange(function (_event, session) {
        if (session && session.access_token && sb.realtime && sb.realtime.setAuth) {
          try { sb.realtime.setAuth(session.access_token); } catch (_) {}
        }
      });
    });
  }

  /* ──────────────────────────────────────────────────────────────
     D. Rendering
     ────────────────────────────────────────────────────────────── */
  function nt(k, fb) { return (window.SH_I18N && window.SH_I18N.t(k)) || fb; }

  function copyForType(type) {
    if (type === 'reply_to_comment') return nt('nt.type.reply',    'replied to your comment');
    return nt('nt.type.respond', 'responded to your story');
  }

  /* Returns the friendly name to show (display_name or username),
     falling back to "someone" for anonymous commenters or while the
     name fetch is in flight. */
  function actorLabel(ui, n) {
    if (n && n._actor_name) return n._actor_name;
    if (ui && ui.actorNames && n && n.actor_id && ui.actorNames[n.actor_id]) {
      return ui.actorNames[n.actor_id];
    }
    return nt('nt.actor.someone', 'someone');
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)    return nt('nt.time.now', 'just now');
    if (diff < 3600)  return Math.floor(diff / 60)   + nt('nt.time.m', ' min ago');
    if (diff < 86400) return Math.floor(diff / 3600) + nt('nt.time.h', 'h ago');
    return Math.floor(diff / 86400) + nt('nt.time.d', 'd ago');
  }

  /* Build a relative link to the post (works from any page).
     Lives at /post?id=… ; if currently inside /nav-bar/* we add a
     '../'; inside /docs/html/* we add '../../'. */
  function postUrl(postId, commentId) {
    var p = window.location.pathname || '';
    var prefix = '';
    if (/\/docs\/html\//.test(p)) prefix = '../../';
    else if (/\/nav-bar\//.test(p)) prefix = '../';
    var hash = commentId ? '#comment-' + commentId : '#comments';
    return prefix + 'post?id=' + encodeURIComponent(postId) + hash;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderItem(n, ui) {
    var li = document.createElement('a');
    li.className = 'sh-notif-item' + (n.read_at ? '' : ' is-unread');
    li.href = postUrl(n.target_post_id, n.target_comment_id);
    /* Strip HTML again on render — defensive for legacy DB rows. */
    var cleanPreview = stripHtml(n.preview);
    var who = actorLabel(ui, n);
    li.innerHTML =
      '<span class="sh-notif-icon" aria-hidden="true">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">' +
          '<path d="M232,64V192a16,16,0,0,1-16,16H83l-32.6,28.16-.09.07A15.89,15.89,0,0,1,40,240a16.13,16.13,0,0,1-6.8-1.52A15.85,15.85,0,0,1,24,224V64A16,16,0,0,1,40,48H216A16,16,0,0,1,232,64Z"/></svg>' +
      '</span>' +
      '<div class="sh-notif-body">' +
        '<p class="sh-notif-text"><strong class="sh-notif-who">' + esc(who) + '</strong> ' + esc(copyForType(n.type)) + '</p>' +
        (cleanPreview ? '<p class="sh-notif-preview">' + esc(cleanPreview) + '</p>' : '') +
        '<p class="sh-notif-time">' + esc(timeAgo(n.created_at)) + '</p>' +
      '</div>';
    return li;
  }

  /* Renders from ui.cache (= unread rows we hold in memory).
     Collapses to PREVIEW_LIMIT items, with a "show N more" button
     when there are extras. ui.expanded flips on click. */
  function renderList(ui) {
    var rows = ui.cache || [];
    if (!rows.length) {
      var emptyTag  = (window.SH_I18N && window.SH_I18N.t('nt.empty.tag'))  || 'nothing new';
      var emptyText = (window.SH_I18N && window.SH_I18N.t('nt.empty.text')) || 'quiet for now.';
      ui.list.innerHTML = '<li class="sh-notif-empty"><em>' + emptyTag + '</em>' + emptyText + '</li>';
      return;
    }
    var visible = ui.expanded ? rows : rows.slice(0, PREVIEW_LIMIT);
    ui.list.innerHTML = '';
    visible.forEach(function (n) { ui.list.appendChild(renderItem(n, ui)); });

    var hidden = rows.length - visible.length;
    if (hidden > 0) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sh-notif-more';
      /* "show N more" — use a {n} placeholder so RU/EN can put the
         number where the grammar requires (RU: "ещё N"). */
      var moreTpl = (window.SH_I18N && window.SH_I18N.t('nt.showmore')) || 'show {n} more';
      btn.textContent = moreTpl.replace('{n}', hidden);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        /* Stop the click from bubbling to document — otherwise the
           outside-click handler sees that the (re-rendered, now
           detached) target isn't inside `wrap` and closes the panel. */
        e.stopPropagation();
        ui.expanded = true;
        renderList(ui);
      });
      ui.list.appendChild(btn);
    }
  }

  function updateBadge(ui, n) {
    if (!ui.badge) return;
    if (n <= 0) {
      ui.badge.textContent = '';
      ui.badge.classList.add('is-zero');
    } else {
      ui.badge.textContent = n > 9 ? '9+' : String(n);
      ui.badge.classList.remove('is-zero');
    }
  }

  /* ──────────────────────────────────────────────────────────────
     E. Corner toast (small, never full-screen)
     ────────────────────────────────────────────────────────────── */
  function showToast(n, ui) {
    var existing = document.querySelector('.sh-notif-toast');
    if (existing) existing.remove();

    var a = document.createElement('a');
    a.className = 'sh-notif-toast';
    a.href = postUrl(n.target_post_id, n.target_comment_id);
    var cleanPreview = stripHtml(n.preview);
    var who = actorLabel(ui, n);
    a.innerHTML =
      '<span class="sh-notif-toast-icon" aria-hidden="true">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">' +
          '<path d="M232,64V192a16,16,0,0,1-16,16H83l-32.6,28.16-.09.07A15.89,15.89,0,0,1,40,240a16.13,16.13,0,0,1-6.8-1.52A15.85,15.85,0,0,1,24,224V64A16,16,0,0,1,40,48H216A16,16,0,0,1,232,64Z"/></svg>' +
      '</span>' +
      '<div class="sh-notif-toast-body">' +
        '<p class="sh-notif-toast-text"><strong class="sh-notif-who">' + esc(who) + '</strong> ' + esc(copyForType(n.type)) + '</p>' +
        (cleanPreview ? '<p class="sh-notif-toast-preview">' + esc(cleanPreview) + '</p>' : '') +
      '</div>';

    document.body.appendChild(a);
    requestAnimationFrame(function () { a.classList.add('is-show'); });
    setTimeout(function () {
      a.classList.remove('is-show');
      setTimeout(function () { if (a.parentNode) a.remove(); }, 400);
    }, 5200);
  }
})();
