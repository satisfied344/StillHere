'use strict';

(function () {
  var form = document.getElementById('postForm');
  if (!form) return;

  /* ─────────────────────────────────────────────
     Rich text editor (Quill)
     ───────────────────────────────────────────── */

  var quill = new Quill('#post-editor', {
    theme: 'snow',
    placeholder: 'Write freely…',
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

  /* image upload → Supabase Storage, then insert URL into editor */
  function handleImageUpload() {
    var input = document.createElement('input');
    input.type   = 'image/*'.length ? 'file' : 'file'; // just 'file'
    input.accept = 'image/*';
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;

      var sbUrl = window.SH_SUPABASE_URL;
      var sbKey = window.SH_SUPABASE_KEY;
      if (!sbUrl || !window.supabase) { alert('Supabase not configured.'); return; }

      var db     = window.supabase.createClient(sbUrl, sbKey);
      var bucket = db.storage.from('post-media');
      var ext    = file.name.split('.').pop().toLowerCase();
      var path   = 'posts/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;

      // Show a brief "uploading…" tooltip
      var range = quill.getSelection(true);
      quill.insertText(range.index, 'Uploading image…', 'italic', true);

      bucket.upload(path, file, { cacheControl: '3600', upsert: false }).then(function (res) {
        // Remove the "Uploading…" placeholder text
        quill.deleteText(range.index, 'Uploading image…'.length);

        if (res.error) { alert('Upload failed: ' + res.error.message); return; }
        var url = bucket.getPublicUrl(path).data.publicUrl;
        inlineImageUrls.push(url);  // register for moderation at submit time
        quill.insertEmbed(range.index, 'image', url, Quill.sources.USER);
        quill.setSelection(range.index + 1, Quill.sources.SILENT);
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
      if (selectedFiles.length >= MAX_FILES) return;
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
    removeBtn.setAttribute('aria-label', 'Remove');
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
    uploadPrompt.style.display = selectedFiles.length > 0 ? 'none' : '';
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
      alert('Supabase SDK not loaded. Check your internet connection.');
      return;
    }

    var sbUrl = window.SH_SUPABASE_URL;
    var sbKey = window.SH_SUPABASE_KEY;

    if (!sbUrl || sbUrl.indexOf('YOUR_PROJECT_ID') !== -1) {
      alert('Please fill in JS/supabase-config.js with your project credentials.');
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

    /* upload attachment files to Supabase Storage */
    function uploadAll(files, done) {
      if (!files.length) { done([]); return; }

      var bucket  = db.storage.from('post-media');
      var urls    = new Array(files.length).fill(null);
      var pending = files.length;
      var aborted = false;

      files.forEach(function (file, i) {
        var ext  = file.name.split('.').pop().toLowerCase();
        var path = 'posts/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;

        bucket.upload(path, file, { cacheControl: '3600', upsert: false }).then(function (res) {
          if (aborted) return;
          if (res.error) {
            aborted = true;
            alert('Upload failed: ' + res.error.message);
            setLoading(false);
            return;
          }
          urls[i] = bucket.getPublicUrl(path).data.publicUrl;
          pending--;
          if (pending === 0) done(urls.filter(Boolean));
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
    setLoading(true, 'Checking…');

    var textToCheck = (title ? title + '\n' : '') + plainText;

    Promise.resolve(
      window.SH_MOD ? window.SH_MOD.check(textToCheck, 'post') : { allowed: true }
    ).then(function (mod) {

      if (!mod.allowed) {
        setLoading(false);
        if (window.SH_MOD) window.SH_MOD.showBlock(modErrorEl, mod);
        // Если забанен — заблокировать кнопку полностью
        if (mod.banned && btn) btn.disabled = true;
        return;
      }

      // ── Passed → upload media then insert ────────────────────
      setLoading(true, selectedFiles.length > 0 ? 'Uploading…' : 'Publishing…');

      uploadAll(selectedFiles, function (mediaUrls) {
        // Always resolve user ID fresh from the auth API so we never
        // accidentally insert a post with user_id = null.
        db.auth.getUser().then(function (authRes) {
          var userId = (authRes && authRes.data && authRes.data.user)
            ? authRes.data.user.id : null;

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

            profileStep.then(function () {
              db.from('posts').insert({
                title:      title   || null,
                content:    content,
                lang:       lang,
                topics:     topics,
                mode:       mode,
                media_urls: mediaUrls,
                user_id:    userId
              }).then(function (result) {
                if (result.error) {
                  console.error('Supabase insert error:', result.error);
                  alert('Could not publish: ' + result.error.message);
                  setLoading(false);
                  return;
                }
                window.location.href = 'main.html';
              });
            });

          });
        });
      });

    });
  });

})();
