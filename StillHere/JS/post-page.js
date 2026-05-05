'use strict';

(function () {

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
    if (diff < 3600)  return Math.floor(diff / 60)  + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg || 'Done';
    t.classList.add('is-visible');
    setTimeout(function () { t.classList.remove('is-visible'); }, 2200);
  }

  function showError(msg) {
    var state   = document.getElementById('post-state');
    var spinner = state && state.querySelector('.spinner');
    var stateMsg = document.getElementById('post-state-msg');
    if (spinner) spinner.style.display = 'none';
    if (stateMsg) stateMsg.textContent = msg || 'Something went wrong.';
  }

  /* ── get post ID from URL ── */

  var params = new URLSearchParams(window.location.search);
  var postId = params.get('id');

  if (!postId) {
    showError('No post ID in URL. Go back to the feed.');
    return;
  }

  /* ── check Supabase config ── */

  var sbUrl = window.SH_SUPABASE_URL;
  var sbKey = window.SH_SUPABASE_KEY;

  if (!sbUrl || sbUrl.indexOf('YOUR_PROJECT_ID') !== -1 || !window.supabase) {
    showError('Database not configured.');
    return;
  }

  var db = window.supabase.createClient(sbUrl, sbKey);

  /* ── tag HTML builders ── */

  var NO_ADVICE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 256 256" fill="currentColor">' +
    '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.56,87.56,0,0,1-20.41,56.28L71.72,60.4A88,88,0,0,1,216,128Z' +
    'M40,128A87.56,87.56,0,0,1,60.41,71.72L184.28,195.6A88,88,0,0,1,40,128Z"/></svg>';

  var NEED_SUPPORT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 256 256" fill="currentColor">' +
    '<path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129' +
    'a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40Z"/></svg>';

  function buildTagsHtml(post) {
    var html = '';
    html += '<span class="tag tag-lang">' + escHtml((post.lang || 'en').toUpperCase()) + '</span>';
    (post.topics || []).forEach(function (t) {
      html += '<span class="tag tag-topic">' + escHtml(t.charAt(0).toUpperCase() + t.slice(1)) + '</span>';
    });
    if (post.mode === 'no-advice') {
      html += '<span class="tag tag-need-support">' + NO_ADVICE_SVG + ' No Advice</span>';
    } else {
      html += '<span class="tag tag-need-support">' + NEED_SUPPORT_SVG + ' Need Support</span>';
    }
    return html;
  }

  /* ── populate page ── */

  function renderPost(post) {
    /* page title */
    document.title = (post.title || 'Story') + ' – StillHere';

    /* post title */
    var titleEl = document.getElementById('post-title');
    if (titleEl) titleEl.textContent = post.title || '(no title)';

    /* post body — split on blank lines into paragraphs */
    var bodyEl = document.getElementById('post-body');
    if (bodyEl) {
      var paragraphs = (post.content || '').split(/\n\s*\n/);
      var bodyHtml = paragraphs.map(function (p) {
        return '<p>' + escHtml(p.trim()) + '</p>';
      }).join('');

      /* media gallery */
      var urls = post.media_urls;
      if (urls && urls.length) {
        bodyHtml += '<div class="post-media-gallery">';
        urls.forEach(function (url) {
          var isVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
          if (isVideo) {
            bodyHtml +=
              '<div class="post-gallery-item post-gallery-item--video">' +
                '<video src="' + escHtml(url) + '" controls preload="metadata" ' +
                  'class="post-gallery-media"></video>' +
              '</div>';
          } else {
            bodyHtml +=
              '<div class="post-gallery-item">' +
                '<a href="' + escHtml(url) + '" target="_blank" rel="noopener">' +
                  '<img src="' + escHtml(url) + '" class="post-gallery-media" alt="" loading="lazy">' +
                '</a>' +
              '</div>';
          }
        });
        bodyHtml += '</div>';
      }

      bodyEl.innerHTML = bodyHtml;
    }

    /* time */
    var timeEl = document.getElementById('post-time');
    if (timeEl) timeEl.textContent = timeAgo(post.created_at);

    /* header tags */
    var headerTags = document.getElementById('post-header-tags');
    if (headerTags) headerTags.innerHTML = buildTagsHtml(post);

    /* sidebar tags */
    var sidebarTags = document.getElementById('sidebar-tags');
    if (sidebarTags) sidebarTags.innerHTML = buildTagsHtml(post);

    /* sidebar posted time */
    var postedEl = document.getElementById('sidebar-posted');
    if (postedEl) {
      var d = new Date(post.created_at);
      postedEl.textContent = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    /* show content, hide loader */
    var state   = document.getElementById('post-state');
    var page    = document.getElementById('post-page');
    if (state)  state.style.display  = 'none';
    if (page)   page.style.display   = '';
  }

  /* ── fetch post ── */

  db.from('posts')
    .select('*')
    .eq('id', postId)
    .single()
    .then(function (result) {
      if (result.error || !result.data) {
        showError('Post not found. It may have been deleted.');
        return;
      }
      renderPost(result.data);
    });

  /* ── options dropdown toggle ── */

  var optionsBtn      = document.getElementById('optionsBtn');
  var optionsDropdown = document.getElementById('optionsDropdown');

  if (optionsBtn && optionsDropdown) {
    optionsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = optionsDropdown.classList.toggle('is-open');
      optionsBtn.setAttribute('aria-expanded', String(open));
    });
    optionsDropdown.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () {
      optionsDropdown.classList.remove('is-open');
      optionsBtn.setAttribute('aria-expanded', 'false');
    });
  }

  /* ── copy link ── */

  function copyLink() {
    navigator.clipboard && navigator.clipboard.writeText(window.location.href)
      .then(function () { showToast('Link copied'); });
  }

  var copyBtn  = document.getElementById('copyLinkBtn');
  var copyBtn2 = document.getElementById('copyLinkBtn2');
  if (copyBtn)  copyBtn.addEventListener('click',  copyLink);
  if (copyBtn2) copyBtn2.addEventListener('click', copyLink);

  /* ── heart / support button ── */

  var heartBtn = document.getElementById('heartBtn');
  if (heartBtn) {
    heartBtn.addEventListener('click', function () {
      var pressed = heartBtn.getAttribute('aria-pressed') === 'true';
      heartBtn.setAttribute('aria-pressed', String(!pressed));
      heartBtn.classList.toggle('is-active', !pressed);
    });
  }

  /* ── comment form (local-only for now) ── */

  var commentForm = document.getElementById('commentForm');
  var commentList = document.getElementById('comment-list');
  var commentCount = document.getElementById('comments-count');
  var sidebarReplies = document.getElementById('sidebar-replies');
  var count = 0;

  if (commentForm) {
    commentForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var ta   = document.getElementById('compose-textarea');
      var text = (ta ? ta.value : '').trim();
      if (!text) return;

      count++;
      if (commentCount)    commentCount.textContent    = String(count);
      if (sidebarReplies)  sidebarReplies.textContent  = String(count);

      var li = document.createElement('li');
      li.className = 'comment-item';
      li.innerHTML =
        '<article class="comment-card">' +
          '<header class="comment-header">' +
            '<div class="comment-avatar comment-avatar--anon" aria-hidden="true">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor">' +
              '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0Z' +
              'M96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/>' +
              '</svg>' +
            '</div>' +
            '<div class="comment-meta">' +
              '<span class="comment-author">Anonymous</span>' +
              '<span class="comment-time">just now</span>' +
            '</div>' +
          '</header>' +
          '<p class="comment-body">' + escHtml(text) + '</p>' +
        '</article>';

      if (commentList) commentList.appendChild(li);
      if (ta) { ta.value = ''; ta.focus(); }
    });
  }

})();
