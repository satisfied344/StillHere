'use strict';

/* ─────────────────────────────────────────────
   Filter panel
   ───────────────────────────────────────────── */

const filterToggle = document.getElementById('filterToggle');
const filterPanel  = document.getElementById('filterPanel');

if (filterToggle && filterPanel) {
  filterToggle.setAttribute('aria-expanded', 'false');
  filterToggle.setAttribute('aria-controls', 'filterPanel');

  filterToggle.addEventListener('click', function () {
    const opening = !filterPanel.classList.contains('is-open');
    filterPanel.classList.toggle('is-open', opening);
    filterToggle.classList.toggle('active', opening);
    filterToggle.setAttribute('aria-expanded', String(opening));

    if (opening) {
      const input = filterPanel.querySelector('#searchInput');
      if (input) setTimeout(function () { input.focus(); }, 320);
    }
  });
}

/* ─────────────────────────────────────────────
   Search clear button
   ───────────────────────────────────────────── */

const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');

function syncClearBtn() {
  if (!searchInput || !searchClear) return;
  searchClear.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
}

if (searchInput && searchClear) {
  searchClear.style.display = 'none';
  searchInput.addEventListener('input', syncClearBtn);
  searchClear.addEventListener('click', function () {
    searchInput.value = '';
    syncClearBtn();
    /* Programmatic `value = ''` does NOT fire the `input` event, so the
       feed-filter listener (which reads searchInput.value) never re-runs and
       the previous query lingers. Dispatch a real `input` event so every
       attached listener treats this exactly like a manual clear. */
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.focus();
  });
}

/* ─────────────────────────────────────────────
   Post options menu — event delegation
   (works for both static and dynamic post cards)
   ───────────────────────────────────────────── */

function closeAllPostMenus() {
  document.querySelectorAll('.post-menu-down.show').forEach(function (m) {
    m.classList.remove('show');
  });
}

document.addEventListener('click', function (e) {
  const trigger = e.target.closest('.post-menu-trigger');

  if (trigger) {
    const wrap = trigger.closest('.post-actions-menu');
    if (!wrap) return;
    const menu = wrap.querySelector('.post-menu-down');
    if (!menu) return;

    const wasOpen = menu.classList.contains('show');
    closeAllPostMenus();
    if (!wasOpen) menu.classList.add('show');
    return;
  }

  if (!e.target.closest('.post-menu-down')) {
    closeAllPostMenus();
  }
});

/* ─────────────────────────────────────────────
   Liked-posts set — persisted in localStorage
   ───────────────────────────────────────────── */

var _likedPosts = (function () {
  try { return new Set(JSON.parse(localStorage.getItem('sh_liked_posts') || '[]')); }
  catch (e) { return new Set(); }
})();

function _saveLiked() {
  try { localStorage.setItem('sh_liked_posts', JSON.stringify([..._likedPosts])); } catch (e) {}
}

/* ── Saved posts set — persisted in localStorage ── */
var _savedPosts = (function () {
  try { return new Set(JSON.parse(localStorage.getItem('sh_saved_posts') || '[]')); }
  catch (e) { return new Set(); }
})();

function _saveSaved() {
  try { localStorage.setItem('sh_saved_posts', JSON.stringify([..._savedPosts])); } catch (e) {}
}

/* ─────────────────────────────────────────────
   Whole post-card click → open post.html
   Clicks on interactive descendants (buttons, links, menus, tags,
   images) are ignored so existing behaviour stays intact.
   ───────────────────────────────────────────── */

document.addEventListener('click', function (e) {
  /* If the click landed on something that already does its own thing,
     bail. This list covers: heart/share buttons, the 3-dot menu and
     its items, the support actions, the comments link, the tag
     filter, any anchor that already navigates somewhere. */
  if (e.target.closest(
    'a, button, .post-menu-down, .post-menu-trigger, ' +
    '.post-actions-item, .post-actions-menu, .tag-no-advice, ' +
    'input, textarea, label, video, [data-action], [data-action-save], ' +
    '[data-action-copy], [data-action-edit], [data-action-delete], ' +
    '[data-action-report]'
  )) return;

  /* Don't hijack text selection — if the user is highlighting text,
     don't navigate. */
  var sel = window.getSelection && window.getSelection();
  if (sel && sel.toString().length > 0) return;

  var card = e.target.closest('.post-card[data-post-id]');
  if (!card) return;

  var pid = card.getAttribute('data-post-id');
  if (!pid) return;
  window.location.href = 'post.html?id=' + encodeURIComponent(pid);
});

/* ─────────────────────────────────────────────
   Post action buttons — event delegation
   (support / share — works for dynamic cards)
   ───────────────────────────────────────────── */

document.addEventListener('click', function (e) {
  const btn = e.target.closest('.post-actions-item[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === 'support') {
    var active  = btn.classList.toggle('post-actions-item--active');
    var stat    = btn.querySelector('.action-stat');
    var postId  = btn.closest('[data-post-id]');
    postId = postId ? postId.dataset.postId : null;

    if (stat) stat.textContent = active
      ? String(parseInt(stat.textContent || '0', 10) + 1)
      : String(Math.max(0, parseInt(stat.textContent || '1', 10) - 1));

    /* Swap label between presence states (i18n-aware). */
    var titleEl = btn.querySelector('.action-title');
    if (titleEl && window.SH_I18N) {
      titleEl.textContent = active
        ? window.SH_I18N.t('main.post.support.active')
        : window.SH_I18N.t('main.post.support');
    }

    /* Presence pulse — heart icon scales briefly via .is-pulsing in motion.css.
       Targets reduced-motion users via the @media block already in that file. */
    btn.classList.remove('is-pulsing');
    // force reflow so the animation can re-trigger when toggled rapidly
    void btn.offsetWidth;
    if (active) btn.classList.add('is-pulsing');
    setTimeout(function () { btn.classList.remove('is-pulsing'); }, 600);

    /* Calm presence toast — UI text only, backend unchanged. */
    if (typeof showMainToast === 'function') {
      showMainToast(window.SH_I18N
        ? window.SH_I18N.t(active ? 'main.toast.presence' : 'main.toast.presence.off')
        : (active ? 'they know someone is here.' : 'okay — quietly stepping back.'));
    }

    /* Persist liked state in localStorage */
    if (postId) {
      if (active) _likedPosts.add(postId);
      else        _likedPosts.delete(postId);
      _saveLiked();
    }

    /* Persist count to DB if Supabase is available */
    if (postId && window.SH_SUPABASE_URL && window.supabase) {
      var _db = window.supabase.createClient(window.SH_SUPABASE_URL, window.SH_SUPABASE_KEY);
      var fn  = active ? 'increment_support' : 'decrement_support';
      _db.rpc(fn, { post_id: postId });
    }
  }

  if (action === 'share') {
    var card = btn.closest('[data-post-id]');
    var id   = card ? card.dataset.postId : null;
    var url  = id
      ? window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'post.html?id=' + id
      : window.location.href;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { showMainToast('Link copied'); });
  }
});

