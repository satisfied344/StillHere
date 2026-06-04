/* ══════════════════════════════════════════════════════
   Mobile helpers (≤ 768px).
   - Adds a toggle button on the AI chat page so the
     conversation history sidebar can slide in/out.
   - The site navbar stays visible at the top; no bottom
     FAB / bottom-sheet.
   ══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function isMobile() { return window.matchMedia('(max-width: 900px)').matches; }

  /* Clean up any leftover bottom-FAB elements from earlier builds. */
  function cleanupLegacy() {
    ['.mobile-nav-trigger', '.mobile-nav-sheet', '.mobile-nav-backdrop']
      .forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) el.remove();
      });
  }

  /* AI-chat page has its own sidebar — add a toggle button on mobile.
     Sidebar starts CLOSED. Tapping the button opens it; tapping the
     backdrop or pressing Esc closes it. */
  function buildAiSidebarToggle() {
    if (!isMobile()) return;

    var sidebar = document.querySelector('.chat-sidebar') ||
                  document.querySelector('.ai-sidebar');
    if (!sidebar) return;

    /* Guarantee CLOSED initial state on every page load. */
    sidebar.classList.remove('is-open');

    if (document.querySelector('.ai-sidebar-toggle')) return;

    /* Backdrop */
    var backdrop = document.createElement('div');
    backdrop.className = 'ai-sidebar-backdrop';
    document.body.appendChild(backdrop);

    /* Toggle button */
    var btn = document.createElement('button');
    btn.className = 'ai-sidebar-toggle';
    btn.setAttribute('aria-label', 'Open chat history');
    btn.setAttribute('aria-expanded', 'false');
    /* Chevron-left to mirror the sidebar's own close-arrow style —
       this button "opens" the drawer that slides in from the left. */
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
      '<path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"/>' +
      '</svg>';
    document.body.appendChild(btn);

    /* Open/close use BOTH classList AND inline style. Inline style
       has higher specificity than any CSS rule, so even if some other
       script strips `is-open` we still stay visually open. This was
       the only thing the user's flaky setup actually responded to. */
    function open() {
      sidebar.classList.add('is-open');
      sidebar.style.left = '0';
      backdrop.classList.add('is-open');
      document.body.classList.add('chat-sidebar-open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      sidebar.classList.remove('is-open');
      sidebar.style.left = '-110%';
      backdrop.classList.remove('is-open');
      document.body.classList.remove('chat-sidebar-open');
      btn.setAttribute('aria-expanded', 'false');
    }
    function toggle() {
      if (sidebar.classList.contains('is-open')) close(); else open();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });
    backdrop.addEventListener('click', close);

    /* Esc closes */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) close();
    });

    /* Drawer behaves like a real side panel. Three-layer defense
       against the persistent "tap inside closes the drawer" bug:

       (1) Capture-phase listener at the DOCUMENT root. This fires
           BEFORE any descendant handler — including ones we don't
           know about. The instant a click lands anywhere inside
           .chat-sidebar, we set a 700ms lock. By the time someone
           else's outside-click handler tries to close, the lock is
           already in place.
       (2) Bubble-phase listener on the sidebar — stopPropagation so
           the click never reaches document-level outside-click code.
       (3) MutationObserver — if `is-open` somehow STILL gets stripped
           while locked, immediately re-add it. */
    var _lockedUntil = 0;
    var _intentionalClose = false;
    function isLocked() { return Date.now() < _lockedUntil; }

    /* (1) capture phase on document — fires first, no matter what */
    document.addEventListener('click', function (e) {
      if (sidebar.contains(e.target)) _lockedUntil = Date.now() + 700;
    }, true);  // ← USE_CAPTURE

    /* (2) bubble phase on sidebar — stop propagation so document-level
        outside-click handlers don't run for inner clicks. */
    sidebar.addEventListener('click', function (e) {
      _lockedUntil = Date.now() + 700;
      e.stopPropagation();
    });

    /* Observer watches BOTH the class attribute AND inline style. If
       either one suddenly says "closed" while we hold an inner-click
       lock and didn't intentionally close, force re-open through both
       channels. */
    var classObserver = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.attributeName !== 'class' && m.attributeName !== 'style') continue;
        var styleOk = sidebar.style.left === '0' || sidebar.style.left === '0px';
        var classOk = sidebar.classList.contains('is-open');
        if (styleOk && classOk) continue;       // still open — good
        if (_intentionalClose) continue;
        if (isLocked() || Date.now() - _lockedUntil < 800) {
          sidebar.classList.add('is-open');
          sidebar.style.left = '0';
          backdrop.classList.add('is-open');
          document.body.classList.add('chat-sidebar-open');
          break;
        }
      }
    });
    classObserver.observe(sidebar, { attributes: true, attributeFilter: ['class', 'style'] });

    /* Wrap close() so it: (a) refuses if locked by recent inner click,
       (b) marks the close as intentional so the observer leaves it. */
    var rawClose = close;
    close = function () {
      if (isLocked()) return;             // ← inner click within 500ms wins
      _intentionalClose = true;
      rawClose();
      setTimeout(function () { _intentionalClose = false; }, 80);
    };
    backdrop.removeEventListener('click', rawClose);
    backdrop.addEventListener('click', close);

    /* The page's own .sidebar-toggle button (close-arrow on the right
       edge). Closes the drawer fully on mobile. We CLEAR the lock
       first so the close goes through even if the user just clicked
       elsewhere inside. */
    var collapseBtn = sidebar.querySelector('.sidebar-toggle');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        _lockedUntil = 0;                  // ← user explicitly wants to close
        close();
      });
    }
  }

  /* Inject a floating "+" FAB on the community feed (main.html)
     so the create-post button is always reachable, even after
     the in-sidebar one is hidden on mobile. */
  function buildFeedFab() {
    if (!isMobile()) return;
    if (!document.querySelector('.main-feed')) return;
    if (document.querySelector('.feed-fab')) return;

    /* Find the right link path for create-post.html relative
       to the current page. main.html is at site root, so
       the relative link is just 'create-post'. */
    var href = 'create-post';
    if (location.pathname.indexOf('/nav-bar/') !== -1) href = '../create-post';

    var a = document.createElement('a');
    a.className = 'feed-fab';
    a.href = href;
    a.setAttribute('aria-label', 'Share a story');
    a.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">' +
      '<path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>' +
      '</svg>';
    document.body.appendChild(a);
  }

  function init() {
    cleanupLegacy();
    buildAiSidebarToggle();
    buildFeedFab();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Re-init if viewport crosses the breakpoint (rotation) */
  var mql = window.matchMedia('(max-width: 900px)');
  if (mql.addEventListener) {
    mql.addEventListener('change', function () {
      var toggle = document.querySelector('.ai-sidebar-toggle');
      var backdrop = document.querySelector('.ai-sidebar-backdrop');
      var fab = document.querySelector('.feed-fab');
      if (isMobile()) {
        if (!toggle) buildAiSidebarToggle();
        if (!fab) buildFeedFab();
      } else {
        if (toggle) toggle.remove();
        if (backdrop) backdrop.remove();
        if (fab) fab.remove();
        var sb = document.querySelector('.chat-sidebar') ||
                 document.querySelector('.ai-sidebar');
        if (sb) sb.classList.remove('is-open');
      }
    });
  }
})();
