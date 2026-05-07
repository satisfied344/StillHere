'use strict';

(function () {

  /* ── helpers ── */

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
    setTimeout(function () { t.classList.remove('is-visible'); }, 2800);
  }

  function showError(msg) {
    var state    = document.getElementById('post-state');
    var spinner  = state && state.querySelector('.spinner');
    var stateMsg = document.getElementById('post-state-msg');
    if (spinner)  spinner.style.display  = 'none';
    if (stateMsg) stateMsg.textContent   = msg || 'Something went wrong.';
  }

  /* ── custom confirm modal ── */
  var _confirmCallback = null;

  (function wireConfirmModal() {
    var backdrop  = document.getElementById('delBackdrop');
    var btnOk     = document.getElementById('delConfirm');
    var btnCancel = document.getElementById('delCancel');
    if (!backdrop || !btnOk || !btnCancel) return;

    function close() {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
      _confirmCallback = null;
    }

    btnOk.addEventListener('click', function () {
      var cb = _confirmCallback;
      close();
      if (cb) cb();
    });

    btnCancel.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop.classList.contains('is-open')) close();
    });
  })();

  function showConfirm(callback) {
    var backdrop = document.getElementById('delBackdrop');
    if (!backdrop) { if (callback) callback(); return; }
    _confirmCallback = callback;
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    var btnOk = document.getElementById('delConfirm');
    if (btnOk) setTimeout(function () { btnOk.focus(); }, 50);
  }

  /* safe HTML */
  function safeHtml(html) {
    if (window.DOMPurify) return DOMPurify.sanitize(html);
    return html;
  }

  function contentToHtml(raw) {
    if (!raw) return '';
    var trimmed = raw.trim();
    if (trimmed.startsWith('<')) return safeHtml(trimmed);
    return trimmed.split(/\n\s*\n/).map(function (p) {
      return '<p>' + p.trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;') + '</p>';
    }).join('');
  }

  /* ── URL params ── */

  var params = new URLSearchParams(window.location.search);
  var postId = params.get('id');

  if (!postId) { showError('No post ID in URL.'); return; }

  var sbUrl = window.SH_SUPABASE_URL;
  var sbKey = window.SH_SUPABASE_KEY;
  if (!sbUrl || sbUrl.indexOf('YOUR_PROJECT_ID') !== -1 || !window.supabase) {
    showError('Database not configured.');
    return;
  }

  var db = window.supabase.createClient(sbUrl, sbKey);

  /* ── tag HTML ── */

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
    html += '<span class="tag tag-lang">' + (post.lang || 'en').toUpperCase() + '</span>';
    (post.topics || []).forEach(function (t) {
      html += '<span class="tag tag-topic">' + t.charAt(0).toUpperCase() + t.slice(1) + '</span>';
    });
    if (post.mode === 'no-advice') {
      html += '<span class="tag tag-need-support">' + NO_ADVICE_SVG + ' No Advice</span>';
    } else {
      html += '<span class="tag tag-need-support">' + NEED_SUPPORT_SVG + ' Need Support</span>';
    }
    return html;
  }

  /* ── renderPost ── */

  function renderPost(post) {
    document.title = (post.title || 'Story') + ' – StillHere';

    var titleEl = document.getElementById('post-title');
    if (titleEl) titleEl.textContent = post.title || '(no title)';

    var bodyEl = document.getElementById('post-body');
    if (bodyEl) {
      var bodyHtml = contentToHtml(post.content || '');
      var urls = post.media_urls;
      if (urls && urls.length) {
        bodyHtml += '<div class="post-media-gallery">';
        urls.forEach(function (url) {
          var isVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
          bodyHtml += isVideo
            ? '<div class="post-gallery-item post-gallery-item--video"><video src="' + url + '" controls preload="metadata" class="post-gallery-media"></video></div>'
            : '<div class="post-gallery-item"><a href="' + url + '" target="_blank" rel="noopener"><img src="' + url + '" class="post-gallery-media" alt="" loading="lazy"></a></div>';
        });
        bodyHtml += '</div>';
      }
      bodyEl.innerHTML = bodyHtml;
    }

    var timeEl = document.getElementById('post-time');
    if (timeEl) timeEl.textContent = timeAgo(post.created_at);

    var headerTags = document.getElementById('post-header-tags');
    if (headerTags) headerTags.innerHTML = buildTagsHtml(post);

    var sidebarTags = document.getElementById('sidebar-tags');
    if (sidebarTags) sidebarTags.innerHTML = buildTagsHtml(post);

    var postedEl = document.getElementById('sidebar-posted');
    if (postedEl) {
      var d = new Date(post.created_at);
      postedEl.textContent = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    var deleteBtn = document.getElementById('deletePostBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        if (optionsDropdown) optionsDropdown.classList.remove('is-open');
        showConfirm(function () {
          db.from('posts').delete().eq('id', postId).then(function (res) {
            if (res.error) { showToast('Error: ' + res.error.message); return; }
            window.location.href = 'main.html';
          });
        });
      });
    }

    var state = document.getElementById('post-state');
    var page  = document.getElementById('post-page');
    if (state) state.style.display = 'none';
    if (page)  page.style.display  = '';
  }

  /* ── fetch post ── */

  db.from('posts').select('*').eq('id', postId).single().then(function (result) {
    if (result.error || !result.data) {
      showError('Post not found. It may have been deleted.');
      return;
    }
    renderPost(result.data);
    loadComments();
  });

  /* ── post options dropdown ── */

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

  /* ── heart ── */

  var heartBtn = document.getElementById('heartBtn');
  if (heartBtn) {
    heartBtn.addEventListener('click', function () {
      var pressed   = heartBtn.getAttribute('aria-pressed') === 'true';
      var nowActive = !pressed;
      heartBtn.setAttribute('aria-pressed', String(nowActive));
      heartBtn.classList.toggle('is-active', nowActive);
      db.rpc(nowActive ? 'increment_support' : 'decrement_support', { post_id: postId });
    });
  }

  /* ═══════════════════════════════════════════
     COMMENTS — threaded, with inline reply form
     ═══════════════════════════════════════════ */

  /* Main compose Quill */
  var commentQuill = null;
  var commentEditorEl = document.getElementById('comment-editor');
  if (commentEditorEl && window.Quill) {
    commentQuill = new Quill('#comment-editor', {
      theme: 'snow',
      placeholder: 'write here…',
      modules: {
        toolbar: [
          ['bold', 'italic'],
          ['link', 'blockquote'],
          [{ list: 'bullet' }]
        ]
      }
    });
  }

  /* ── SVG constants ── */

  var DOTS_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor">' +
    '<path d="M128,96a32,32,0,1,0,32,32A32,32,0,0,0,128,96Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,128,144Z' +
    'M48,96a32,32,0,1,0,32,32A32,32,0,0,0,48,96Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,48,144Z' +
    'M208,96a32,32,0,1,0,32,32A32,32,0,0,0,208,96Zm0,48a16,16,0,1,1,16-16A16,16,0,0,1,208,144Z"/></svg>';

  var COPY_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
    '<path d="M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0' +
    'a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23Z' +
    'M109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96' +
    'a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z"/></svg>';

  var TRASH_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
    '<path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16Z' +
    'M96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/></svg>';

  var AVATAR_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor">' +
    '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0Z' +
    'M96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/>' +
    '</svg>';

  /* ── build one comment <li> ── */

  function buildCommentLi(c, isReply) {
    var cid = c.id;
    var li  = document.createElement('li');
    li.className = 'comment-item' + (isReply ? ' comment-item--reply' : '');
    li.id = 'comment-' + cid;

    li.innerHTML =
      '<article class="comment-card' + (isReply ? ' comment-card--reply' : '') + '">' +
        '<header class="comment-header">' +
          '<div class="comment-avatar comment-avatar--anon" aria-hidden="true">' + AVATAR_SVG + '</div>' +
          '<div class="comment-meta">' +
            '<span class="comment-author">Anonymous</span>' +
            '<span class="comment-time">' + timeAgo(c.created_at) + '</span>' +
          '</div>' +
          '<div class="post-actions-menu">' +
            '<button class="button-icon post-menu-trigger" data-cdropdown="' + cid + '" aria-label="Comment options">' +
              DOTS_SVG +
            '</button>' +
            '<ul class="post-menu-down" id="cdrop-' + cid + '" role="menu">' +
              '<li role="none"><button type="button" data-comment-copy="' + cid + '">' + COPY_SVG + 'Copy link</button></li>' +
              '<li role="none" class="post-menu-divider" aria-hidden="true"></li>' +
              '<li role="none"><button type="button" class="menu-item-danger" data-comment-delete="' + cid + '">' + TRASH_SVG + 'Delete</button></li>' +
            '</ul>' +
          '</div>' +
        '</header>' +
        '<div class="comment-body ql-editor" id="cbody-' + cid + '">' + safeHtml(c.content) + '</div>' +
        (!isReply
          ? '<footer class="comment-actions">' +
              '<button type="button" class="reply-btn" data-reply-to="' + cid + '">Reply</button>' +
            '</footer>'
          : '') +
      '</article>';

    return li;
  }

  /* ── renderComments — builds threaded tree ── */

  function renderComments(comments) {
    var list      = document.getElementById('comment-list');
    var countEl   = document.getElementById('comments-count');
    var supportEl = document.getElementById('sidebar-support');
    if (!list) return;

    /* detach inline reply form before wiping the list */
    if (_replyTarget) closeReplyForm();

    list.innerHTML = '';

    var n = comments.length;
    if (countEl)   countEl.textContent   = String(n);
    if (supportEl) supportEl.textContent = String(n);

    if (n === 0) {
      var empty = document.createElement('li');
      empty.className = 'comment-empty';
      empty.textContent = 'No replies yet — be the first to respond.';
      list.appendChild(empty);
      return;
    }

    /* build parent → children map */
    var topLevel = [];
    var childMap = {};

    comments.forEach(function (c) {
      if (!c.parent_id) {
        topLevel.push(c);
      } else {
        if (!childMap[c.parent_id]) childMap[c.parent_id] = [];
        childMap[c.parent_id].push(c);
      }
    });

    /* render top-level + their replies */
    topLevel.forEach(function (c) {
      var li = buildCommentLi(c, false);

      var children = childMap[c.id] || [];
      if (children.length > 0) {
        var ul = document.createElement('ul');
        ul.className = 'replies-list';
        children.forEach(function (child) {
          ul.appendChild(buildCommentLi(child, true));
        });
        li.appendChild(ul);
      }

      list.appendChild(li);
    });
  }

  /* ═══════════════════════════════
     Inline reply form (one shared)
     ═══════════════════════════════ */

  var _replyForm   = null;
  var _replyQuill  = null;
  var _replyTarget = null; /* parent comment UUID */

  function getReplyForm() {
    if (_replyForm) return _replyForm;

    /* build HTML — Quill needs a real DOM node, not innerHTML */
    var div = document.createElement('div');
    div.className = 'inline-reply-form';

    var wrap = document.createElement('div');
    wrap.className = 'inline-reply-quill-wrap';

    var editorDiv = document.createElement('div');
    editorDiv.className = 'inline-reply-editor';

    wrap.appendChild(editorDiv);
    div.appendChild(wrap);

    var actions = document.createElement('div');
    actions.className = 'inline-reply-actions';
    actions.innerHTML =
      '<button type="button" class="irep-cancel">Cancel</button>' +
      '<button type="button" class="irep-submit">Post reply</button>';
    div.appendChild(actions);

    /* attach to body (hidden) so Quill can measure / init properly */
    div.style.cssText = 'visibility:hidden;position:absolute;left:-9999px;';
    document.body.appendChild(div);

    _replyQuill = new Quill(editorDiv, {
      theme: 'snow',
      placeholder: 'Write a reply…',
      modules: {
        toolbar: [
          ['bold', 'italic'],
          ['blockquote']
        ]
      }
    });

    actions.querySelector('.irep-cancel').addEventListener('click', closeReplyForm);
    actions.querySelector('.irep-submit').addEventListener('click', submitInlineReply);

    _replyForm = div;
    return div;
  }

  function openReplyForm(parentCid) {
    var form     = getReplyForm();
    _replyTarget = parentCid;

    var commentLi = document.getElementById('comment-' + parentCid);
    if (!commentLi) return;

    /* detach from old location (body or previous comment) */
    if (form.parentNode) form.parentNode.removeChild(form);

    /* restore normal positioning */
    form.style.cssText = '';

    /* insert before replies-list if it exists, else at end of the li */
    var repliesList = commentLi.querySelector('.replies-list');
    if (repliesList) {
      commentLi.insertBefore(form, repliesList);
    } else {
      commentLi.appendChild(form);
    }

    _replyQuill.setContents([]);
    _replyQuill.focus();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeReplyForm() {
    if (!_replyForm) return;
    /* move back to body, hidden */
    if (_replyForm.parentNode) _replyForm.parentNode.removeChild(_replyForm);
    _replyForm.style.cssText = 'visibility:hidden;position:absolute;left:-9999px;';
    document.body.appendChild(_replyForm);
    _replyTarget = null;
  }

  function submitInlineReply() {
    if (!_replyTarget || !_replyQuill) return;

    var plainText = _replyQuill.getText().trim();
    if (!plainText) { _replyQuill.focus(); return; }

    var html      = _replyQuill.root.innerHTML;
    var parentCid = _replyTarget;
    var btn       = _replyForm.querySelector('.irep-submit');

    // Find or create mod-error container inside reply form
    var replyModErr = _replyForm.querySelector('.mod-error-wrap');
    if (!replyModErr) {
      replyModErr = document.createElement('div');
      replyModErr.className = 'mod-error-wrap';
      replyModErr.style.display = 'none';
      btn.parentNode.insertBefore(replyModErr, btn);
    }
    if (window.SH_MOD) window.SH_MOD.clearError(replyModErr);

    btn.disabled    = true;
    btn.textContent = 'Checking…';

    Promise.resolve(
      window.SH_MOD ? window.SH_MOD.check(plainText, 'reply') : { allowed: true }
    ).then(function (mod) {
      if (!mod.allowed) {
        btn.disabled    = false;
        btn.textContent = 'Post reply';
        if (window.SH_MOD) window.SH_MOD.showBlock(replyModErr, mod);
        if (mod.banned) btn.disabled = true;
        return;
      }

      btn.textContent = 'Posting…';

      db.from('comments').insert({
        post_id:   postId,
        parent_id: parentCid,
        content:   safeHtml(html)
      }).then(function (res) {
        btn.disabled    = false;
        btn.textContent = 'Post reply';

        if (res.error) {
          console.error('Reply insert error:', res.error);
          showToast('Error: ' + (res.error.message || 'Could not post reply'));
          return;
        }

        db.rpc('increment_comment', { post_id: postId });
        closeReplyForm();
        loadComments();
      });
    });
  }

  /* ── comment menu open/close ── */

  function closeAllCommentMenus() {
    document.querySelectorAll('[id^="cdrop-"].show').forEach(function (d) {
      d.classList.remove('show');
    });
  }

  document.addEventListener('click', function (e) {
    /* 3-dot button toggle */
    var cdropBtn = e.target.closest('[data-cdropdown]');
    if (cdropBtn) {
      e.stopPropagation();
      var cid      = cdropBtn.getAttribute('data-cdropdown');
      var dropdown = document.getElementById('cdrop-' + cid);
      if (!dropdown) return;
      var wasOpen = dropdown.classList.contains('show');
      closeAllCommentMenus();
      if (!wasOpen) dropdown.classList.add('show');
      return;
    }

    /* click outside any open menu */
    if (!e.target.closest('[id^="cdrop-"]')) closeAllCommentMenus();
  });

  /* ── Reply button → inline form ── */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-reply-to]');
    if (!btn) return;
    var cid = btn.getAttribute('data-reply-to');

    /* if form already open for this comment, close it instead */
    if (_replyTarget === cid && _replyForm && _replyForm.parentNode) {
      closeReplyForm();
      return;
    }

    openReplyForm(cid);
  });

  /* ── comment copy link ── */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-comment-copy]');
    if (!btn) return;
    var cid = btn.getAttribute('data-comment-copy');
    var url = window.location.href.split('#')[0] + '#comment-' + cid;
    if (navigator.clipboard) navigator.clipboard.writeText(url)
      .then(function () { showToast('Link copied'); });
    closeAllCommentMenus();
  });

  /* ── comment delete ── */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-comment-delete]');
    if (!btn) return;
    var cid = btn.getAttribute('data-comment-delete');
    closeAllCommentMenus();

    showConfirm(function () {
      db.from('comments').delete().eq('id', cid).then(function (res) {
        if (res.error) {
          console.error('Comment delete error:', res.error);
          showToast('Error: ' + (res.error.message || 'Could not delete comment'));
          return;
        }
        db.rpc('decrement_comment', { post_id: postId });
        loadComments();
      });
    });
  });

  /* ── load comments ── */

  function loadComments() {
    db.from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(function (result) {
        if (result.error) {
          console.error('Comments load error:', result.error);
          showToast('Could not load comments');
          return;
        }
        renderComments(result.data || []);
      });
  }

  /* ── submit top-level comment ── */

  var submitBtn = document.getElementById('commentSubmitBtn');
  if (submitBtn) {
    // Inject mod-error container right above the submit button
    var commentModErr = document.createElement('div');
    commentModErr.className = 'mod-error-wrap';
    commentModErr.style.display = 'none';
    submitBtn.parentNode.insertBefore(commentModErr, submitBtn);

    var REPLY_ICON =
      'Reply <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
      '<path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"/></svg>';

    submitBtn.addEventListener('click', function () {
      if (!commentQuill) return;

      var plainText = commentQuill.getText().trim();
      if (!plainText) { commentQuill.focus(); return; }

      var html = commentQuill.root.innerHTML;

      if (window.SH_MOD) window.SH_MOD.clearError(commentModErr);

      submitBtn.disabled = true;
      submitBtn.textContent = 'Checking…';

      Promise.resolve(
        window.SH_MOD ? window.SH_MOD.check(plainText, 'comment') : { allowed: true }
      ).then(function (mod) {
        if (!mod.allowed) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = REPLY_ICON;
          if (window.SH_MOD) window.SH_MOD.showBlock(commentModErr, mod);
          if (mod.banned) submitBtn.disabled = true;
          return;
        }

        submitBtn.textContent = 'Sending…';

        db.from('comments').insert({ post_id: postId, content: html }).then(function (result) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = REPLY_ICON;

          if (result.error) {
            console.error('Comment insert error:', result.error);
            showToast('Error: ' + (result.error.message || 'Could not post comment'));
            return;
          }

          db.rpc('increment_comment', { post_id: postId });
          commentQuill.setContents([]);
          loadComments();
        });
      });
    });
  }

})();
