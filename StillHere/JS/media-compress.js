/*
 * media-compress.js — client-side compression + R2 upload helpers.
 *
 * Exposes a single global `window.SH_MEDIA` with:
 *
 *   compressImage(file, opts?)  -> Promise<File>
 *     Re-encodes images via canvas. Max 1920 px on the long side
 *     and WebP at q=0.82 (falls back to JPEG q=0.82 in Safari < 14
 *     and other browsers that can't encode WebP). PNG with alpha
 *     stays as PNG so transparency isn't flattened.
 *
 *   checkVideo(file, opts?)     -> Promise<File>
 *     Strategy C: enforce the size cap only (no transcoding —
 *     browsers can't transcode video without ffmpeg.wasm, which
 *     is 30 MB of WASM and too expensive for this site). Throws
 *     a tagged error if too large so the UI can show a friendly
 *     message.
 *
 *   uploadToR2(file, opts?)     -> Promise<string>  // public URL
 *     End-to-end: ask `r2-presign` for a signed PUT URL, send
 *     the bytes there, return the public URL the caller should
 *     store in `posts.media_urls`. Designed to be a near-drop-in
 *     replacement for the old `db.storage.from(...).upload(...)`
 *     calls in create-post.js.
 *
 * Sizing knobs match the Edge Function so the client fails fast
 * instead of round-tripping a doomed upload.
 */
