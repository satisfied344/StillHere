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
    searchInput.focus();
  });
}

/* ─────────────────────────────────────────────
   Filter pills (support type)
   ───────────────────────────────────────────── */

document.querySelectorAll('.pill[data-filter]').forEach(function (pill) {
  pill.addEventListener('click', function () {
    pill.classList.toggle('pill-active');
  });
});

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
   Post action buttons — event delegation
   (support / share — works for dynamic cards)
   ───────────────────────────────────────────── */

document.addEventListener('click', function (e) {
  const btn = e.target.closest('.post-actions-item[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === 'support') {
    const active = btn.classList.toggle('post-actions-item--active');
    const stat   = btn.querySelector('.action-stat');
    if (stat) stat.textContent = active
      ? String(parseInt(stat.textContent || '0', 10) + 1)
      : String(Math.max(0, parseInt(stat.textContent || '1', 10) - 1));
  }

  if (action === 'share') {
    navigator.clipboard && navigator.clipboard.writeText(window.location.href);
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

  /* ── helpers ── */

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
      html += '<span class="tag tag-mode tag-no-advice">' + NO_ADVICE_SVG + ' No Advice</span>';
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
    var html  = '<div class="post-media-strip">';
    shown.forEach(function (url) {
      var isVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
      if (isVideo) {
        html += '<div class="post-media-thumb post-media-thumb--video">' +
          '<video src="' + escHtml(url) + '" muted preload="none" class="post-media-thumb-img"></video>' +
          '<span class="post-media-play">▶</span></div>';
      } else {
        html += '<img src="' + escHtml(url) + '" class="post-media-thumb-img" alt="" loading="lazy">';
      }
    });
    if (extra > 0) {
      html += '<div class="post-media-more">+' + extra + '</div>';
    }
    html += '</div>';
    return html;
  }

  function buildPostCard(post) {
    var title   = post.title ? escHtml(post.title) : '';
    var rawBody = post.content || '';
    var preview = escHtml(rawBody.length > 220 ? rawBody.slice(0, 220) + '…' : rawBody);
    var id      = escHtml(post.id);

    return (
      '<article class="post-card" data-post-id="' + id + '">' +

      '<div class="post-header">' +
        '<div class="post-author-info">' +
          '<div class="post-avatar">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"' +
            ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
            ' stroke-linejoin="round" class="icon" aria-hidden="true">' +
            '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>' +
          '</div>' +
          '<div class="post-include-info">' +
            '<span class="post-author">Anonymous</span>' +
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
            '<li role="menu-item"><button type="button">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
              '<path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z' +
              'm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"/></svg>' +
              'Save Post</button></li>' +
            '<li role="menu-item"><button type="button">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
              '<path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0' +
              'a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23Z' +
              'M109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96' +
              'a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/></svg>' +
              'Copy Link</button></li>' +
            '<li role="none" class="post-menu-divider" aria-hidden="true"></li>' +
            '<li role="menu-item"><button type="button" class="menu-item-danger" data-action-delete="' + id + '">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
              '<path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16Z' +
              'M96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg>' +
              'Delete post</button></li>' +
            '<li role="menu-item"><button type="button" class="menu-item-report">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
              '<path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9' +
              'a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72' +
              'L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg>' +
              'Report</button></li>' +
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
        '<button class="post-actions-item" data-action="support">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
          '<path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0' +
          'C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27' +
          'a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z"/></svg>' +
          '<span class="action-title">Support</span>' +
        '</button>' +
        '<button class="post-actions-item" data-action="comment">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
          '<path d="M116,128a12,12,0,1,1,12,12A12,12,0,0,1,116,128ZM84,140a12,12,0,1,0-12-12A12,12,0,0,0,84,140Zm88,0a12,12,0,1,0-12-12A12,12,0,0,0,172,140Z' +
          'm60-76V192a16,16,0,0,1-16,16H83l-32.6,28.16-.09.07A15.89,15.89,0,0,1,40,240a16.13,16.13,0,0,1-6.8-1.52A15.85,15.85,0,0,1,24,224V64A16,16,0,0,1,40,48H216' +
          'A16,16,0,0,1,232,64ZM40,224h0ZM216,64H40V224l34.77-30A8,8,0,0,1,80,192H216Z"/></svg>' +
          '<span class="action-stat">0</span>' +
          '<span class="action-title">Responses</span>' +
        '</button>' +
        '<button class="post-actions-item" data-action="share">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
          '<path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63' +
          'a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Z' +
          'm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z"/></svg>' +
          '<span class="action-title">Share</span>' +
        '</button>' +
      '</div>' +

      '</article>'
    );
  }

  /* ── render ── */

  function renderPosts(posts) {
    feed.querySelectorAll('.post-card').forEach(function (el) { el.remove(); });
    if (loader) loader.style.display = 'none';

    if (!posts || posts.length === 0) {
      var empty = document.createElement('p');
      empty.className    = 'feed-empty';
      empty.textContent  = 'No stories yet. Be the first to share yours.';
      empty.style.cssText = 'text-align:center;color:#888;padding:40px 0;font-size:15px;';
      feed.insertBefore(empty, loader);
      return;
    }

    var fragment = document.createDocumentFragment();
    posts.forEach(function (post) {
      var tmp = document.createElement('div');
      tmp.innerHTML = buildPostCard(post);
      while (tmp.firstChild) fragment.appendChild(tmp.firstChild);
    });
    feed.insertBefore(fragment, loader);
  }

  /* ── fetch ── */

  if (loader) loader.style.display = 'flex';

  db.from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .then(function (result) {
      if (result.error) {
        console.error('Supabase fetch error:', result.error);
        if (loader) loader.style.display = 'none';
        return;
      }
      renderPosts(result.data);
    });

  /* ── delete post handler ── */

  document.addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-action-delete]');
    if (!delBtn) return;

    var postId = delBtn.getAttribute('data-action-delete');
    if (!postId) return;

    closeAllPostMenus();

    if (!confirm('Delete this post? This cannot be undone.')) return;

    db.from('posts').delete().eq('id', postId).then(function (result) {
      if (result.error) {
        alert('Could not delete: ' + result.error.message);
        return;
      }
      var card = delBtn.closest('.post-card');
      if (card) card.remove();
    });
  });
})();
