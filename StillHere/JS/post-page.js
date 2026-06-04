'use strict';

(function () {

  /* ── helpers ── */

  /* Tiny i18n lookup — defers to SH_I18N when ready, else falls
     back to the English literal. Used everywhere we render a
     user-visible string from JS (toasts, errors, dynamic labels). */
  function t(key, fallback) {
    return (window.SH_I18N && window.SH_I18N.t)
      ? (window.SH_I18N.t(key) || fallback)
      : fallback;
  }

  function timeAgo(iso) {
    var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    var tt = function (k, fb) { return (window.SH_I18N && window.SH_I18N.t(k)) || fb; };
    if (diff < 60)    return tt('time.now', 'just now');
    if (diff < 3600)  return Math.floor(diff / 60)  + tt('time.m', ' min ago');
    if (diff < 86400) return Math.floor(diff / 3600) + tt('time.h', 'h ago');
    return Math.floor(diff / 86400) + tt('time.d', 'd ago');
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

  if (!postId) { showError(t('post.err.noid', 'No post ID in URL.')); return; }

  var sbUrl = window.SH_SUPABASE_URL;
  var sbKey = window.SH_SUPABASE_KEY;
  if (!sbUrl || sbUrl.indexOf('YOUR_PROJECT_ID') !== -1 || !window.supabase) {
    showError(t('post.err.dbcfg', 'Database not configured.'));
    return;
  }

  // Reuse the shared client to avoid "Multiple GoTrueClient instances" warning.
  // moderation.js creates window.__shSharedSupabase on first load; fall back to
  // window._sbClient (set by session.js / u-page.js), then create once and store.
  if (!window._sbClient) {
    window._sbClient = window.supabase.createClient(sbUrl, sbKey);
  }
  var db = window._sbClient;

  /* ── current user + post author ─────────────────────────────
     Populated when the post is fetched. Used to:
       • show "Author" badge on comments by the post author
       • hide the post-delete option for non-authors
       • hide the comment-delete option on comments not yours
     ─────────────────────────────────────────────────────────── */
  var _currentUserId = null;
  var _postAuthorId  = null;
  var _postAuthorProfile = null; // { display_name, username, avatar_url }

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
      var topicLabel = (window.SH_I18N && window.SH_I18N.t('main.side.topic.' + t));
      if (!topicLabel || topicLabel === 'main.side.topic.' + t) {
        topicLabel = t.charAt(0).toUpperCase() + t.slice(1);
      }
      html += '<span class="tag tag-topic tag-topic-' + t + '">' + topicLabel + '</span>';
    });
    if (post.mode === 'no-advice') {
      var naTip = window.SH_I18N
        ? window.SH_I18N.t('main.tooltip.noadvice')
        : 'they asked for presence, not advice.';
      /* HTML-escape the tooltip text since it lands in two attributes. */
      var naTipEsc = String(naTip)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      html += '<span class="tag tag-need-support tag-no-advice"' +
        ' tabindex="0" role="note"' +
        ' aria-label="' + naTipEsc + '"' +
        ' data-presence-tooltip="' + naTipEsc + '">' +
        NO_ADVICE_SVG + ' ' + ((window.SH_I18N && window.SH_I18N.t('main.filter.noadvice')) || 'No Advice') + '</span>';
    } else {
      html += '<span class="tag tag-need-support">' + NEED_SUPPORT_SVG + ' ' +
        ((window.SH_I18N && window.SH_I18N.t('main.filter.need')) || 'Need Support') + '</span>';
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
          var safeUrl = escAttr(url);   // never interpolate a raw URL into an attribute
          bodyHtml += isVideo
            ? '<div class="post-gallery-item post-gallery-item--video"><video src="' + safeUrl + '" controls playsinline preload="metadata" class="post-gallery-media"></video></div>'
            // No <a> wrapper — click is caught by SH_LIGHTBOX, which
            // opens an in-page modal instead of navigating away.
            : '<div class="post-gallery-item" data-lightbox><img src="' + safeUrl + '" class="post-gallery-media" alt="" loading="lazy"></div>';
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

    /* Show author name (or Anonymous if unattributed). When we have a
       real username, render it as a link to their public profile. */
    var authorNameEl = document.querySelector('.post-author-name');
    var uname = _postAuthorProfile && _postAuthorProfile.username;
    if (authorNameEl) {
      var name = _postAuthorProfile
        ? (_postAuthorProfile.display_name || _postAuthorProfile.username || 'Anonymous')
        : 'Anonymous';
      if (uname) {
        authorNameEl.innerHTML = '';
        var a = document.createElement('a');
        a.className = 'post-author-link';
        a.href = 'u?u=' + encodeURIComponent(uname);
        a.textContent = name;
        authorNameEl.appendChild(a);
      } else {
        authorNameEl.textContent = name;
      }
    }

    /* Post header avatar — swap default anon SVG for the author's
       avatar_url (when present), and wrap the whole tile in an <a>
       linking to their public profile so the avatar is clickable
       too (matches the main feed). */
    var headerAvatar = document.querySelector('.post-author-row .post-avatar');
    if (headerAvatar && _postAuthorProfile) {
      var avatarInner = _postAuthorProfile.avatar_url
        ? '<img src="' + _postAuthorProfile.avatar_url + '" alt="Avatar" class="post-avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover">'
        : headerAvatar.innerHTML;
      if (uname) {
        var displayName = _postAuthorProfile.display_name || _postAuthorProfile.username;
        var wrapper = document.createElement('a');
        wrapper.className = 'post-avatar post-avatar-link';
        wrapper.href = 'u?u=' + encodeURIComponent(uname);
        wrapper.setAttribute('aria-label', displayName);
        wrapper.innerHTML = avatarInner;
        headerAvatar.parentNode.replaceChild(wrapper, headerAvatar);
      } else if (_postAuthorProfile.avatar_url) {
        headerAvatar.innerHTML = avatarInner;
      }
    }

    /* Only the author can edit or delete their post — hide both for everyone else. */
    var deleteBtn = document.getElementById('deletePostBtn');
    var editBtn   = document.getElementById('editPostBtn');
    var ownerDiv  = document.getElementById('postOwnerDivider');
    var canEdit = _currentUserId && _postAuthorId && _currentUserId === _postAuthorId;
    if (!canEdit) {
      if (deleteBtn) deleteBtn.style.display = 'none';
      if (editBtn)   editBtn.style.display = 'none';
      if (ownerDiv)  ownerDiv.style.display = 'none';
    } else {
      if (editBtn) {
        editBtn.addEventListener('click', function () {
          if (optionsDropdown) optionsDropdown.classList.remove('is-open');
          window.location.href = 'create-post?edit=' + encodeURIComponent(postId);
        });
      }
      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          if (optionsDropdown) optionsDropdown.classList.remove('is-open');
          showConfirm(function () {
            db.from('posts').delete().eq('id', postId).then(function (res) {
              if (res.error) { showToast('Error: ' + res.error.message); return; }
              window.location.href = 'main';
            });
          });
        });
      }
    }

    var state = document.getElementById('post-state');
    var page  = document.getElementById('post-page');
    if (state) state.style.display = 'none';
    if (page)  page.style.display  = '';
  }

  /* ── fetch post ── */

  // Wait for both the auth check and the post fetch before rendering so we
  // know whether to show the delete button.
  // Uses a cascade of fallbacks in case the profiles join or other columns fail.
  var _authRes = null;

  var FETCH_PASSES = [
    '*, profiles(username, display_name, avatar_url)',
    '*, profiles(username, display_name)',
    '*',
  ];

  function doFetchPost(pass) {
    if (pass === undefined) pass = 0;
    var selectStr = FETCH_PASSES[pass] || '*';

    // Only call getUser once; reuse cached result on retries
    var authProm = _authRes
      ? Promise.resolve(_authRes)
      : db.auth.getUser().catch(function () { return { data: { user: null } }; });

    authProm.then(function (ar) {
      _authRes = ar;
      return db.from('posts').select(selectStr).eq('id', postId).single();
    }).then(function (postRes) {
      if (postRes.error) {
        if (pass < FETCH_PASSES.length - 1) {
          console.warn('Post fetch pass ' + pass + ' failed, retrying:', postRes.error.message);
          doFetchPost(pass + 1);
          return;
        }
        console.error('Post fetch failed on all passes:', postRes.error);
        /* Treat as a hard 404 — friendlier than a fragment with an
           error blob, and matches the URL semantics (the requested
           resource genuinely doesn't exist for this user). */
        location.replace('/404.html');
        return;
      }
      if (!postRes.data) {
        /* Treat as a hard 404 — friendlier than a fragment with an
           error blob, and matches the URL semantics (the requested
           resource genuinely doesn't exist for this user). */
        location.replace('/404.html');
        return;
      }

      _currentUserId = (_authRes && _authRes.data && _authRes.data.user) ? _authRes.data.user.id : null;
      _postAuthorId  = postRes.data.user_id || null;

      /* If the profiles join wasn't available (FK missing), fetch profile
         separately so we still get the author name and avatar. */
      if (postRes.data.profiles) {
        _postAuthorProfile = postRes.data.profiles;
        renderPost(postRes.data);
        loadComments();
      } else if (_postAuthorId) {
        db.from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', _postAuthorId)
          .maybeSingle()
          .then(function (pr) {
            _postAuthorProfile = (!pr.error && pr.data) ? pr.data : null;
            if (_postAuthorProfile) postRes.data.profiles = _postAuthorProfile;
            renderPost(postRes.data);
            loadComments();
          });
      } else {
        _postAuthorProfile = null;
        renderPost(postRes.data);
        loadComments();
      }
    }).catch(function (err) {
      console.error('doFetchPost unexpected error:', err);
      if (pass < FETCH_PASSES.length - 1) { doFetchPost(pass + 1); return; }
      showError(t('post.err.generic', 'Something went wrong. Please try again.'));
    });
  }

  doFetchPost(0);

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
      .then(function () { showToast(t('post.copylink.ok', 'Link copied')); });
  }

  var copyBtn  = document.getElementById('copyLinkBtn');
  var copyBtn2 = document.getElementById('copyLinkBtn2');
  if (copyBtn)  copyBtn.addEventListener('click',  copyLink);
  if (copyBtn2) copyBtn2.addEventListener('click', copyLink);

  /* ────────────────────────────────────────────────
     Liked + Saved posts — shared with main feed via localStorage
     ──────────────────────────────────────────────── */

  var _likedPosts = (function () {
    try { return new Set(JSON.parse(localStorage.getItem('sh_liked_posts') || '[]')); }
    catch (e) { return new Set(); }
  })();
  function _saveLiked() {
    try { localStorage.setItem('sh_liked_posts', JSON.stringify([..._likedPosts])); }
    catch (e) {}
  }

  var _savedPosts = (function () {
    try { return new Set(JSON.parse(localStorage.getItem('sh_saved_posts') || '[]')); }
    catch (e) { return new Set(); }
  })();
  function _saveSaved() {
    try { localStorage.setItem('sh_saved_posts', JSON.stringify([..._savedPosts])); }
    catch (e) {}
  }

  /* ── heart ── */

  var heartBtn = document.getElementById('heartBtn');
  if (heartBtn) {
    /* Calm presence label — i18n-aware. */
    var _setHeartLabel = function (active) {
      var label = window.SH_I18N
        ? window.SH_I18N.t(active ? 'main.post.support.active' : 'main.post.support')
        : (active ? 'here' : "I'm here");
      heartBtn.setAttribute('aria-label', label);
      heartBtn.setAttribute('title', label);
    };

    /* restore from localStorage */
    if (_likedPosts.has(postId)) {
      heartBtn.setAttribute('aria-pressed', 'true');
      heartBtn.classList.add('is-active');
    }
    _setHeartLabel(_likedPosts.has(postId));
    document.addEventListener('sh:langchange', function () {
      _setHeartLabel(heartBtn.getAttribute('aria-pressed') === 'true');
    });

    heartBtn.addEventListener('click', function () {
      var pressed   = heartBtn.getAttribute('aria-pressed') === 'true';
      var nowActive = !pressed;
      heartBtn.setAttribute('aria-pressed', String(nowActive));
      heartBtn.classList.toggle('is-active', nowActive);
      _setHeartLabel(nowActive);

      /* Presence pulse — re-trigger by removing class + forcing reflow. */
      heartBtn.classList.remove('is-pulsing');
      void heartBtn.offsetWidth;
      if (nowActive) heartBtn.classList.add('is-pulsing');
      setTimeout(function () { heartBtn.classList.remove('is-pulsing'); }, 600);

      /* Calm presence toast — UI only, RPC unchanged. */
      showToast(window.SH_I18N
        ? window.SH_I18N.t(nowActive ? 'main.toast.presence' : 'main.toast.presence.off')
        : (nowActive ? 'they know someone is here.' : 'okay — quietly stepping back.'));

      if (nowActive) _likedPosts.add(postId);
      else           _likedPosts.delete(postId);
      _saveLiked();
      /* Log RPC errors so a silent failure (RLS, stale schema, etc.)
         shows up in DevTools instead of vanishing. */
      db.rpc(nowActive ? 'increment_support' : 'decrement_support', { post_id: postId })
        .then(function (res) {
          if (res && res.error) console.warn('[support-rpc]', res.error.message);
        });
    });
  }

  /* ── Save Post button (in options dropdown) ── */

  var BOOKMARK_OUTLINE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
    '<path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Zm0,177.57-51.77-32.35a8,8,0,0,0-8.48,0L72,209.57V48H184Z"/></svg>';
  var BOOKMARK_FILLED_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
    '<path d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z"/></svg>';

  var savePostBtn = document.getElementById('savePostBtn');
  function refreshSaveBtn() {
    if (!savePostBtn) return;
    var isSaved = _savedPosts.has(postId);
    savePostBtn.classList.toggle('save-post-btn--saved', isSaved);
    savePostBtn.innerHTML =
      (isSaved ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG) +
      (isSaved ? t('post.menu.unsave', 'Unsave Post') : t('post.menu.save', 'Save Post'));
  }
  if (savePostBtn) {
    refreshSaveBtn();
    savePostBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isSaved = _savedPosts.has(postId);
      if (isSaved) {
        _savedPosts.delete(postId);
        showToast(t('post.toast.unsaved', 'Removed from saved'));
      } else {
        _savedPosts.add(postId);
        showToast(t('post.toast.saved', 'Post saved'));
      }
      _saveSaved();
      refreshSaveBtn();
      /* close dropdown */
      if (optionsDropdown) optionsDropdown.classList.remove('is-open');
      if (optionsBtn)      optionsBtn.setAttribute('aria-expanded', 'false');
    });
  }

  /* ── Report (post) — real report submitted via SH_MOD.report ── */
  document.addEventListener('click', async function (e) {
    var rbtn = e.target.closest('[data-action-report]');
    if (!rbtn) return;
    /* Skip if it's a comment report (handled separately below) */
    if (rbtn.hasAttribute('data-comment-report')) return;

    /* Close the menu immediately so the toast is visible */
    if (optionsDropdown) optionsDropdown.classList.remove('is-open');
    if (optionsBtn)      optionsBtn.setAttribute('aria-expanded', 'false');

    /* `postId` is defined at the top of the IIFE from URL params */
    if (!postId) { showToast('Cannot report — post id missing.'); return; }
    if (!window.SH_MOD || !window.SH_MOD.report) { showToast('Cannot report — moderation API not loaded.'); return; }

    showToast('Sending report…');
    try {
      var res = await window.SH_MOD.report('post', postId, null);

      if (!res || res.ok === false) {
        var err = (res && res.error) || 'unknown';
        if (err === 'already_reported') {
          showToast('You already reported this.');
        } else {
          showToast('Could not send report — ' + err);
          console.error('[report-post] full error response:', res);
        }
        return;
      }

      var msg = 'Thanks — report counted (weight ' + (res.weight_added || 1) + ').';
      if (res.new_state === 'ai_reviewing') msg = 'Thanks — flagged for AI review.';
      if (res.new_state === 'hidden')       msg = 'Thanks — hidden pending review.';
      if (res.new_state === 'shadow')       msg = 'Thanks — downranked while we look.';
      if (res.new_state === 'pending_manual') msg = 'Thanks — sent to manual review.';
      showToast(msg);
    } catch (ex) {
      console.error('[report-post] exception:', ex);
      showToast('Report failed: ' + (ex && ex.message ? ex.message : 'unknown error'));
    }
  });

  /* ═══════════════════════════════════════════
     COMMENTS — threaded, with inline reply form
     ═══════════════════════════════════════════ */

  /* Track image URLs inserted into the main compose editor (used at submit
     time for moderation, since Quill stores them inline in the HTML). */
  var commentInlineImageUrls = [];

  function uploadCommentImage(quill, urlList) {
    var input = document.createElement('input');
    input.type   = 'file';
    input.accept = 'image/*';
    /* iOS Safari zooms the viewport when a form control with a sub-16px
       computed font-size receives focus. The picker briefly focuses this
       input on tap, so force a 16px label to keep the page from zooming. */
    input.style.fontSize = '16px';
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;

      var range = quill.getSelection(true);
      quill.insertText(range.index, 'Uploading…', 'italic', true);

      // Compress (canvas → WebP/JPEG) then PUT to R2 via presigned URL.
      // Old path: db.storage.from('post-media').upload(...).
      window.SH_MEDIA.uploadToR2(file, { db: db }).then(function (url) {
        quill.deleteText(range.index, 'Uploading…'.length);
        if (urlList) urlList.push(url);
        quill.insertEmbed(range.index, 'image', url, Quill.sources.USER);
        quill.setSelection(range.index + 1, Quill.sources.SILENT);
      }).catch(function (err) {
        quill.deleteText(range.index, 'Uploading…'.length);
        showToast('Upload failed: ' + (err && err.message || err));
      });
    };
    input.click();
  }

  /* Scan a Quill editor for all embedded image URLs (used at submit time
     as a backup in case the upload-time tracker missed something). */
  function collectQuillImages(quill, tracked) {
    var urls = (tracked || []).slice();
    try {
      quill.getContents().ops.forEach(function (op) {
        if (op.insert && typeof op.insert === 'object') {
          var src = op.insert.image;
          if (typeof src === 'string' && src.indexOf('http') === 0 && urls.indexOf(src) === -1) {
            urls.push(src);
          }
        }
      });
    } catch (_) {}
    return urls;
  }

  /* Main compose Quill */
  var commentQuill = null;
  var commentEditorEl = document.getElementById('comment-editor');
  if (commentEditorEl && window.Quill) {
    commentQuill = new Quill('#comment-editor', {
      theme: 'snow',
      placeholder: 'write here…',
      modules: {
        toolbar: {
          container: [
            ['bold', 'italic'],
            ['link', 'blockquote', 'image'],
            [{ list: 'bullet' }]
          ],
          handlers: {
            image: function () { uploadCommentImage(commentQuill, commentInlineImageUrls); }
          }
        },
        /* Press Enter alone → submit the comment.
           Shift+Enter still inserts a newline (default Quill behavior). */
        keyboard: {
          bindings: {
            submitOnEnter: {
              key: 13,
              shiftKey: false,
              handler: function () {
                var btn = document.getElementById('commentSubmitBtn');
                if (btn && !btn.disabled) btn.click();
                return false; // prevent default newline
              }
            }
          }
        }
      }
    });
  }

  /* Inline reply image-url tracking (cleared every time the form opens) */
  var replyInlineImageUrls = [];

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

  var REPORT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
    '<path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9' +
    'a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72' +
    'L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"/></svg>';

  /* ── build one comment <li> ── */

  function escAttr(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function buildCommentLi(c, isReply) {
    var cid       = c.id;
    var commenterId = c.user_id || null;
    var isAuthor    = !!(commenterId && _postAuthorId && commenterId === _postAuthorId);
    var canDelete   = !!(_currentUserId && commenterId && _currentUserId === commenterId);
    var displayName = c.profiles
      ? (c.profiles.display_name || c.profiles.username || 'Anonymous')
      : 'Anonymous';
    var commenterUsername = c.profiles ? (c.profiles.username || null) : null;
    var commenterAvatar   = c.profiles ? (c.profiles.avatar_url || null) : null;

    var li  = document.createElement('li');
    li.className = 'comment-item' + (isReply ? ' comment-item--reply' : '');
    li.id = 'comment-' + cid;

    var menuItems = '<li role="none"><button type="button" data-comment-copy="' + cid + '">' + COPY_SVG + 'Copy link</button></li>';
    if (canDelete) {
      menuItems +=
        '<li role="none" class="post-menu-divider" aria-hidden="true"></li>' +
        '<li role="none"><button type="button" class="menu-item-danger" data-comment-delete="' + cid + '">' + TRASH_SVG + 'Delete</button></li>';
    }
    menuItems += '<li role="none"><button type="button" class="menu-item-report" data-comment-report="' + cid + '">' + REPORT_SVG + 'Report</button></li>';

    /* Render author name as a clickable link when a username is known. */
    var authorOpen  = commenterUsername
      ? '<a class="comment-author comment-author-link" href="u?u=' + encodeURIComponent(commenterUsername) + '">'
      : '<span class="comment-author">';
    var authorClose = commenterUsername ? '</a>' : '</span>';

    /* Build avatar tile — show profile picture when available, else anon SVG.
       Wrap in <a> to make it clickable (same pattern as main feed cards). */
    var avatarInner = commenterAvatar
      ? '<img src="' + escAttr(commenterAvatar) + '" alt="" class="comment-avatar-img" loading="lazy" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">'
      : AVATAR_SVG;
    var avatarHtml = commenterUsername
      ? '<a class="comment-avatar comment-avatar-link' + (commenterAvatar ? '' : ' comment-avatar--anon') + '" href="u?u=' + encodeURIComponent(commenterUsername) + '" aria-label="' + escAttr(displayName) + '\'s profile">' + avatarInner + '</a>'
      : '<div class="comment-avatar comment-avatar--anon" aria-hidden="true">' + avatarInner + '</div>';

    li.innerHTML =
      '<article class="comment-card' + (isReply ? ' comment-card--reply' : '') + (isAuthor ? ' comment-card--author' : '') + '">' +
        '<header class="comment-header">' +
          avatarHtml +
          '<div class="comment-meta">' +
            authorOpen + escAttr(displayName) +
              (isAuthor ? ' <span class="comment-author-badge" title="Original poster">Author</span>' : '') +
            authorClose +
            '<span class="comment-time">' + timeAgo(c.created_at) + '</span>' +
          '</div>' +
          '<div class="post-actions-menu">' +
            '<button class="button-icon post-menu-trigger" data-cdropdown="' + cid + '" aria-label="Comment options">' +
              DOTS_SVG +
            '</button>' +
            '<ul class="post-menu-down" id="cdrop-' + cid + '" role="menu">' +
              menuItems +
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

  /* Progressive batch sizes for comments: 10, +10, +15, +15, +20, then +20 forever */
  var COMMENTS_BATCH_SIZES = [10, 10, 15, 15, 20];
  function commentsNextSize(batchIndex) {
    return batchIndex < COMMENTS_BATCH_SIZES.length ? COMMENTS_BATCH_SIZES[batchIndex] : 20;
  }

  function renderComments(comments) {
    var list      = document.getElementById('comment-list');
    var countEl   = document.getElementById('comments-count');
    var supportEl = document.getElementById('sidebar-support');
    if (!list) return;

    /* detach inline reply form before wiping the list */
    if (_replyTarget) closeReplyForm();

    list.innerHTML = '';
    /* remove any previous "show more" button below the list */
    var prevBtn = document.getElementById('commentsLoadMoreBtn');
    if (prevBtn && prevBtn.parentNode) prevBtn.parentNode.removeChild(prevBtn);

    var n = comments.length;
    if (countEl)   countEl.textContent   = String(n);
    if (supportEl) supportEl.textContent = String(n);

    if (n === 0) {
      var empty = document.createElement('li');
      empty.className = 'comment-empty feed-empty--polished';
      empty.setAttribute('role', 'status');
      var t = function (k, fb) { return window.SH_I18N ? window.SH_I18N.t(k) : fb; };
      empty.innerHTML =
        '<p class="feed-empty__title">' + t('post.comments.emptyTitle', 'No replies yet') + '</p>' +
        '<p class="feed-empty__text">'  + t('post.comments.emptyText',  'be the first to respond — quietly is fine.') + '</p>';
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

    /* ── Pagination of top-level comments ──
       Progressive: first batch 10, then +10, +15, +15, +20, then +20 forever.
       Revealed via explicit "Show more replies" click. */
    var renderedCount = 0;
    var batchIndex    = 0;

    function renderNextBatch() {
      var size = commentsNextSize(batchIndex);
      var end  = Math.min(renderedCount + size, topLevel.length);
      /* Only animate-in batches AFTER the first paint of the comment list.
         The very first batch lands together with the post body, so let it
         appear instantly — no double-reveal. Subsequent batches (Show more
         replies) get the calm cascade. */
      var animate = batchIndex > 0;
      var newLis  = [];
      for (var i = renderedCount; i < end; i++) {
        var c = topLevel[i];
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
        if (animate) {
          li.classList.add('post-card--enter');
          newLis.push(li);
        }
        list.appendChild(li);
      }
      if (newLis.length) {
        requestAnimationFrame(function () {
          newLis.forEach(function (el, j) {
            var delay = Math.min(j, 6) * 70;
            setTimeout(function () { el.classList.add('is-in'); }, delay);
          });
        });
      }
      renderedCount = end;
      batchIndex++;
      syncBtn();
    }

    function syncBtn() {
      var hasMore = renderedCount < topLevel.length;
      if (!btn) return;
      btn.style.display = hasMore ? 'inline-flex' : 'none';
      if (hasMore) {
        var remaining = topLevel.length - renderedCount;
        var size      = commentsNextSize(batchIndex);
        var label     = btn.querySelector('span');
        if (label) {
          label.textContent = 'Show more replies' +
            (remaining > size ? ' (' + remaining + ' left)' : '');
        }
      }
    }

    /* "Show more replies" button below the list — explicit click only. */
    var btn = document.createElement('button');
    btn.id = 'commentsLoadMoreBtn';
    btn.type = 'button';
    btn.className = 'comments-load-more-btn';
    btn.innerHTML =
      '<span>Show more replies</span>' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
      '<path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/></svg>';
    btn.style.display = 'none';
    btn.addEventListener('click', renderNextBatch);
    if (list.parentNode) list.parentNode.insertBefore(btn, list.nextSibling);

    renderNextBatch();
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
        toolbar: {
          container: [
            ['bold', 'italic'],
            ['blockquote', 'image']
          ],
          handlers: {
            image: function () { uploadCommentImage(_replyQuill, replyInlineImageUrls); }
          }
        },
        /* Enter alone → submit reply; Shift+Enter → newline. */
        keyboard: {
          bindings: {
            submitOnEnter: {
              key: 13,
              shiftKey: false,
              handler: function () {
                if (typeof submitInlineReply === 'function') submitInlineReply();
                return false;
              }
            }
          }
        }
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
    replyInlineImageUrls.length = 0;
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

    var replyImages = collectQuillImages(_replyQuill, replyInlineImageUrls);

    /* Crisis-detection gate — if the user chose help / dismissed the
       care modal, gate returns false and we pause the reply. */
    var crisisP = (window.SH_CRISIS && window.SH_CRISIS.gate)
      ? window.SH_CRISIS.gate(plainText, { source: 'reply' })
      : Promise.resolve(true);

    crisisP.then(function (proceed) {
      if (proceed === false) {
        btn.disabled    = false;
        btn.textContent = 'Post reply';
        return null;
      }
      return window.SH_MOD ? window.SH_MOD.check(plainText, 'reply', replyImages, _postAuthorId) : { allowed: true };
    }).then(function (mod) {
      if (mod === null) return; // crisis paused

      if (!mod.allowed) {
        btn.disabled    = false;
        btn.textContent = 'Post reply';
        if (window.SH_MOD) window.SH_MOD.showBlock(replyModErr, mod);
        if (mod.banned) btn.disabled = true;
        return;
      }

      btn.textContent = 'Posting…';

      var anonFpR = null;
      try {
        anonFpR = localStorage.getItem('sh_anon_fp');
        if (!anonFpR) {
          anonFpR = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
          localStorage.setItem('sh_anon_fp', anonFpR);
        }
      } catch (_) {}

      /* Defensive profile upsert — guarantees the join in loadComments
         can resolve, so the user's handle shows instead of "Anonymous". */
      var profileStep = _currentUserId ? (function () {
        var u = window.SH_SESSION && window.SH_SESSION.user;
        var uname = (u && u.username)    || ('user_' + _currentUserId.slice(0, 8));
        var dname = (u && u.displayName) || null;
        var aurl  = (u && u.avatarUrl)   || null;
        return db.from('profiles').upsert(
          { id: _currentUserId, username: uname, display_name: dname, avatar_url: aurl },
          { onConflict: 'id' }
        );
      })() : Promise.resolve({ error: null });

      /* Rate-limit gate (8/min users, 5/min anon for comments). */
      db.rpc('check_publish_rate', {
        p_user_id: _currentUserId || null,
        p_anon_fp: anonFpR || null,
        p_kind: 'comment',
      }).then(function (rl) {
        if (rl && rl.data && rl.data.allowed === false) {
          btn.disabled = false;
          btn.textContent = 'Post reply';
          showToast('Slow down — try again in ' + (rl.data.retry_after || 60) + ' s.');
          throw new Error('rate_limited');
        }
        return profileStep;
      }).then(function () { return db.from('comments').insert({
        post_id:   postId,
        parent_id: parentCid,
        content:   safeHtml(html),
        user_id:   _currentUserId,
        anon_fp:   anonFpR
      }); }).then(function (res) {
        btn.disabled    = false;
        btn.textContent = 'Post reply';

        if (res.error) {
          console.error('Reply insert error:', res.error);
          if ((res.error.message || '').toLowerCase().indexOf('blocked') !== -1) {
            if (typeof window.SH_showBlockModal === 'function') window.SH_showBlockModal();
            else showToast('You are temporarily blocked from commenting.');
          } else {
            showToast('Error: ' + (res.error.message || 'Could not post reply'));
          }
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
      .then(function () { showToast(t('post.copylink.ok', 'Link copied')); });
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

  /* ── comment report — real report submitted via SH_MOD.report ── */

  document.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-comment-report]');
    if (!btn) return;
    closeAllCommentMenus();

    var cid = btn.getAttribute('data-comment-report');
    if (!cid) { showToast('Cannot report — comment id missing.'); return; }
    if (!window.SH_MOD || !window.SH_MOD.report) { showToast('Cannot report — moderation API not loaded.'); return; }

    showToast('Sending report…');
    try {
      var res = await window.SH_MOD.report('comment', cid, null);

      if (!res || res.ok === false) {
        var err = (res && res.error) || 'unknown';
        if (err === 'already_reported') {
          showToast('You already reported this.');
        } else {
          showToast('Could not send report — ' + err);
          console.error('[report-comment] full error response:', res);
        }
        return;
      }

      var msg = 'Thanks — report counted (weight ' + (res.weight_added || 1) + ').';
      if (res.new_state === 'ai_reviewing') msg = 'Thanks — flagged for AI review.';
      if (res.new_state === 'hidden')       msg = 'Thanks — hidden pending review.';
      if (res.new_state === 'shadow')       msg = 'Thanks — downranked while we look.';
      if (res.new_state === 'pending_manual') msg = 'Thanks — sent to manual review.';
      showToast(msg);
    } catch (ex) {
      console.error('[report-comment] exception:', ex);
      showToast('Report failed: ' + (ex && ex.message ? ex.message : 'unknown error'));
    }
  });

  /* ── load comments ── */

  function loadComments() {
    db.from('comments')
      .select('*, profiles(username, display_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(function (result) {
        if (result.error) {
          // Older schema without profiles join — retry without it
          if (result.error.message && /relation|column|profiles/.test(result.error.message)) {
            db.from('comments')
              .select('*')
              .eq('post_id', postId)
              .order('created_at', { ascending: true })
              .then(function (r2) {
                if (r2.error) { showToast('Could not load comments'); return; }
                hydrateProfilesAndRender(r2.data || []);
              });
            return;
          }
          console.error('Comments load error:', result.error);
          showToast('Could not load comments');
          return;
        }
        hydrateProfilesAndRender(result.data || []);
      });
  }

  /* The PostgREST embedding `profiles(...)` only works when a foreign
     key from comments.user_id to profiles.id is registered in the schema
     cache. In this project it isn't, so the join silently returns null
     and every authored comment renders as "Anonymous". Fix: after the
     initial fetch, collect distinct user_ids whose .profiles came back
     null, do one batch SELECT against profiles, and inject the rows
     back into each comment. */
  function hydrateProfilesAndRender(rows) {
    var missing = {};
    (rows || []).forEach(function (c) {
      if (!c.profiles && c.user_id) missing[c.user_id] = true;
    });
    var ids = Object.keys(missing);
    if (!ids.length) { renderComments(rows); return; }

    db.from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ids)
      .then(function (pr) {
        if (!pr.error && Array.isArray(pr.data)) {
          var byId = {};
          pr.data.forEach(function (p) { byId[p.id] = p; });
          rows.forEach(function (c) {
            if (!c.profiles && c.user_id && byId[c.user_id]) {
              c.profiles = byId[c.user_id];
            }
          });
        }
        renderComments(rows);
      });
  }

  /* ── realtime: subscribe to new comments on this post ──────── */
  (function subscribeComments() {
    if (!db || typeof db.channel !== 'function' || !postId) return;

    // Pass JWT to realtime so RLS-aware broadcasts reach this client
    // (same pattern as setupRealtimeFeed in main-page.js).
    db.auth.getSession().then(function (s) {
      var jwt = s && s.data && s.data.session && s.data.session.access_token;
      if (jwt && db.realtime && typeof db.realtime.setAuth === 'function') {
        try { db.realtime.setAuth(jwt); } catch (_) {}
      }
    });

    var ch = db.channel('post-comments:' + postId);
    ch.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'comments',
      filter: 'post_id=eq.' + postId,
    }, function (payload) {
      var c = payload && payload.new;
      if (!c || !c.id) return;
      // Skip own comment — it was already optimistically added.
      if (_currentUserId && c.user_id === _currentUserId) return;
      // Skip if already rendered.
      if (document.getElementById('comment-' + c.id)) return;

      // Fetch the profile for the new comment then render it.
      var resolve = function (profile) {
        c.profiles = profile || null;
        var commentList = document.getElementById('comment-list');
        if (!commentList) return;
        // Remove the "No replies yet" empty state if it's still showing.
        var emptyEl = commentList.querySelector('.comment-empty');
        if (emptyEl) emptyEl.remove();
        var isReply = !!(c.parent_id);
        var li = buildCommentLi(c, isReply);
        if (isReply) {
          var parentLi = document.getElementById('comment-' + c.parent_id);
          if (parentLi) {
            var nested = parentLi.querySelector('.nested-replies');
            if (nested) nested.appendChild(li);
            else commentList.appendChild(li);
          } else {
            commentList.appendChild(li);
          }
        } else {
          commentList.appendChild(li);
        }
        // Update count.
        var countEl = document.getElementById('comments-count');
        if (countEl) countEl.textContent = String((parseInt(countEl.textContent, 10) || 0) + 1);
      };

      if (c.user_id) {
        db.from('profiles').select('id, username, display_name, avatar_url')
          .eq('id', c.user_id).maybeSingle()
          .then(function (r) { resolve(r.data || null); });
      } else {
        resolve(null);
      }
    }).subscribe(function (status, err) {
      if (err) console.warn('[post-realtime] comment subscribe error:', err);
    });
  })();

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

      var commentImages = collectQuillImages(commentQuill, commentInlineImageUrls);

      /* Crisis-detection gate — care modal first. If the user chose
         help / dismissed, gate returns false → we pause the comment
         (it stays in the editor) and skip the rest of the pipeline. */
      var crisisP = (window.SH_CRISIS && window.SH_CRISIS.gate)
        ? window.SH_CRISIS.gate(plainText, { source: 'comment' })
        : Promise.resolve(true);

      crisisP.then(function (proceed) {
        if (proceed === false) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = REPLY_ICON;
          return null;
        }
        return window.SH_MOD ? window.SH_MOD.check(plainText, 'comment', commentImages, _postAuthorId) : { allowed: true };
      }).then(function (mod) {
        if (mod === null) return; // crisis gate paused us

        if (!mod.allowed) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = REPLY_ICON;
          if (window.SH_MOD) window.SH_MOD.showBlock(commentModErr, mod);
          if (mod.banned) submitBtn.disabled = true;
          return;
        }

        submitBtn.textContent = 'Sending…';

        var anonFpC = null;
        try {
          anonFpC = localStorage.getItem('sh_anon_fp');
          if (!anonFpC) {
            anonFpC = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('sh_anon_fp', anonFpC);
          }
        } catch (_) {}

        /* Same defensive profile upsert as the reply path above. */
        var profileStepC = _currentUserId ? (function () {
          var u = window.SH_SESSION && window.SH_SESSION.user;
          var uname = (u && u.username)    || ('user_' + _currentUserId.slice(0, 8));
          var dname = (u && u.displayName) || null;
          var aurl  = (u && u.avatarUrl)   || null;
          return db.from('profiles').upsert(
            { id: _currentUserId, username: uname, display_name: dname, avatar_url: aurl },
            { onConflict: 'id' }
          );
        })() : Promise.resolve({ error: null });

        db.rpc('check_publish_rate', {
          p_user_id: _currentUserId || null,
          p_anon_fp: anonFpC || null,
          p_kind: 'comment',
        }).then(function (rl) {
          if (rl && rl.data && rl.data.allowed === false) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Reply';
            showToast('Slow down — try again in ' + (rl.data.retry_after || 60) + ' s.');
            throw new Error('rate_limited');
          }
          return profileStepC;
        }).then(function () { return db.from('comments').insert({ post_id: postId, content: html, user_id: _currentUserId, anon_fp: anonFpC }); }).then(function (result) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = REPLY_ICON;

          if (result.error) {
            console.error('Comment insert error:', result.error);
            if ((result.error.message || '').toLowerCase().indexOf('blocked') !== -1) {
              if (typeof window.SH_showBlockModal === 'function') window.SH_showBlockModal();
              else showToast('You are temporarily blocked from commenting.');
            } else {
              showToast('Error: ' + (result.error.message || 'Could not post comment'));
            }
            return;
          }

          db.rpc('increment_comment', { post_id: postId });
          commentQuill.setContents([]);
          commentInlineImageUrls.length = 0;
          loadComments();
        });
      });
    });
  }

})();