(function () {
  'use strict';

  var MAX_IMAGE_BYTES = 5  * 1024 * 1024;
  var MAX_VIDEO_BYTES = 25 * 1024 * 1024;
  var MAX_LONG_SIDE   = 1920;
  var Q               = 0.82;

  // Cache the WebP-encode capability check — running it on every
  // upload would be wasteful. Returns a Promise<boolean>.
  var _webpProbe = null;
  function canEncodeWebp() {
    if (_webpProbe) return _webpProbe;
    _webpProbe = new Promise(function (resolve) {
      try {
        var c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        c.toBlob(function (b) { resolve(!!(b && b.type === 'image/webp')); }, 'image/webp');
      } catch (_) { resolve(false); }
    });
    return _webpProbe;
  }

  function loadBitmap(file) {
    // createImageBitmap is faster + decodes off-thread; HTMLImageElement
    // is the fallback for Safari < 15 and friends.
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file).catch(function () { return loadViaImg(file); });
    }
    return loadViaImg(file);
  }
  function loadViaImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload  = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function (e) { URL.revokeObjectURL(url); reject(e); };
      img.src = url;
    });
  }

  function compressImage(file, opts) {
    opts = opts || {};
    var maxSide = opts.maxSide || MAX_LONG_SIDE;
    var quality = opts.quality || Q;
    // forceResize: skip the fast-path short-circuits. Used by the
    // avatar flow where we MUST shrink to exactly 300 px even if
    // the source is a small PNG, because the original could be a
    // 2-MP transparent PNG that's "small enough" by size but huge
    // by pixels.
    var forceResize = opts.forceResize || !!opts.maxSide;

    // PNGs with alpha stay PNG — re-encoding to JPEG/WebP flattens
    // transparency to a black background, which is jarring for UI
    // assets. Tiny PNGs (< 200 KB) also pass through untouched.
    if (!forceResize && file.type === 'image/png' && file.size < 200 * 1024) {
      return Promise.resolve(file);
    }
    // GIFs: don't try to re-encode (would lose animation).
    if (file.type === 'image/gif') return Promise.resolve(file);

    return Promise.all([loadBitmap(file), canEncodeWebp()]).then(function (pair) {
      var bmp = pair[0];
      var webpOk = pair[1];

      var w = bmp.width  || bmp.naturalWidth;
      var h = bmp.height || bmp.naturalHeight;
      var scale = Math.min(1, maxSide / Math.max(w, h));
      var tw = Math.round(w * scale);
      var th = Math.round(h * scale);

      var canvas = document.createElement('canvas');
      canvas.width = tw; canvas.height = th;
      var ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bmp, 0, 0, tw, th);
      if (bmp.close) try { bmp.close(); } catch (_) {}

      var outType = webpOk ? 'image/webp' : 'image/jpeg';
      var outExt  = webpOk ? 'webp'        : 'jpg';

      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error('encode_failed')); return; }
          // If compression somehow made the file BIGGER (small
          // already-optimized photos, screenshots), keep the
          // original — common pitfall of naive compression.
          if (blob.size >= file.size && /^image\//.test(file.type)) {
            resolve(file);
            return;
          }
          var base = (file.name || 'image').replace(/\.[^.]+$/, '');
          resolve(new File([blob], base + '.' + outExt, { type: outType }));
        }, outType, quality);
      });
    });
  }

  function checkVideo(file) {
    if (file.size > MAX_VIDEO_BYTES) {
      var err = new Error('video_too_large');
      err.code = 'video_too_large';
      err.cap  = MAX_VIDEO_BYTES;
      err.size = file.size;
      throw err;
    }
    return Promise.resolve(file);
  }

  function extOf(file) {
    var m = /\.([a-z0-9]{1,5})$/i.exec(file.name || '');
    if (m) return m[1].toLowerCase();
    // Fall back to mime → ext, important for camera blobs that
    // arrive with name = "image.jpeg" or no extension at all.
    var t = (file.type || '').toLowerCase();
    if (t === 'image/jpeg')      return 'jpg';
    if (t === 'image/png')       return 'png';
    if (t === 'image/webp')      return 'webp';
    if (t === 'image/gif')       return 'gif';
    if (t === 'video/mp4')       return 'mp4';
    if (t === 'video/webm')      return 'webm';
    if (t === 'video/quicktime') return 'mov';
    return 'bin';
  }

  /* ── R2 upload ────────────────────────────────────────────
     Flow: presign → PUT → done. The Supabase client is needed
     only to authenticate against the Edge Function (verify_jwt
     is on by default), so we accept a `db` arg = supabase
     client. */
  function uploadToR2(file, opts) {
    opts = opts || {};
    var db = opts.db || window.sb || window.supabaseClient;
    if (!db) return Promise.reject(new Error('no_supabase_client'));

    var isVideo = /^video\//.test(file.type);
    var prep = isVideo ? checkVideo(file) : compressImage(file, opts);

    return prep.then(function (prepared) {
      if (prepared.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) {
        var e = new Error('too_large_after_compress');
        e.code = 'too_large_after_compress';
        throw e;
      }
      return db.functions.invoke('r2-presign', {
        body: {
          contentType: prepared.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
          sizeBytes:   prepared.size,
          ext:         extOf(prepared),
        },
      }).then(function (res) {
        if (res.error) throw res.error;
        var d = res.data || {};
        if (!d.putUrl || !d.publicUrl) throw new Error('presign_failed');

        // Direct PUT to R2. content-type MUST match what we
        // signed for — V4 includes it in SignedHeaders, so a
        // mismatch returns 403 SignatureDoesNotMatch.
        return fetch(d.putUrl, {
          method:  'PUT',
          body:    prepared,
          headers: { 'content-type': prepared.type || 'application/octet-stream' },
        }).then(function (putRes) {
          if (!putRes.ok) {
            return putRes.text().then(function (txt) {
              throw new Error('r2_put_' + putRes.status + ': ' + txt.slice(0, 200));
            });
          }
          return d.publicUrl;
        });
      });
    });
  }

  window.SH_MEDIA = {
    compressImage: compressImage,
    checkVideo:    checkVideo,
    uploadToR2:    uploadToR2,
    LIMITS: {
      MAX_IMAGE_BYTES: MAX_IMAGE_BYTES,
      MAX_VIDEO_BYTES: MAX_VIDEO_BYTES,
      MAX_LONG_SIDE:   MAX_LONG_SIDE,
    },
  };
}());
