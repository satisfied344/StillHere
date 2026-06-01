/*
 * lightbox.js — modal image viewer for the post page.
 *
 * Listens for clicks on any <img> inside `.post-body` or
 * `.comment-body` (and any future `[data-lightbox]` opt-in) and
 * shows the image in a full-screen overlay. Why a custom one and
 * not a library: the rest of the site is vanilla, and an off-the-
 * shelf lightbox would pull in jQuery or a full bundler.
 *
 * Behaviour:
 *   • Click outside the image or press Esc → close.
 *   • Click ON the image → no-op (so users can drag-select / save).
 *   • Body scroll is locked while open.
 *   • The overlay is built lazily on first open so the script
 *     adds nothing to the DOM for visitors who never click an image.
 *
 * Exposed:
 *   window.SH_LIGHTBOX.open(src, alt?)   // also callable manually
 *   window.SH_LIGHTBOX.close()
 */
(function () {
  'use strict';

  var overlay = null;
  var imgEl   = null;
  var prevOverflow = '';

  function build() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'sh-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999',
      'display:none', 'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,0.86)', 'cursor:zoom-out',
      'padding:24px',
      'animation:sh-lb-fade 0.18s ease-out',
    ].join(';');

    imgEl = document.createElement('img');
    imgEl.alt = '';
    imgEl.style.cssText = [
      'max-width:100%', 'max-height:100%',
      'object-fit:contain', 'cursor:default',
      'box-shadow:0 12px 48px rgba(0,0,0,0.55)',
      'border-radius:4px', 'user-select:none',
    ].join(';');
    // Click on image itself should NOT close (so the user can
    // right-click → save, drag, etc.).
    imgEl.addEventListener('click', function (e) { e.stopPropagation(); });

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = [
      'position:absolute', 'top:18px', 'right:22px',
      'width:42px', 'height:42px', 'border-radius:50%',
      'border:none', 'background:rgba(255,255,255,0.12)',
      'color:#fff', 'font-size:24px', 'line-height:1',
      'cursor:pointer', 'display:flex', 'align-items:center',
      'justify-content:center', 'backdrop-filter:blur(4px)',
    ].join(';');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', close);

    // Inject keyframes once. Lives at module scope so we don't
    // pollute stylesheets for the rest of the site.
    if (!document.getElementById('sh-lb-style')) {
      var style = document.createElement('style');
      style.id = 'sh-lb-style';
      style.textContent =
        '@keyframes sh-lb-fade { from { opacity:0 } to { opacity:1 } }';
      document.head.appendChild(style);
    }

    overlay.appendChild(imgEl);
    overlay.appendChild(closeBtn);
    overlay.addEventListener('click', close);
    document.body.appendChild(overlay);
  }

  function open(src, alt) {
    if (!src) return;
    build();
    imgEl.src = src;
    imgEl.alt = alt || '';
    overlay.style.display = 'flex';
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
  }

  function close() {
    if (!overlay || overlay.style.display === 'none') return;
    overlay.style.display = 'none';
    // Drop the src so a huge image doesn't sit in memory until
    // the next open.
    if (imgEl) imgEl.src = '';
    document.body.style.overflow = prevOverflow;
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  /* ── Delegated click handler ──────────────────────────────
     Catches images that are inserted AFTER load (comments, lazy
     replies) too — that's why we delegate on document instead of
     binding to each <img>. */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    // Only inside post body / comment body, or anything that
    // explicitly opts in via [data-lightbox].
    var inPost = !!(t.closest && (t.closest('.post-body') || t.closest('.comment-body') || t.closest('[data-lightbox]')));
    if (!inPost) return;
    // Skip avatars and icons — they're not the content.
    if (t.closest('.avatar-circle') || t.closest('.sh-icon')) return;
    e.preventDefault();
    open(t.currentSrc || t.src, t.alt);
  });

  window.SH_LIGHTBOX = { open: open, close: close };
}());
