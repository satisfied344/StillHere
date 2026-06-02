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
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor">' +
      '<path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z"/>' +
      '</svg>';
    document.body.appendChild(btn);

    function open() {
      sidebar.classList.add('is-open');
      backdrop.classList.add('is-open');
      document.body.classList.add('chat-sidebar-open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      sidebar.classList.remove('is-open');
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

    /* Tapping any item inside the sidebar (e.g. a past chat) closes it */
    sidebar.addEventListener('click', function (e) {
      var a = e.target.closest('a, button');
      if (a && !a.classList.contains('ai-sidebar-toggle')) {
        setTimeout(close, 120);
      }
    });
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