/* Save Post button in post card dropdown menu */
document.addEventListener('click', function (e) {
  var saveBtn = e.target.closest('[data-action-save]');
  if (!saveBtn) return;
  var postId = saveBtn.getAttribute('data-action-save');
  var isSaved = _savedPosts.has(postId);

  if (isSaved) {
    _savedPosts.delete(postId);
    /* Outline bookmark icon */
    saveBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
      '<path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z' +
      'm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"/></svg>Save Post';
    saveBtn.classList.remove('save-post-btn--saved');
    showMainToast('Removed from saved');
  } else {
    _savedPosts.add(postId);
    /* Filled bookmark icon */
    saveBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
      '<path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z"/></svg>Saved';
    saveBtn.classList.add('save-post-btn--saved');
    showMainToast('Post saved');
  }
  _saveSaved();
  closeAllPostMenus();

  /* If currently viewing saved feed, re-render to reflect removal */
  if (activeSavedFilter && !_savedPosts.has(postId)) applyFilters();
});

/* Copy Link button in post card dropdown menu */
document.addEventListener('click', function (e) {
  var copyBtn = e.target.closest('[data-action-copy]');
  if (!copyBtn) return;
  var postId = copyBtn.getAttribute('data-action-copy');
  var url = window.location.origin +
    window.location.pathname.replace(/[^/]*$/, '') + 'post.html?id=' + postId;
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { showMainToast('Link copied'); });
  closeAllPostMenus();
});

