'use strict';

(function () {
  var form = document.getElementById('postForm');
  if (!form) return;

  /* Shared i18n lookup — top-level so every alert / toast / button
     label in this file uses the same lookup pattern. Falls back to
     the English literal if i18n.js hasn't loaded yet. */
  function t(key, fallback) {
    return (window.SH_I18N && window.SH_I18N.t)
      ? (window.SH_I18N.t(key) || fallback)
      : fallback;
  }

  /* ─────────────────────────────────────────────
     Edit mode — when URL has ?edit=<post-id>, we
     load the existing post into the form and the
     submit handler runs UPDATE instead of INSERT.
     Author-only: ownership is verified after the
     post is fetched (if mismatch we redirect away).
     ───────────────────────────────────────────── */
  var EDIT_ID = (function () {
    try {
      var p = new URLSearchParams(window.location.search);
      return p.get('edit') || null;
    } catch (_) { return null; }
  })();
  /* URLs of media that were already attached to the post and the user
     chose to keep. Filled in load step; trimmed by the per-item remove
     buttons. On submit they are concatenated with newly uploaded URLs. */
  var existingMediaUrls = [];

  /* ─────────────────────────────────────────────
     Rich text editor (Quill)
     ───────────────────────────────────────────── */

  var quill = new Quill('#post-editor', {
    theme: 'snow',
    placeholder: t('cp.editor.placeholder', 'Write freely…'),
    modules: {
      toolbar: {
        container: [
          ['bold', 'italic', 'strike'],
          [{ header: 2 }, { header: 3 }],
          ['link', 'image', 'video'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'code-block'],
          ['clean']
        ],
        handlers: {
          image: handleImageUpload
        }
      }
    }
  });

  /* Track URLs of images inserted via the Quill toolbar.
     Populated as each upload completes — used at submit time for moderation. */
  var inlineImageUrls = [];

  /* image upload → Cloudflare R2 (via SH_MEDIA), then insert URL into editor */
  function handleImageUpload() {
    var input = document.createElement('input');
    input.type   = 'image/*'.length ? 'file' : 'file'; // just 'file'
    input.accept = 'image/*';
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;

      var sbUrl = window.SH_SUPABASE_URL;
      var sbKey = window.SH_SUPABASE_KEY;
      if (!sbUrl || !window.supabase) { alert(t('cp.err.sbcfg', 'Supabase not configured.')); return; }

      var db = window.supabase.createClient(sbUrl, sbKey);

      // Show a brief "uploading…" tooltip
      var range = quill.getSelection(true);
      var uploadingTxt = t('cp.editor.uploading', 'Uploading image…');
      quill.insertText(range.index, uploadingTxt, 'italic', true);

      // Compress (canvas → WebP/JPEG) then PUT to R2 via presigned URL.
      // Old path: db.storage.from('post-media').upload(...).
      window.SH_MEDIA.uploadToR2(file, { db: db }).then(function (url) {
        quill.deleteText(range.index, uploadingTxt.length);
        inlineImageUrls.push(url);  // register for moderation at submit time
        quill.insertEmbed(range.index, 'image', url, Quill.sources.USER);
        quill.setSelection(range.index + 1, Quill.sources.SILENT);
      }).catch(function (err) {
        quill.deleteText(range.index, uploadingTxt.length);
        alert(t('cp.err.upload', 'Upload failed:') + ' ' + (err && err.message || err));
      });
    };
    input.click();
  }

  /* ─────────────────────────────────────────────
     Media upload UI (file attachments strip)
     ───────────────────────────────────────────── */

  var uploadArea   = document.getElementById('mediaUploadArea');
  var mediaInput   = document.getElementById('mediaInput');
  var previewGrid  = document.getElementById('mediaPreview');
  var uploadPrompt = uploadArea ? uploadArea.querySelector('.upload-prompt') : null;
  var selectedFiles = [];
  var MAX_FILES = 6;

  function addFiles(fileList) {
    Array.from(fileList).forEach(function (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
      if (selectedFiles.length + existingMediaUrls.length >= MAX_FILES) return;
      selectedFiles.push(file);
      renderPreview(file, selectedFiles.length - 1);
    });
    syncPrompt();
  }

  function renderPreview(file, idx) {
    var item = document.createElement('div');
    item.className = 'media-preview-item';
    item.dataset.idx = String(idx);

    if (file.type.startsWith('image/')) {
      var img = document.createElement('img');
      img.alt = file.name;
      var reader = new FileReader();
      reader.onload = function (e) { img.src = e.target.result; };
      reader.readAsDataURL(file);
      item.appendChild(img);
    } else {
      var vid = document.createElement('video');
      vid.src = URL.createObjectURL(file);
      vid.preload = 'metadata';
      vid.muted = true;
      vid.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      item.appendChild(vid);

      var playBadge = document.createElement('div');
      playBadge.setAttribute('aria-hidden', 'true');
      playBadge.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
        'color:#fff;font-size:22px;text-shadow:0 1px 6px rgba(0,0,0,0.55);pointer-events:none;';
      playBadge.textContent = '▶';
      item.appendChild(playBadge);
    }

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'media-remove';
    removeBtn.setAttribute('aria-label', t('cp.media.remove', 'Remove'));
    removeBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor">' +
      '<path d="M202.83,197.17a4,4,0,0,1-5.66,5.66L128,133.66,58.83,202.83a4,4,0,0,1-5.66-5.66' +
      'L122.34,128,53.17,58.83a4,4,0,0,1,5.66-5.66L128,122.34l69.17-69.17a4,4,0,1,1,5.66,5.66L133.66,128Z"/></svg>';

    removeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var i = parseInt(item.dataset.idx, 10);
      selectedFiles.splice(i, 1);
      item.remove();
      Array.from(previewGrid.querySelectorAll('.media-preview-item')).forEach(function (el, n) {
        el.dataset.idx = String(n);
      });
      syncPrompt();
    });

    item.appendChild(removeBtn);
    if (previewGrid) previewGrid.appendChild(item);
  }

  function syncPrompt() {
    if (!uploadPrompt) return;
    var total = selectedFiles.length + existingMediaUrls.length;
    uploadPrompt.style.display = total > 0 ? 'none' : '';
  }

  /* Render a preview tile for media that's already on the server
     (edit mode). The remove button drops it from existingMediaUrls. */
  function renderExistingPreview(url) {
    var item = document.createElement('div');
    item.className = 'media-preview-item';
    item.dataset.existingUrl = url;

    var isVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
    if (isVideo) {
      var vid = document.createElement('video');
      vid.src = url;
      vid.preload = 'metadata';
      vid.muted = true;
      vid.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      item.appendChild(vid);
      var playBadge = document.createElement('div');
      playBadge.setAttribute('aria-hidden', 'true');
      playBadge.style.cssText =
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
        'color:#fff;font-size:22px;text-shadow:0 1px 6px rgba(0,0,0,0.55);pointer-events:none;';
      playBadge.textContent = '▶';
      item.appendChild(playBadge);
    } else {
      var img = document.createElement('img');
      img.alt = '';
      img.src = url;
      item.appendChild(img);
    }

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'media-remove';
    removeBtn.setAttribute('aria-label', t('cp.media.remove', 'Remove'));
    removeBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor">' +
      '<path d="M202.83,197.17a4,4,0,0,1-5.66,5.66L128,133.66,58.83,202.83a4,4,0,0,1-5.66-5.66' +
      'L122.34,128,53.17,58.83a4,4,0,0,1,5.66-5.66L128,122.34l69.17-69.17a4,4,0,1,1,5.66,5.66L133.66,128Z"/></svg>';
    removeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      existingMediaUrls = existingMediaUrls.filter(function (u) { return u !== url; });
      item.remove();
      syncPrompt();
    });

    item.appendChild(removeBtn);
    if (previewGrid) previewGrid.appendChild(item);
  }

  if (uploadArea && mediaInput) {
    uploadArea.addEventListener('click', function (e) {
      if (e.target.closest('.media-remove')) return;
      mediaInput.click();
    });

    mediaInput.addEventListener('change', function () {
      addFiles(mediaInput.files);
      mediaInput.value = '';
    });

    uploadArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    ['dragleave', 'dragend'].forEach(function (evt) {
      uploadArea.addEventListener(evt, function () {
        uploadArea.classList.remove('drag-over');
      });
    });
    uploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });
  }

  /* ─────────────────────────────────────────────
     Language selection — sync radios ↔ dropdown
     ───────────────────────────────────────────── */

  var langOtherSelectEl = form.querySelector('[name="lang_other"]');
  var langRadioEls      = form.querySelectorAll('[name="lang"]');

  if (langOtherSelectEl) {
    langOtherSelectEl.addEventListener('change', function () {
      if (langOtherSelectEl.value) {
        langRadioEls.forEach(function (r) { r.checked = false; });
      }
    });
  }

  langRadioEls.forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (langOtherSelectEl) langOtherSelectEl.value = '';
    });
  });

  /* ─────────────────────────────────────────────
     Form submit
     ───────────────────────────────────────────── */

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!window.supabase || !window.supabase.createClient) {
      alert(t('cp.err.sdk', 'Supabase SDK not loaded. Check your internet connection.'));
      return;
    }

    var sbUrl = window.SH_SUPABASE_URL;
    var sbKey = window.SH_SUPABASE_KEY;

    if (!sbUrl || sbUrl.indexOf('YOUR_PROJECT_ID') !== -1) {
      alert(t('cp.err.creds', 'Please fill in JS/supabase-config.js with your project credentials.'));
      return;
    }

    var db = window.supabase.createClient(sbUrl, sbKey);

    var title   = (document.getElementById('post-title').value || '').trim();

    /* get rich-text HTML from Quill; strip if truly empty */
    var rawHtml   = quill.root.innerHTML;
    var plainText = quill.getText().trim();
    if (!plainText) {
      quill.focus();
      return;
    }
    var content = rawHtml;

    var langOtherEl = form.querySelector('[name="lang_other"]');
    var langOther   = langOtherEl ? (langOtherEl.value || '') : '';
    var langRadio   = form.querySelector('[name="lang"]:checked');
    var lang        = langOther || (langRadio ? langRadio.value : 'en');

    var topics = Array.from(form.querySelectorAll('[name="topic"]:checked'))
      .map(function (el) { return el.value; });

    var modeEl = form.querySelector('[name="mode"]:checked');
    var mode   = modeEl ? modeEl.value : 'support';

    var btn     = form.querySelector('.btn-publish');
    var btnHtml = btn ? btn.innerHTML : '';

    function setLoading(on, label) {
      if (!btn) return;
      btn.disabled = on;
      btn.innerHTML = on
        ? (label || 'Publishing…') +
          ' <svg style="vertical-align:middle" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round"><circle cx="128" cy="128" r="104"/></svg>'
        : btnHtml;
    }

    /* upload attachment files to Cloudflare R2 (via presigned PUT).
       Each file is compressed client-side (images) or size-checked
       (videos, strategy C) inside SH_MEDIA.uploadToR2. */
    function uploadAll(files, done) {
      if (!files.length) { done([]); return; }

      var urls    = new Array(files.length).fill(null);
      var pending = files.length;
      var aborted = false;

      files.forEach(function (file, i) {
        window.SH_MEDIA.uploadToR2(file, { db: db }).then(function (url) {
          if (aborted) return;
          urls[i] = url;
          pending--;
          if (pending === 0) done(urls.filter(Boolean));
        }).catch(function (err) {
          if (aborted) return;
          aborted = true;
          var msg = 'Upload failed: ' + (err && err.message || err);
          if (err && err.code === 'video_too_large') {
            msg = 'Video is too large (max ' +
                  Math.round(window.SH_MEDIA.LIMITS.MAX_VIDEO_BYTES / 1024 / 1024) +
                  ' MB).';
          }
          alert(msg);
          setLoading(false);
        });
      });
    }

    var modErrorEl = document.getElementById('mod-error');
    if (window.SH_MOD) window.SH_MOD.clearError(modErrorEl);

    // ── Collect editor image URLs from all available sources ──
    // Source 1: inlineImageUrls — tracked at upload time in handleImageUpload
    var editorImageUrls = inlineImageUrls.slice();
    // Source 2: Quill delta — reads Quill's internal ops directly (most reliable)
    try {
      quill.getContents().ops.forEach(function (op) {
        if (op.insert && typeof op.insert === 'object') {
          var src = op.insert.image;
          if (typeof src === 'string' && src.startsWith('http') &&
              editorImageUrls.indexOf(src) === -1) {
            editorImageUrls.push(src);
          }
        }
      });
    } catch (_) {}

    // ── Moderation check ──────────────────────────────────────
    var tI = function (k, f) { return (window.SH_I18N && SH_I18N.t) ? SH_I18N.t(k) : f; };
    setLoading(true, tI('cp.btn.checking', 'Checking…'));

    var textToCheck = (title ? title + '\n' : '') + plainText;

    /* Crisis-detection gate — runs BEFORE moderation so the user sees
       hotlines before we burn an AI moderation call. If the user
       chose "see who can listen now" (or dismissed the modal), gate
       returns FALSE → we cancel the submit. They keep all their
       text — they can click publish again whenever they're ready. */
    var crisisPromise = (window.SH_CRISIS && window.SH_CRISIS.gate)
      ? window.SH_CRISIS.gate(textToCheck, { source: 'post' })
      : Promise.resolve(true);

    crisisPromise.then(function (proceed) {
      if (proceed === false) {
        setLoading(false);
        return null;                    // signal: stop the pipeline
      }
      return window.SH_MOD ? window.SH_MOD.check(textToCheck, 'post') : { allowed: true };
    }).then(function (mod) {
      if (mod === null) return;         // crisis gate said pause


      if (!mod.allowed) {
        setLoading(false);
        if (window.SH_MOD) window.SH_MOD.showBlock(modErrorEl, mod);
        // Если забанен — заблокировать кнопку полностью
        if (mod.banned && btn) btn.disabled = true;
        return;
      }

      // ── Passed → upload media then insert/update ────────────
      var busyLabel = selectedFiles.length > 0
        ? tI('cp.btn.uploading', 'Uploading…')
        : (EDIT_ID ? tI('cp.btn.saving', 'Saving…') : tI('cp.btn.publishing', 'Publishing…'));
      setLoading(true, busyLabel);

      uploadAll(selectedFiles, function (newMediaUrls) {
        // Always resolve user ID fresh from the auth API so we never
        // accidentally insert a post with user_id = null.
        db.auth.getUser().then(function (authRes) {
          var userId = (authRes && authRes.data && authRes.data.user)
            ? authRes.data.user.id : null;

          /* In edit mode the final media list is whatever the user kept
             from the original post + whatever they newly uploaded. */
          var mediaUrls    = existingMediaUrls.concat(newMediaUrls);
          // Combine attachment URLs + editor-embedded image URLs
          var allImageUrls = mediaUrls.concat(editorImageUrls);

          // ── Image moderation (attachment files + Quill-embedded images) ──
          Promise.resolve(
            (window.SH_MOD && allImageUrls.length > 0)
              ? window.SH_MOD.check('', 'post', allImageUrls)
              : { allowed: true }
          ).then(function (imgMod) {

            if (!imgMod.allowed) {
              setLoading(false);
              if (window.SH_MOD) window.SH_MOD.showBlock(modErrorEl, imgMod);
              if (imgMod.banned && btn) btn.disabled = true;
              return;
            }

            // ── Ensure profile row exists so the author name shows correctly ──
            // Without a DB trigger, newly registered users have no row in
            // `profiles`, causing the feed to display "deleted account".
            // We upsert here so the join always finds the author's name.
            var profileStep = userId ? (function () {
              var shUser = window.SH_SESSION && window.SH_SESSION.user;
              var uname  = (shUser && shUser.username)    || ('user_' + userId.slice(0, 8));
              var dname  = (shUser && shUser.displayName) || null;
              var aurl   = (shUser && shUser.avatarUrl)   || null;
              return db.from('profiles').upsert(
                { id: userId, username: uname, display_name: dname, avatar_url: aurl },
                { onConflict: 'id' }
              );
            })() : Promise.resolve({ error: null });

            /* Stable per-device fingerprint — same key as moderation.js.
               Stored on every post so admins can block repeat offenders
               (anonymous or otherwise) by device, not just by account. */
            var anonFp = null;
            try {
              anonFp = localStorage.getItem('sh_anon_fp');
              if (!anonFp) {
                anonFp = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
                localStorage.setItem('sh_anon_fp', anonFp);
              }
            } catch (_) {}

            profileStep.then(function () {
              /* Build the payload once; only the operation (insert vs
                 update) differs between create and edit. */
              var payload = {
                title:      title   || null,
                content:    content,
                lang:       lang,
                topics:     topics,
                mode:       mode,
                media_urls: mediaUrls
              };

              var op;
              if (EDIT_ID) {
                /* UPDATE — scope to id + user_id so a malicious actor
                   can't edit someone else's post by spoofing the URL.
                   We DON'T touch user_id / anon_fp / created_at. */
                op = db.from('posts').update(payload)
                  .eq('id', EDIT_ID)
                  .eq('user_id', userId);
              } else {
                payload.user_id = userId;
                payload.anon_fp = anonFp;
                op = db.from('posts').insert(payload);
              }

              op.then(function (result) {
                if (result.error) {
                  console.error('Supabase ' + (EDIT_ID ? 'update' : 'insert') + ' error:', result.error);
                  /* The block trigger raises 42501 "author is blocked".
                     Show a kinder message than the raw Postgres error. */
                  if ((result.error.message || '').toLowerCase().indexOf('blocked') !== -1) {
                    if (typeof window.SH_showBlockModal === 'function') {
                      window.SH_showBlockModal();
                    } else {
                      alert(t('cp.err.blocked', 'You are temporarily blocked from posting. Please try again later.'));
                    }
                  } else {
                    alert(EDIT_ID
                      ? t('cp.err.savefail', 'Could not save changes:') + ' ' + result.error.message
                      : t('cp.err.publishfail', 'Could not publish:') + ' ' + result.error.message);
                  }
                  setLoading(false);
                  return;
                }
                /* Successful write — clear the saved draft (hooked by the
                   inline draft script in create-post.html). */
                if (typeof window.__shClearPostDraft === 'function') {
                  window.__shClearPostDraft();
                }
                /* After edit, send the user back to the post they edited;
                   after create, send to the main feed. */
                window.location.href = EDIT_ID
                  ? ('post.html?id=' + encodeURIComponent(EDIT_ID))
                  : 'main.html';
              });
            });

          });
        });
      });

    });
  });

  /* ─────────────────────────────────────────────
     Edit mode — load existing post into the form.
     Triggered by ?edit=<id> in the URL.
     ───────────────────────────────────────────── */
  function loadPostForEdit(postId) {
    if (!window.supabase || !window.SH_SUPABASE_URL) {
      /* Supabase isn't ready yet — poll fast (20ms) so we don't add
         a visible delay once the deferred CDN script lands. */
      setTimeout(function () { loadPostForEdit(postId); }, 20);
      return;
    }
    var db = window.supabase.createClient(window.SH_SUPABASE_URL, window.SH_SUPABASE_KEY);

    /* Flip the UI to "edit mode" copy immediately — no need to wait
       for the network. Cheaper visually than seeing "publish story"
       briefly before the post loads. */
    applyEditModeChrome(postId);

    /* Run BOTH requests in parallel and populate the form as soon as
       the post arrives. Ownership is verified independently — if it
       fails we redirect. This avoids waiting for the slower of the
       two before showing any data. */
    var authPromise = db.auth.getUser();
    var postPromise = db.from('posts').select('*').eq('id', postId).single();

    postPromise.then(function (postRes) {
      if (postRes.error || !postRes.data) {
        alert(t('cp.err.notfound', 'Post not found — it may have been deleted.'));
        window.location.href = 'main.html';
        return;
      }
      populateFormFromPost(postRes.data);

      /* Verify ownership after populating. The post is publicly
         readable anyway, so showing the form briefly before the auth
         check resolves doesn't leak anything new. */
      authPromise.then(function (authRes) {
        var userId = (authRes && authRes.data && authRes.data.user) ? authRes.data.user.id : null;
        if (!userId || postRes.data.user_id !== userId) {
          alert(t('cp.err.notowner', 'You can only edit your own posts.'));
          window.location.href = 'post.html?id=' + encodeURIComponent(postId);
        }
      });
    });
  }

  /* Flip page chrome to edit mode — button label, tab title, cancel
     link. Pure DOM, no network — safe to run before the post lands. */
  function applyEditModeChrome(postId) {
    var publishBtn = form.querySelector('.btn-publish');
    if (publishBtn) {
      publishBtn.innerHTML =
        'save changes' +
        ' <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
        '<path d="M219.31,80,176,36.69A15.86,15.86,0,0,0,164.69,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V91.31A15.86,15.86,0,0,0,219.31,80ZM168,208H88V152h80Zm40,0H184V152a16,16,0,0,0-16-16H88a16,16,0,0,0-16,16v56H48V48h116.69L208,91.31ZM160,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h56A8,8,0,0,1,160,72Z"/></svg>';
    }
    var cancelLink = document.querySelector('a.btn-cancel');
    if (cancelLink) cancelLink.href = 'post.html?id=' + encodeURIComponent(postId);
    document.title = t('cp.doc.title.edit', 'Edit post · StillHere');
    var draftBtn = document.getElementById('btnDeleteDraft');
    if (draftBtn) draftBtn.style.display = 'none';
  }

  function populateFormFromPost(post) {
    // Title
    var titleEl = document.getElementById('post-title');
    if (titleEl) {
      titleEl.value = post.title || '';
      titleEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Rich-text content
    if (post.content) {
      try {
        quill.root.innerHTML = post.content;
        /* Track editor images so image moderation sees them on save. */
        quill.getContents().ops.forEach(function (op) {
          if (op.insert && typeof op.insert === 'object') {
            var src = op.insert.image;
            if (typeof src === 'string' && src.indexOf('http') === 0 &&
                inlineImageUrls.indexOf(src) === -1) {
              inlineImageUrls.push(src);
            }
          }
        });
      } catch (_) {}
    }

    // Language — match a radio, else fall back to lang_other select
    var langRadios = form.querySelectorAll('[name="lang"]');
    var matched = false;
    langRadios.forEach(function (r) {
      if (r.value === post.lang) { r.checked = true; matched = true; }
      else r.checked = false;
    });
    if (!matched && post.lang) {
      var langOther = form.querySelector('[name="lang_other"]');
      if (langOther) langOther.value = post.lang;
    }

    // Topics
    (post.topics || []).forEach(function (t) {
      var cb = form.querySelector('[name="topic"][value="' + t + '"]');
      if (cb) cb.checked = true;
    });

    // Mode
    var modeRadio = form.querySelector('[name="mode"][value="' + (post.mode || 'support') + '"]');
    if (modeRadio) modeRadio.checked = true;

    // Existing media — previews + remove buttons
    if (Array.isArray(post.media_urls) && post.media_urls.length) {
      existingMediaUrls = post.media_urls.slice();
      existingMediaUrls.forEach(function (url) { renderExistingPreview(url); });
      syncPrompt();
    }
  }

  if (EDIT_ID) loadPostForEdit(EDIT_ID);

})();
