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
      /* ── Bell ─────────────────────────────────────────────────── */
      '.sh-notif-bell{position:relative;display:inline-flex;align-items:center;justify-content:center;',
        'width:42px;height:42px;border-radius:999px;background:transparent;border:none;cursor:pointer;',
        'color:var(--ink,#1a1410);transition:background .2s ease,transform .2s ease;}',
      '.sh-notif-bell:hover{background:rgba(26,20,16,.06);}',
      '.sh-notif-bell:active{transform:scale(.94);}',
      '.sh-notif-bell svg{width:22px;height:22px;}',
      '.sh-notif-bell .sh-notif-badge{position:absolute;top:6px;right:6px;min-width:18px;height:18px;',
        'padding:0 5px;border-radius:999px;background:var(--accent-2,#d6533c);color:#fff;font-size:10.5px;',
        'font-weight:700;display:inline-flex;align-items:center;justify-content:center;',
        'box-shadow:0 0 0 2px var(--paper,#f4ead6);font-family:"Ubuntu",sans-serif;pointer-events:none;}',
      '.sh-notif-bell .sh-notif-badge:empty,.sh-notif-bell .sh-notif-badge.is-zero{display:none;}',
      'html[data-theme="dark"] .sh-notif-bell{color:#f4ead6;}',
      'html[data-theme="dark"] .sh-notif-bell:hover{background:rgba(244,234,214,.08);}',
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
        'padding:14px 16px 10px;border-bottom:1px solid var(--line-soft,rgba(26,20,16,.08));}',
      '.sh-notif-head h3{margin:0;font-family:"Caveat",cursive;font-size:22px;font-weight:600;color:var(--ink,#1a1410);}',
      '.sh-notif-clear{background:transparent;border:none;color:var(--ink-light,#8a7a6e);font-family:inherit;',
        'font-size:12px;cursor:pointer;padding:4px 6px;border-radius:4px;transition:color .2s ease;}',
      '.sh-notif-clear:hover{color:var(--accent-2,#d6533c);}',

      '.sh-notif-list{list-style:none;margin:0;padding:6px 0;}',
      '.sh-notif-item{display:flex;align-items:flex-start;gap:10px;padding:10px 16px;text-decoration:none;',
        'color:inherit;border-left:3px solid transparent;transition:background .15s ease;}',
      '.sh-notif-item:hover{background:rgba(214,83,60,.05);}',
      '.sh-notif-item.is-unread{border-left-color:var(--accent-2,#d6533c);background:rgba(214,83,60,.04);}',
      '.sh-notif-icon{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:rgba(214,83,60,.12);',
        'color:var(--accent-2,#d6533c);display:inline-flex;align-items:center;justify-content:center;}',
      '.sh-notif-icon svg{width:14px;height:14px;}',
      '.sh-notif-body{flex:1;min-width:0;}',
      '.sh-notif-text{margin:0;font-size:13px;line-height:1.4;color:var(--ink,#1a1410);}',
      '.sh-notif-text strong{font-weight:600;}',
      '.sh-notif-preview{margin:3px 0 0;font-size:12px;line-height:1.4;color:var(--ink-mid,#6e5f53);',
        'overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}',
      '.sh-notif-time{margin:3px 0 0;font-size:11px;color:var(--ink-light,#8a7a6e);}',

      '.sh-notif-empty{padding:30px 16px 26px;text-align:center;color:var(--ink-light,#8a7a6e);',
        'font-size:13px;line-height:1.55;}',
      '.sh-notif-empty em{font-family:"Caveat",cursive;font-size:18px;color:var(--ink-mid,#6e5f53);font-style:normal;display:block;margin-bottom:4px;}',

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

      /* ── Realtime corner toast ─────────────────────────────── */
      /* Small, bottom-right, paper-stamp. Never full-screen. */
      '.sh-notif-toast{position:fixed;bottom:88px;right:24px;left:auto;max-width:340px;width:auto;',
        'background:#1a1410;color:#f4ead6;padding:12px 16px;border-radius:12px;',
        'box-shadow:0 14px 36px -10px rgba(26,20,16,.45);font-family:"Ubuntu",sans-serif;',
        'font-size:13px;line-height:1.4;transform:translateY(20px);opacity:0;',
        'transition:opacity .3s ease,transform .35s cubic-bezier(.34,1.56,.64,1);',
        'z-index:1000;display:flex;align-items:flex-start;gap:10px;text-decoration:none;cursor:pointer;}',
      '.sh-notif-toast.is-show{opacity:1;transform:translateY(0);}',
      '.sh-notif-toast .sh-notif-toast-icon{flex-shrink:0;width:24px;height:24px;border-radius:50%;',
        'background:rgba(232,168,124,.18);color:#e8a87c;display:inline-flex;align-items:center;justify-content:center;}',
      '.sh-notif-toast .sh-notif-toast-icon svg{width:13px;height:13px;}',
      '.sh-notif-toast .sh-notif-toast-body{flex:1;min-width:0;}',
      '.sh-notif-toast .sh-notif-toast-text{margin:0;}',
      '.sh-notif-toast .sh-notif-toast-text strong{color:#fffaf0;}',
      '.sh-notif-toast .sh-notif-toast-preview{margin:4px 0 0;font-size:12px;color:rgba(244,234,214,.7);',
        'overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}',
      'html[data-theme="dark"] .sh-notif-toast{background:var(--surface-menu,#26201a);',
        'border:1px solid var(--border-glass,rgba(244,234,214,.14));}',

      /* Mobile — keep it small */
      '@media (max-width:520px){',
        '.sh-notif-panel{position:fixed;top:auto;right:8px;left:8px;min-width:0;max-width:none;}',
        '.sh-notif-toast{right:12px;left:12px;bottom:24px;max-width:none;}',
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
    wrap.innerHTML =
      '<button type="button" class="sh-notif-bell" id="shNotifBell" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
          '<path d="M221.8,175.94c-5.55-9.56-13.8-36.61-13.8-71.94a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"/>' +
        '</svg>' +
        '<span class="sh-notif-badge is-zero" id="shNotifBadge"></span>' +
      '</button>' +
      '<div class="sh-notif-panel" id="shNotifPanel" role="menu" aria-labelledby="shNotifBell">' +
        '<div class="sh-notif-head">' +
          '<h3>notifications</h3>' +
          '<button type="button" class="sh-notif-clear" id="shNotifClear">mark all read</button>' +
        '</div>' +
        '<ul class="sh-notif-list" id="shNotifList">' +
          '<li class="sh-notif-empty"><em>nothing new</em>quiet for now.</li>' +
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
      var open = ui.panel.classList.toggle('is-open');
      ui.bell.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && ui.panel.classList.contains('is-open')) {
        ui.panel.classList.remove('is-open');
        ui.bell.setAttribute('aria-expanded', 'false');
      }
    });
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
      ui.userId = user.id;

      // Initial load + realtime subscription.
      loadRecent(sb, ui);
      wireClearBtn(sb, ui);
      subscribeRealtime(sb, ui);
    });
  }

  function loadRecent(sb, ui) {
    sb.from('notifications')
      .select('id, actor_id, type, target_post_id, target_comment_id, preview, created_at, read_at, profiles!notifications_actor_id_fkey(username, display_name)')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(function (res) {
        if (res.error) {
          /* Try a bare select if the FK alias differs in this DB. */
          sb.from('notifications')
            .select('id, actor_id, type, target_post_id, target_comment_id, preview, created_at, read_at')
            .order('created_at', { ascending: false })
            .limit(12)
            .then(function (res2) {
              renderList(ui, res2.data || []);
              updateBadge(ui, (res2.data || []).filter(unread).length);
            });
          return;
        }
        renderList(ui, res.data || []);
        updateBadge(ui, (res.data || []).filter(unread).length);
      });
  }

  function unread(n) { return !n.read_at; }

  function wireClearBtn(sb, ui) {
    ui.clearBtn.addEventListener('click', function () {
      sb.rpc('mark_notifications_read').then(function () {
        ui.list.querySelectorAll('.sh-notif-item.is-unread').forEach(function (el) {
          el.classList.remove('is-unread');
        });
        updateBadge(ui, 0);
      });
    });
  }

  function subscribeRealtime(sb, ui) {
    var ch = sb.channel('notifications:' + ui.userId);
    ch.on('postgres_changes', {
      event:  'INSERT',
      schema: 'public',
      table:  'notifications',
      filter: 'user_id=eq.' + ui.userId,
    }, function (payload) {
      var n = payload && payload.new;
      if (!n) return;
      // Inject at the top of the dropdown list.
      var emptyEl = ui.list.querySelector('.sh-notif-empty');
      if (emptyEl) emptyEl.remove();
      ui.list.insertBefore(renderItem(n), ui.list.firstChild);
      while (ui.list.children.length > 12) ui.list.lastChild.remove();

      // Bump badge.
      var current = parseInt(ui.badge.textContent || '0', 10) || 0;
      updateBadge(ui, current + 1);

      // Corner toast (only if the panel isn't already open).
      if (!ui.panel.classList.contains('is-open')) showToast(n);
    }).subscribe();
  }

  /* ──────────────────────────────────────────────────────────────
     D. Rendering
     ────────────────────────────────────────────────────────────── */
  function copyForType(type) {
    if (type === 'reply_to_comment') return 'replied to your comment';
    return 'responded to your story';
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff / 60)   + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  /* Build a relative link to the post (works from any page).
     Lives at /post.html?id=… ; if currently inside /nav-bar/* we add a
     '../'; inside /docs/html/* we add '../../'. */
  function postUrl(postId, commentId) {
    var p = window.location.pathname || '';
    var prefix = '';
    if (/\/docs\/html\//.test(p)) prefix = '../../';
    else if (/\/nav-bar\//.test(p)) prefix = '../';
    var hash = commentId ? '#comment-' + commentId : '#comments';
    return prefix + 'post.html?id=' + encodeURIComponent(postId) + hash;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderItem(n) {
    var li = document.createElement('a');
    li.className = 'sh-notif-item' + (n.read_at ? '' : ' is-unread');
    li.href = postUrl(n.target_post_id, n.target_comment_id);
    li.innerHTML =
      '<span class="sh-notif-icon" aria-hidden="true">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">' +
          '<path d="M232,64V192a16,16,0,0,1-16,16H83l-32.6,28.16-.09.07A15.89,15.89,0,0,1,40,240a16.13,16.13,0,0,1-6.8-1.52A15.85,15.85,0,0,1,24,224V64A16,16,0,0,1,40,48H216A16,16,0,0,1,232,64Z"/></svg>' +
      '</span>' +
      '<div class="sh-notif-body">' +
        '<p class="sh-notif-text">someone <strong>' + esc(copyForType(n.type)) + '</strong></p>' +
        (n.preview ? '<p class="sh-notif-preview">' + esc(n.preview) + '</p>' : '') +
        '<p class="sh-notif-time">' + esc(timeAgo(n.created_at)) + '</p>' +
      '</div>';
    return li;
  }

  function renderList(ui, rows) {
    if (!rows.length) {
      ui.list.innerHTML = '<li class="sh-notif-empty"><em>nothing new</em>quiet for now.</li>';
      return;
    }
    ui.list.innerHTML = '';
    rows.forEach(function (n) { ui.list.appendChild(renderItem(n)); });
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
  function showToast(n) {
    var existing = document.querySelector('.sh-notif-toast');
    if (existing) existing.remove();

    var a = document.createElement('a');
    a.className = 'sh-notif-toast';
    a.href = postUrl(n.target_post_id, n.target_comment_id);
    a.innerHTML =
      '<span class="sh-notif-toast-icon" aria-hidden="true">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">' +
          '<path d="M232,64V192a16,16,0,0,1-16,16H83l-32.6,28.16-.09.07A15.89,15.89,0,0,1,40,240a16.13,16.13,0,0,1-6.8-1.52A15.85,15.85,0,0,1,24,224V64A16,16,0,0,1,40,48H216A16,16,0,0,1,232,64Z"/></svg>' +
      '</span>' +
      '<div class="sh-notif-toast-body">' +
        '<p class="sh-notif-toast-text">someone <strong>' + esc(copyForType(n.type)) + '</strong></p>' +
        (n.preview ? '<p class="sh-notif-toast-preview">' + esc(n.preview) + '</p>' : '') +
      '</div>';

    document.body.appendChild(a);
    requestAnimationFrame(function () { a.classList.add('is-show'); });
    setTimeout(function () {
      a.classList.remove('is-show');
      setTimeout(function () { if (a.parentNode) a.remove(); }, 400);
    }, 5200);
  }
})();