function showMainToast(msg) {
  var t = document.getElementById('mainToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('is-visible');
  setTimeout(function () { t.classList.remove('is-visible'); }, 2800);
}

/* ── Edit post — only shown for authors. Send them to create-post in
   edit mode; the page detects ?edit=<id> and loads the existing data. */
document.addEventListener('click', function (e) {
  var ebtn = e.target.closest('[data-action-edit]');
  if (!ebtn) return;
  closeAllPostMenus();
  var pid = ebtn.getAttribute('data-action-edit');
  if (!pid) return;
  window.location.href = 'create-post.html?edit=' + encodeURIComponent(pid);
});

/* ── Report (post) — feed-level, calls SH_MOD.report ── */
document.addEventListener('click', async function (e) {
  var rbtn = e.target.closest('[data-action-report]');
  if (!rbtn) return;
  closeAllPostMenus();

  var pid = rbtn.getAttribute('data-action-report');
  console.log('[main-report] click', { pid, hasSHMOD: !!(window.SH_MOD && window.SH_MOD.report) });
  if (!pid) { showMainToast('Cannot report — post id missing.'); return; }
  if (!window.SH_MOD || !window.SH_MOD.report) {
    showMainToast('Cannot report — moderation API not loaded.');
    return;
  }

  showMainToast('Sending report…');
  try {
    var res = await window.SH_MOD.report('post', pid, null);
    console.log('[main-report] response', res);

    if (!res || res.ok === false) {
      var err = (res && res.error) || 'unknown';
      if (err === 'already_reported') showMainToast('You already reported this.');
      else                            showMainToast('Could not send report — ' + err);
      return;
    }
    var msg = 'Thanks — report counted (weight ' + (res.weight_added || 1) + ').';
    if (res.new_state === 'ai_reviewing')   msg = 'Thanks — flagged for AI review.';
    if (res.new_state === 'hidden')         msg = 'Thanks — hidden pending review.';
    if (res.new_state === 'shadow')         msg = 'Thanks — downranked while we look.';
    if (res.new_state === 'pending_manual') msg = 'Thanks — sent to manual review.';
    showMainToast(msg);
  } catch (ex) {
    console.error('[main-report] exception:', ex);
    showMainToast('Report failed: ' + (ex && ex.message ? ex.message : 'unknown'));
  }
});

/* ─────────────────────────────────────────────
   Supabase — load posts from database
   ───────────────────────────────────────────── */

(function () {
  var feed   = document.querySelector('.feed');
  var loader = document.getElementById('loadingIndicator');
  if (!feed) return;

  var sbUrl = window.SH_SUPABASE_URL;
  var sbKey = window.SH_SUPABASE_KEY;

  if (!sbUrl || sbUrl.indexOf('YOUR_PROJECT_ID') !== -1 || !window.supabase) {
    if (loader) loader.style.display = 'none';
    return;
  }

  var db = window.supabase.createClient(sbUrl, sbKey);

  /* ── infinite scroll sentinel ── */
  var scrollSentinel = document.createElement('div');
  scrollSentinel.id = 'feed-scroll-sentinel';
  scrollSentinel.style.cssText = 'height:1px;';
  feed.parentNode.insertBefore(scrollSentinel, feed.nextSibling);

  /* ── helpers ── */

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Strip HTML tags for plain-text preview of Quill-authored posts */
  function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function timeAgo(iso) {
    var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff / 60)   + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600)  + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  /* ── SVG constants ── */

  var CLOCK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>';

  var NO_ADVICE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor">' +
    '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.56,87.56,0,0,1-20.41,56.28L71.72,60.4A88,88,0,0,1,216,128ZM40,128A87.56,87.56,0,0,1,60.41,71.72L184.28,195.6A88,88,0,0,1,40,128Z"/></svg>';

  var NEED_SUPPORT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor">' +
    '<path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40Z"/></svg>';

  /* ── card builder ── */

  function buildTagsHtml(post) {
    var html = '<span class="tag tag-lang">' + escHtml((post.lang || 'en').toUpperCase()) + '</span>';

    (post.topics || []).forEach(function (topic) {
      html += '<span class="tag tag-topic">' +
        escHtml(topic.charAt(0).toUpperCase() + topic.slice(1)) + '</span>';
    });

    if (post.mode === 'no-advice') {
      var naTip = window.SH_I18N
        ? window.SH_I18N.t('main.tooltip.noadvice')
        : 'they asked for presence, not advice.';
      html += '<span class="tag tag-mode tag-no-advice"' +
        ' tabindex="0"' +
        ' role="note"' +
        ' aria-label="' + escHtml(naTip) + '"' +
        ' data-presence-tooltip="' + escHtml(naTip) + '">' +
        NO_ADVICE_SVG + ' No Advice</span>';
    } else {
      html += '<span class="tag tag-mode tag-need-support">' + NEED_SUPPORT_SVG + ' Need Support</span>';
    }

    return html;
  }

  function buildMediaStrip(post) {
    var urls = post.media_urls;
    if (!urls || !urls.length) return '';

    var shown = urls.slice(0, 3);
    var extra = urls.length - shown.length;
    var count = shown.length;
    var html = '<div class="post-media-strip post-media-strip--' + count + '">';

    shown.forEach(function (url, i) {
      var isVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
      var isLast  = (i === shown.length - 1) && extra > 0;

      html += '<div class="post-media-cell">';
      if (isVideo) {
        html += '<video src="' + escHtml(url) + '" autoplay muted loop playsinline preload="auto" class="post-media-thumb-img"></video>';
      } else {
        html += '<img src="' + escHtml(url) + '" class="post-media-thumb-img" alt="" loading="lazy">';
      }
      if (isLast) {
        html += '<div class="post-media-more">+' + extra + '</div>';
      }
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  function buildPostCard(post) {
    var title      = post.title ? escHtml(post.title) : '';
    var rawBody    = post.content || '';
    var plainBody  = stripHtml(rawBody);
    var preview    = escHtml(plainBody.length > 220 ? plainBody.slice(0, 220) + '…' : plainBody);
    var id      = escHtml(post.id);
    var canDelete = !!(_currentUserId && post.user_id && post.user_id === _currentUserId);

    return (
      '<article class="post-card" data-post-id="' + id + '">' +

      '<div class="post-header">' +
        '<div class="post-author-info">' +
          '<div class="post-avatar">' +
            (post.profiles && post.profiles.avatar_url
              ? '<img src="' + escHtml(post.profiles.avatar_url) + '" alt="Avatar" class="post-avatar-img">'
              : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"' +
                ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
                ' stroke-linejoin="round" class="icon" aria-hidden="true">' +
                '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>') +
          '</div>' +
          '<div class="post-include-info">' +
            '<span class="post-author">' + (
            post.profiles
              ? escHtml(post.profiles.display_name || post.profiles.username)
              : post.user_id
                ? '<span style="opacity:0.5;font-style:italic">deleted account</span>'
                : 'Anonymous'
          ) + '</span>' +
            '<span class="post-time">' + CLOCK_SVG + ' ' + timeAgo(post.created_at) + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="post-actions-menu">' +
          '<button class="button-icon post-menu-trigger">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
            '<path d="M128,96a32,32,0,1,0,32,32A32,32,0,0,0,128,96Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,128,144Z' +
            'M48,96a32,32,0,1,0,32,32A32,32,0,0,0,48,96Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,48,144Z' +
            'M208,96a32,32,0,1,0,32,32A32,32,0,0,0,208,96Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,208,144Z"/></svg>' +
          '</button>' +
          '<ul class="post-menu-down" role="menu">' +
            '<li role="menu-item"><button type="button" data-action-save="' + id + '" class="save-post-btn' + (_savedPosts.has(post.id) ? ' save-post-btn--saved' : '') + '">' +
              (_savedPosts.has(post.id)
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true"><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z"/></svg>' + (window.SH_I18N ? window.SH_I18N.t('main.post.menu.unsave') : 'Saved')
                : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true"><path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"/></svg>' + (window.SH_I18N ? window.SH_I18N.t('main.post.menu.save') : 'Save Post')) +
              '</button></li>' +
            '<li role="menu-item"><button type="button" data-action-copy="' + id + '">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
              '<path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0' +
              'a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23Z' +
              'M109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96' +
              'a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/></svg>' +
              (window.SH_I18N ? window.SH_I18N.t('main.post.menu.copy') : 'Copy Link') + '</button></li>' +
            (canDelete
              ? '<li role="menu-item"><button type="button" data-action-edit="' + id + '">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
                  '<path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96A16,16,0,0,0,227.31,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.32,64l24-24L216,84.68Z"/></svg>' +
                  (window.SH_I18N ? window.SH_I18N.t('main.post.menu.edit') : 'Edit post') + '</button></li>' +
                '<li role="none" class="post-menu-divider" aria-hidden="true"></li>' +
                '<li role="menu-item"><button type="button" class="menu-item-danger" data-action-delete="' + id + '">' +
                  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
                  '<path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16Z' +
                  'M96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg>' +
                  (window.SH_I18N ? window.SH_I18N.t('main.post.menu.delete') : 'Delete post') + '</button></li>'
              : '') +
            '<li role="menu-item"><button type="button" class="menu-item-report" data-action-report="' + id + '">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
              '<path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9' +
              'a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72' +
              'L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg>' +
              (window.SH_I18N ? window.SH_I18N.t('main.post.menu.report') : 'Report') + '</button></li>' +
          '</ul>' +
        '</div>' +
      '</div>' +

      '<div class="post-content">' +
        '<h2 class="post-title">' +
          (title
            ? '<a href="post.html?id=' + id + '">' + title + '</a>'
            : '<a href="post.html?id=' + id + '"><em>(no title)</em></a>') +
        '</h2>' +
        '<div class="post-tags">' + buildTagsHtml(post) + '</div>' +
        '<p class="post-preview">' + preview + '</p>' +
        buildMediaStrip(post) +
      '</div>' +

      '<div class="post-actions">' +
        '<button class="post-actions-item' + (_likedPosts.has(post.id) ? ' post-actions-item--active' : '') + '" data-action="support">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
          '<path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0' +
          'C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27' +
          'a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z"/></svg>' +
          '<span class="action-title">' + (window.SH_I18N
            ? window.SH_I18N.t(_likedPosts.has(post.id) ? 'main.post.support.active' : 'main.post.support')
            : (_likedPosts.has(post.id) ? 'here' : "I'm here")) + '</span>' +
        '</button>' +
        '<a class="post-actions-item" href="post.html?id=' + id + '#comments">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
          '<path d="M116,128a12,12,0,1,1,12,12A12,12,0,0,1,116,128ZM84,140a12,12,0,1,0-12-12A12,12,0,0,0,84,140Zm88,0a12,12,0,1,0-12-12A12,12,0,0,0,172,140Z' +
          'm60-76V192a16,16,0,0,1-16,16H83l-32.6,28.16-.09.07A15.89,15.89,0,0,1,40,240a16.13,16.13,0,0,1-6.8-1.52A15.85,15.85,0,0,1,24,224V64A16,16,0,0,1,40,48H216' +
          'A16,16,0,0,1,232,64ZM40,224h0ZM216,64H40V224l34.77-30A8,8,0,0,1,80,192H216Z"/></svg>' +
          '<span class="action-stat">' + (post.comment_count || 0) + '</span>' +
          '<span class="action-title">' + (window.SH_I18N ? window.SH_I18N.t('main.post.responses') : 'Responses') + '</span>' +
        '</a>' +
        '<button class="post-actions-item" data-action="share">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
          '<path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63' +
          'a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Z' +
          'm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z"/></svg>' +
          '<span class="action-title">' + (window.SH_I18N ? window.SH_I18N.t('main.post.share') : 'Share') + '</span>' +
        '</button>' +
      '</div>' +

      '</article>'
    );
  }

  /* ── post cache + filter state ── */

  var allPosts    = [];
  var _currentUserId = null;
  var activeLangs = {};   // { en: true, ru: true, … }
  var activeModes       = {};    // { 'support': true, 'no-advice': true } — both can be active
  var activeTopic       = '';    // e.g. 'anxiety' — single topic filter from sidebar
  var searchQuery       = '';
  var activeSavedFilter = false; // true when "Saved" sidebar item is selected

  /* ── pagination state ── */
  /* Progressive batches: first render shows 10, then each click reveals
     10, 15, 15, 20, then 20 forever. */
  var BATCH_SIZES          = [10, 10, 15, 15, 20];
  var batchIndex           = 0;          // how many batches already rendered
  var currentFilteredPosts = [];
  var displayedCount       = 0;
  var _scrollObserver      = null;

  function nextBatchSize() {
    return batchIndex < BATCH_SIZES.length ? BATCH_SIZES[batchIndex] : 20;
  }

  /* ── "Load more" button — shown after the first batch ── */
  var loadMoreBtn = document.createElement('button');
  loadMoreBtn.type = 'button';
  loadMoreBtn.id = 'feedLoadMoreBtn';
  loadMoreBtn.className = 'feed-load-more-btn';
  loadMoreBtn.innerHTML =
    '<span data-i18n="main.loadmore">Show more stories</span>' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
    '<path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg>';
  loadMoreBtn.style.display = 'none';
  loadMoreBtn.addEventListener('click', function () { renderBatch(); });
  if (feed.parentNode) feed.parentNode.insertBefore(loadMoreBtn, feed.nextSibling);
  /* Translate the static label once (data-i18n inside innerHTML), and on
     every subsequent language change. syncLoadMoreBtn() additionally
     rewrites the dynamic "(N left)" suffix from SH_I18N.t each time. */
  if (window.SH_I18N) window.SH_I18N.apply(loadMoreBtn);
  document.addEventListener('sh:langchange', function () {
    if (window.SH_I18N) window.SH_I18N.apply(loadMoreBtn);
    syncLoadMoreBtn();
  });

  function syncLoadMoreBtn() {
    var hasMore = displayedCount < currentFilteredPosts.length;
    loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
    if (hasMore) {
      var remaining = currentFilteredPosts.length - displayedCount;
      var size      = nextBatchSize();
      var label     = loadMoreBtn.querySelector('span');
      if (label) {
        var base = (window.SH_I18N ? window.SH_I18N.t('main.loadmore') : 'Show more stories');
        label.textContent = base + (remaining > size ? ' (' + remaining + ')' : '');
      }
    }
  }

  /* ── append next batch of posts ── */

  /* When true, the *next* batch render skips the post-card--enter animation.
     Set by renderPosts() when it's a filter/sort/clear re-render so users
     don't see content fade out + back in. Cleared after each renderBatch. */
  var _skipBatchEnter = false;

  function renderBatch() {
    var size  = nextBatchSize();
    var batch = currentFilteredPosts.slice(displayedCount, displayedCount + size);
    if (!batch.length) {
      if (_scrollObserver) _scrollObserver.disconnect();
      syncLoadMoreBtn();
      return;
    }
    var skipEnter   = _skipBatchEnter;
    _skipBatchEnter = false;

    var fragment    = document.createDocumentFragment();
    var newCards    = [];
    batch.forEach(function (post) {
      var tmp = document.createElement('div');
      tmp.innerHTML = buildPostCard(post);
      while (tmp.firstChild) {
        var node = tmp.firstChild;
        /* Mark only freshly-appended cards on initial load / "Load more".
           Skip when re-rendering from filter/sort/clear to avoid flicker. */
        if (!skipEnter && node.nodeType === 1 && node.classList && node.classList.contains('post-card')) {
          node.classList.add('post-card--enter');
          newCards.push(node);
        }
        fragment.appendChild(node);
      }
    });
    feed.insertBefore(fragment, loader);

    /* Skeleton removal is deferred to this point so the layout doesn't
       collapse between "skeleton gone" and "cards faded in" — the new
       cards (in their hidden --enter state) already occupy the space. */
    hideSkeleton();

    if (newCards.length) {
      /* Calm stagger — one rAF lets the browser commit initial styles, then
         a small per-card delay produces the soft cascade. Caps at 6 to avoid
         a long wait on large batches. */
      requestAnimationFrame(function () {
        newCards.forEach(function (el, i) {
          var delay = Math.min(i, 6) * 70;
          setTimeout(function () { el.classList.add('is-in'); }, delay);
        });
      });
    }

    displayedCount += batch.length;
    batchIndex++;
    if (displayedCount >= currentFilteredPosts.length && _scrollObserver) {
      _scrollObserver.disconnect();
    }
    syncLoadMoreBtn();
  }

  /* ── skeleton stack — shown only on initial fetch / refresh ── */

  var _skelEl = null;
  function showSkeleton(count) {
    hideSkeleton();
    if (!feed) return;
    var n = Math.max(2, Math.min(count || 3, 4));
    var wrap = document.createElement('div');
    wrap.className = 'feed-skeleton-stack';
    wrap.setAttribute('aria-hidden', 'true');
    var html = '';
    for (var i = 0; i < n; i++) {
      html +=
        '<div class="post-skeleton">' +
          '<div class="skel skel-avatar"></div>' +
          '<div class="skel skel-line skel-line--short" style="margin-top:14px"></div>' +
          '<div class="skel skel-line skel-line--long"></div>' +
          '<div class="skel skel-line skel-line--long"></div>' +
          '<div class="skel skel-line skel-line--short"></div>' +
          '<div class="skel skel-pill"></div>' +
          '<div class="skel skel-pill"></div>' +
        '</div>';
    }
    wrap.innerHTML = html;
    feed.insertBefore(wrap, loader);
    _skelEl = wrap;
  }
  function hideSkeleton() {
    if (_skelEl && _skelEl.parentNode) _skelEl.parentNode.removeChild(_skelEl);
    _skelEl = null;
  }

  function initScrollObserver() {
    if (_scrollObserver) _scrollObserver.disconnect();
    _scrollObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) renderBatch();
    }, { rootMargin: '200px' });
    _scrollObserver.observe(scrollSentinel);
  }

  /* ── render ── */

  function renderPosts(posts) {
    /* Atomic swap: snapshot the old cards but DO NOT remove them yet.
       renderBatch() inserts the new fragment first, then we strip the
       leftover old nodes — at no point is the feed visually empty.
       Skip the enter animation on the next batch when there were
       already cards (filter / sort / refresh re-render). */
    var oldNodes = Array.prototype.slice.call(
      feed.querySelectorAll('.post-card, .feed-empty')
    );
    var hadPrev = oldNodes.length > 0;
    _skipBatchEnter = hadPrev;

    if (loader) loader.style.display = 'none';

    currentFilteredPosts = posts || [];
    displayedCount = 0;
    batchIndex     = 0;

    if (!currentFilteredPosts.length) {
      hideSkeleton();
      oldNodes.forEach(function (n) { n.remove(); });
      if (_scrollObserver) _scrollObserver.disconnect();
      var hasFilters = !!(Object.keys(activeLangs).length ||
                          Object.keys(activeModes).length ||
                          activeTopic ||
                          searchQuery);
      var t = function (k, fb) { return window.SH_I18N ? window.SH_I18N.t(k) : fb; };

      var titleKey, textKey, fbTitle, fbText, ctaHtml;
      if (activeSavedFilter) {
        titleKey = 'main.empty.savedTitle';
        textKey  = 'main.empty.savedText';
        fbTitle  = 'No saved stories yet';
        fbText   = 'Tap “Save Post” on any story to keep it here.';
        ctaHtml  = '';
      } else if (hasFilters) {
        titleKey = 'main.empty.filteredTitle';
        textKey  = 'main.empty.filteredText';
        fbTitle  = 'Nothing matches these filters';
        fbText   = 'Try clearing a filter or come back later.';
        ctaHtml  = '<button type="button" class="feed-empty__cta" data-empty-action="clear">' +
                     escHtml(t('main.empty.clear', 'clear filters')) +
                   '</button>';
      } else {
        titleKey = 'main.empty.title';
        textKey  = 'main.empty.text';
        fbTitle  = 'No stories yet';
        fbText   = 'be the first to share — your story matters.';
        ctaHtml  = '<a class="feed-empty__cta feed-empty__cta--primary" href="create-post.html">' +
                     escHtml(t('main.empty.share', 'share something')) +
                   '</a>';
      }

      var empty = document.createElement('div');
      empty.className = 'feed-empty feed-empty--polished';
      empty.setAttribute('role', 'status');
      empty.innerHTML =
        '<p class="feed-empty__title">' + escHtml(t(titleKey, fbTitle)) + '</p>' +
        '<p class="feed-empty__text">'  + escHtml(t(textKey,  fbText))  + '</p>' +
        (ctaHtml ? '<div class="feed-empty__actions">' + ctaHtml + '</div>' : '');

      feed.insertBefore(empty, loader);

      /* Single-shot wiring for the "clear filters" CTA. */
      var clearBtn = empty.querySelector('[data-empty-action="clear"]');
      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          activeLangs  = {};
          activeModes  = {};
          activeTopic  = '';
          searchQuery  = '';
          var si = document.getElementById('searchInput');
          if (si) { si.value = ''; si.dispatchEvent(new Event('input', { bubbles: true })); }
          document.querySelectorAll('.lang-radio').forEach(function (cb) { cb.checked = false; });
          if (langAllBtn) langAllBtn.classList.add('pill-active');
          document.querySelectorAll('.pill[data-filter="support"]').forEach(function (p) {
            p.classList.remove('pill-active');
          });
          document.querySelectorAll('[data-topic-filter]').forEach(function (l) {
            l.classList.remove('active');
          });
          renderLangChips();
          applyFilters();
        });
      }

      syncLoadMoreBtn();
      return;
    }

    /* Render first page only — user clicks "Show more" for the rest.
       (No IntersectionObserver — it fires immediately on attach if the
       sentinel is already in view, which auto-loads everything.) */
    renderBatch();
    /* Strip leftover old cards now that the new fragment is in place. */
    oldNodes.forEach(function (n) { n.remove(); });
    if (_scrollObserver) _scrollObserver.disconnect();
  }

  /* ── client-side filter ── */

  function applyFilters() {
    var langKeys  = Object.keys(activeLangs);
    var modeKeys  = Object.keys(activeModes);
    var query     = searchQuery.trim().toLowerCase();
    var sortVal   = (document.getElementById('sortSelect') || {}).value || 'recent';

    var filtered = allPosts.filter(function (post) {
      if (activeSavedFilter && !_savedPosts.has(post.id)) return false;
      if (langKeys.length && langKeys.indexOf(post.lang) === -1) return false;
      if (modeKeys.length && modeKeys.indexOf(post.mode) === -1) return false;
      if (activeTopic && (post.topics || []).indexOf(activeTopic) === -1) return false;
      if (query) {
        var inTitle   = (post.title   || '').toLowerCase().indexOf(query) !== -1;
        var inContent = (post.content || '').toLowerCase().indexOf(query) !== -1;
        if (!inTitle && !inContent) return false;
      }
      return true;
    });

    if (sortVal === 'recent') {
      // newest first
      filtered.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    } else if (sortVal === 'popular') {
      // most supports first (support_count column if present), then newest
      filtered.sort(function (a, b) {
        var diff = (b.support_count || 0) - (a.support_count || 0);
        return diff !== 0 ? diff : new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (sortVal === 'discussed') {
      // most comments first (comment_count column if present), then newest
      filtered.sort(function (a, b) {
        var diff = (b.comment_count || 0) - (a.comment_count || 0);
        return diff !== 0 ? diff : new Date(b.created_at) - new Date(a.created_at);
      });
    } else if (sortVal === 'unanswered') {
      // posts that need support most: fewest supports + oldest (been waiting longest)
      filtered.sort(function (a, b) {
        var sa = a.support_count || 0;
        var sb = b.support_count || 0;
        if (sa !== sb) return sa - sb; // ascending — least supported first
        return new Date(a.created_at) - new Date(b.created_at); // oldest first
      });
    }

    renderPosts(filtered);
  }

  /* ── lang chip helpers (for dropdown-selected languages) ── */

  // Languages that already have a visible checkbox pill — no chip needed
  var PILL_LANG_CODES = ['en','ru','uk','de','fr','es','zh','ja','ar'];

  // Short display labels for dropdown langs
  var DROPDOWN_LANG_NAMES = {
    pt:'PT', it:'IT', pl:'PL', nl:'NL', sv:'SV', no:'NO', fi:'FI',
    cs:'CS', sk:'SK', ro:'RO', hu:'HU', tr:'TR', he:'HE', fa:'FA',
    hi:'HI', bn:'BN', ur:'UR', ko:'KO', th:'TH', vi:'VI', id:'ID',
    ms:'MS', tl:'TL', sw:'SW', am:'AM', ka:'KA', hy:'HY', az:'AZ',
    kk:'KK', uz:'UZ', other:'?'
  };

  var activeLangTagsEl = null;

  function ensureLangTagsEl() {
    if (activeLangTagsEl) return;
    var row = document.querySelector('.lang-select-row');
    if (!row) return;
    activeLangTagsEl = document.createElement('div');
    activeLangTagsEl.className = 'active-lang-tags';
    row.parentNode.insertBefore(activeLangTagsEl, row.nextSibling);
  }

  function renderLangChips() {
    ensureLangTagsEl();
    if (!activeLangTagsEl) return;
    activeLangTagsEl.innerHTML = '';
    Object.keys(activeLangs).forEach(function (code) {
      if (PILL_LANG_CODES.indexOf(code) !== -1) return; // already shown as a checkbox pill
      var label = DROPDOWN_LANG_NAMES[code] || code.toUpperCase();
      var chip  = document.createElement('button');
      chip.type      = 'button';
      // Use the same classes as selected lang-pills so they look identical
      chip.className = 'lang-pill pill-active';
      chip.innerHTML = label + ' <span style="opacity:0.55;margin-left:3px;font-size:14px">×</span>';
      chip.title     = 'Remove ' + label + ' filter';
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        delete activeLangs[code];
        if (!Object.keys(activeLangs).length && langAllBtn) {
          langAllBtn.classList.add('pill-active');
        }
        renderLangChips();
        applyFilters();
      });
      activeLangTagsEl.appendChild(chip);
    });
  }

  /* ── language checkboxes + "All" ── */

  var langAllBtn = document.getElementById('langAll');

  document.querySelectorAll('.lang-radio').forEach(function (cb) {
    cb.addEventListener('change', function () {
      if (cb.checked) {
        activeLangs[cb.value] = true;
        if (langAllBtn) langAllBtn.classList.remove('pill-active');
      } else {
        delete activeLangs[cb.value];
        if (!Object.keys(activeLangs).length && langAllBtn) {
          langAllBtn.classList.add('pill-active');
        }
      }
      applyFilters();
    });
  });

  if (langAllBtn) {
    langAllBtn.addEventListener('click', function () {
      activeLangs = {};
      document.querySelectorAll('.lang-radio').forEach(function (cb) { cb.checked = false; });
      langAllBtn.classList.add('pill-active');
      renderLangChips();
      applyFilters();
    });
  }

  /* ── "More languages" dropdown → add to activeLangs + show chip ── */

  var langSelectOther = document.querySelector('.lang-select-other');
  if (langSelectOther) {
    langSelectOther.addEventListener('change', function () {
      var val = langSelectOther.value;
      langSelectOther.value = ''; // reset to placeholder so user can pick again
      if (!val) return;
      activeLangs[val] = true;
      if (langAllBtn) langAllBtn.classList.remove('pill-active');
      renderLangChips();
      applyFilters();
    });
  }

  /* ── support type pills → toggle each independently ── */

  document.querySelectorAll('.pill[data-filter="support"]').forEach(function (pill) {
    pill.addEventListener('click', function (e) {
      e.stopPropagation();
      var val = pill.dataset.value === 'need-support' ? 'support' : 'no-advice';
      if (activeModes[val]) {
        // clicking active pill → deselect (show all)
        activeModes = {};
        document.querySelectorAll('.pill[data-filter="support"]').forEach(function (p) {
          p.classList.remove('pill-active');
        });
      } else {
        // select this one, deselect the other
        activeModes = {};
        activeModes[val] = true;
        document.querySelectorAll('.pill[data-filter="support"]').forEach(function (p) {
          p.classList.toggle('pill-active', p === pill);
        });
      }
      applyFilters();
    });
  });

  /* ── search → filter ── */

  var searchInputEl = document.getElementById('searchInput');
  if (searchInputEl) {
    var searchTimer;
    searchInputEl.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        searchQuery = searchInputEl.value;
        applyFilters();
      }, 280);
    });
  }

  /* ── sort → filter ── */

  var sortSelectEl = document.getElementById('sortSelect');
  if (sortSelectEl) {
    sortSelectEl.addEventListener('change', applyFilters);
  }

  /* ── topic sidebar links → filter feed ── */

  document.querySelectorAll('[data-topic-filter]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var topic = link.getAttribute('data-topic-filter');
      if (activeTopic === topic) {
        // clicking active topic deselects it
        activeTopic = '';
        document.querySelectorAll('[data-topic-filter]').forEach(function (l) {
          l.classList.remove('active');
        });
      } else {
        activeTopic = topic;
        document.querySelectorAll('[data-topic-filter]').forEach(function (l) {
          l.classList.toggle('active', l === link);
        });
      }
      applyFilters();
    });
  });

  /* ── fetch from Supabase ── */

  function fetchPosts() {
    /* Keep existing cards visible during refresh — renderPosts() will
       swap them in one paint once the new data arrives. Only show the
       skeleton when there is genuinely nothing to look at (first load
       or after an empty state). */
    var hadPosts = feed.querySelectorAll('.post-card').length > 0;
    if (!hadPosts) {
      if (loader) loader.style.display = 'flex';
      feed.querySelectorAll('.feed-empty').forEach(function (el) { el.remove(); });
      showSkeleton(3);
    }

    /* Hide the "Show more stories" button while we're reloading —
       renderPosts() will re-show it if there are still more posts after the fetch. */
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    var refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.classList.add('spinning');

    function processPostsResult(result, _retryPass) {
      if (refreshBtn) refreshBtn.classList.remove('spinning');
      if (result.error) {
        console.warn('Supabase posts query error (pass=' + (_retryPass || 0) + '):', result.error.message);
        /* Pass 0 → try without avatar_url (column might not exist) */
        if (!_retryPass) {
          db.from('posts')
            .select('*, comments(count), profiles(username, display_name)')
            .order('created_at', { ascending: false })
            .then(function (r) { processPostsResult(r, 1); });
          return;
        }
        /* Pass 1 → try bare posts+profiles (comments join might be blocked) */
        if (_retryPass === 1) {
          db.from('posts')
            .select('*, profiles(username, display_name, avatar_url)')
            .order('created_at', { ascending: false })
            .then(function (r) { processPostsResult(r, 2); });
          return;
        }
        /* Pass 2 → bare posts only, no join */
        if (_retryPass === 2) {
          db.from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .then(function (r) { processPostsResult(r, 3); });
          return;
        }
        /* All retries exhausted */
        console.error('Could not load posts after all retries:', result.error);
        if (loader) loader.style.display = 'none';
        return;
      }
      /* merge live comment count from the join (may be 0 if RLS hides rows from anon) */
      var rawPosts = (result.data || []).map(function (p) {
        var liveCount = (p.comments && p.comments[0]) ? (p.comments[0].count || 0) : 0;
        p.comment_count = liveCount;
        return p;
      });

      /* Robust fallback: always re-fetch comment counts via a separate query
         and merge in. The nested `comments(count)` aggregate sometimes returns
         0 even when comments exist (e.g. due to RLS visibility). Fetching the
         raw post_id column and counting client-side is reliable. */
      var visibleIds = rawPosts.map(function (p) { return p.id; }).filter(Boolean);
      if (visibleIds.length) {
        db.from('comments')
          .select('post_id')
          .in('post_id', visibleIds)
          .then(function (cr) {
            if (cr.error || !cr.data) return;
            var counts = {};
            cr.data.forEach(function (c) {
              counts[c.post_id] = (counts[c.post_id] || 0) + 1;
            });
            /* Update the cached post objects so future re-renders use the
               corrected counts. */
            rawPosts.forEach(function (p) {
              if (counts[p.id] !== undefined) p.comment_count = counts[p.id];
            });
            if (allPosts && allPosts.length) {
              allPosts.forEach(function (p) {
                if (counts[p.id] !== undefined) p.comment_count = counts[p.id];
              });
            }
            /* In-place DOM patch — no re-render, no atomic swap, no flicker,
               no killed enter animation. We only need to update the small
               "Responses" stat number on cards that are already visible. */
            feed.querySelectorAll('.post-card[data-post-id]').forEach(function (card) {
              var pid = card.getAttribute('data-post-id');
              if (counts[pid] === undefined) return;
              /* Comments link is the only post-actions-item that contains
                 an .action-stat span — target that. */
              var statEl = card.querySelector('a.post-actions-item .action-stat');
              if (statEl) statEl.textContent = String(counts[pid]);
            });
          });
      }

      /* If any posts are missing profile data, fetch those profiles
         separately and merge them in before rendering. */
      var missingProfileUids = rawPosts
        .filter(function (p) { return p.user_id && !p.profiles; })
        .map(function (p) { return p.user_id; });
      // De-duplicate
      missingProfileUids = missingProfileUids.filter(function (id, i, arr) { return arr.indexOf(id) === i; });

      var needsProfileFetch = missingProfileUids.length > 0;

      if (needsProfileFetch) {
        db.from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', missingProfileUids)
          .then(function (pr) {
            var map = {};
            if (!pr.error && pr.data) {
              pr.data.forEach(function (prof) { map[prof.id] = prof; });
            }
            allPosts = rawPosts.map(function (p) {
              if (p.user_id && map[p.user_id]) p.profiles = map[p.user_id];
              return p;
            });
            applyFilters();
            updateTopicCounts(allPosts);
            updateWeekStats(allPosts);
          });
        return; // wait for profile fetch
      }

      allPosts = rawPosts;
      applyFilters();
      updateTopicCounts(allPosts);
      updateWeekStats(allPosts);
    }

    // Run auth-user lookup and posts fetch in parallel so a slow/failing
    // auth call never blocks the feed from loading.
    Promise.all([
      db.auth.getUser().catch(function () { return { data: { user: null } }; }),
      db.from('posts')
        .select('*, comments(count), profiles(username, display_name, avatar_url)')
        .order('created_at', { ascending: false }),
    ]).then(function (results) {
      var userRes  = results[0];
      var postsRes = results[1];
      _currentUserId = (userRes && userRes.data && userRes.data.user)
        ? userRes.data.user.id : null;
      processPostsResult(postsRes);
    }).catch(function (err) {
      // Unexpected rejection (should never happen since getUser is caught above)
      console.error('fetchPosts unexpected error:', err);
      if (refreshBtn) refreshBtn.classList.remove('spinning');
      if (loader) loader.style.display = 'none';
    });
  }

  /* ── topic counts (left sidebar) ── */

  function updateTopicCounts(posts) {
    var counts = {
      anxiety: 0, depression: 0, relationships: 0, grief: 0, burnout: 0,
      loneliness: 0, trauma: 0, other: 0
    };
    posts.forEach(function (post) {
      (post.topics || []).forEach(function (t) {
        if (Object.prototype.hasOwnProperty.call(counts, t)) counts[t]++;
      });
    });
    Object.keys(counts).forEach(function (key) {
      var el = document.getElementById('tc-' + key);
      if (el) el.textContent = String(counts[key]);
    });
  }

  /* ── "This Week" stats (right sidebar) ──
     Counts events since the start of the current calendar week (Monday 00:00 local).
     This makes the widget visibly RESET every Monday — true "this week" meaning. */

  function startOfCalendarWeek() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var day = d.getDay();        // 0=Sun, 1=Mon, … 6=Sat
    var back = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - back);
    return d;
  }

  function updateWeekStats(posts) {
    var weekStart = startOfCalendarWeek();
    var stories   = posts.filter(function (p) { return new Date(p.created_at) >= weekStart; }).length;

    var storiesEl = document.getElementById('stat-stories');
    var supportEl = document.getElementById('stat-support');
    var membersEl = document.getElementById('stat-members');

    if (storiesEl) storiesEl.textContent = String(stories);

    /* Support given = total comments since Monday; also used for active members */
    db.from('comments')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString())
      .then(function (res) {
        var commentCount = res.error ? 0 : (res.count || 0);
        if (supportEl) supportEl.textContent = String(commentCount);
        if (membersEl) membersEl.textContent = String(stories + commentCount);
      });
  }

  fetchPosts();

  /* ── Sidebar Saved / Home filter event ── */
  document.addEventListener('sh:savedFilter', function (e) {
    activeSavedFilter = e.detail;
    applyFilters();
  });

  /* ── refresh button ── */

  var refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', fetchPosts);
  }

  /* ── delete confirm modal ── */

  var _mainDelCallback = null;

  (function wireMainDelModal() {
    var backdrop  = document.getElementById('mainDelBackdrop');
    var btnOk     = document.getElementById('mainDelConfirm');
    var btnCancel = document.getElementById('mainDelCancel');
    if (!backdrop || !btnOk || !btnCancel) return;

    function close() {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
      _mainDelCallback = null;
    }

    btnOk.addEventListener('click', function () {
      var cb = _mainDelCallback;
      close();
      if (cb) cb();
    });

    btnCancel.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop.classList.contains('is-open')) close();
    });
  })();

  function showMainConfirm(callback) {
    var backdrop = document.getElementById('mainDelBackdrop');
    if (!backdrop) { if (callback) callback(); return; }
    _mainDelCallback = callback;
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      var btn = document.getElementById('mainDelConfirm');
      if (btn) btn.focus();
    }, 50);
  }

  /* ── delete post handler ── */

  document.addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-action-delete]');
    if (!delBtn) return;

    var postId = delBtn.getAttribute('data-action-delete');
    if (!postId) return;

    closeAllPostMenus();

    showMainConfirm(function () {
      db.from('posts').delete().eq('id', postId).then(function (result) {
        if (result.error) {
          var toast = document.getElementById('mainToast');
          if (toast) {
            toast.textContent = 'Error: ' + result.error.message;
            toast.classList.add('is-visible');
            setTimeout(function () { toast.classList.remove('is-visible'); }, 2800);
          }
          return;
        }
        allPosts = allPosts.filter(function (p) { return p.id !== postId; });
        var card = delBtn.closest('.post-card');
        if (card) card.remove();
      });
    });
  });
})();
