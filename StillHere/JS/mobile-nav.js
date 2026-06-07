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

  /* AI-chat page has its own sidebar - add a toggle button on mobile.
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
    /* Chevron-left to mirror the sidebar's own close-arrow style -
       this button "opens" the drawer that slides in from the left. */
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
      '<path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"/>' +
      '</svg>';
    document.body.appendChild(btn);

    /* Open / close rely ONLY on the `is-open` class. The mobile CSS
       drives the slide with `.chat-sidebar.is-open { left: 0 }`, so
       no inline styles are needed (and inline `left` would be ignored
       anyway, since the CSS rule is `!important`). */
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

    /* Why this is enough (and why all the old lock/observer hacks are
       gone): the drawer is a real side panel sitting ABOVE the backdrop
       (z-index 8500 vs 8400) and spanning the full height of the
       viewport. So:
         • A tap on any button INSIDE the drawer hits that button and
           does its job - the backdrop never sees the event, because the
           backdrop is a SIBLING of the drawer, not an ancestor, and
           click events only bubble through ancestors.
         • A tap on the empty area below the buttons still lands on the
           drawer's own surface, so nothing closes.
         • A tap to the RIGHT of the drawer (the strip the panel doesn't
           cover) lands on the backdrop → close.
       No global click listener on this page touches the sidebar, so
       there is nothing to defend against. */

    /* Toggle button opens the drawer. */
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggle();
    });

    /* Backdrop closes ONLY when the backdrop itself is the target -
       i.e. the area to the right of the panel. */
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) close();
    });

    /* Esc closes. */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) close();
    });

    /* The panel's own close-arrow (top-right of the drawer) closes it. */
    var collapseBtn = sidebar.querySelector('.sidebar-toggle');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        close();
      });
    }

    /* Picking a conversation reveals the chat. On mobile the chat area
       sits BEHIND the open drawer, so an in-page action like "open a
       past chat" or "start a new conversation" loads the conversation
       underneath but stays hidden by the panel - which reads as
       "nothing happened / it just closed". So after such a selection we
       close the drawer to reveal the chat. We DON'T close for the inline
       delete (×) button (it opens a confirm dialog) or for neutral taps
       (search box, empty space, labels). Delegated so it keeps working
       after the history list re-renders. */
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('.history-menu')) return;   // delete - keep open
      if (e.target.closest('.history-item') ||
          e.target.closest('#newChatBtn')) {
        close();
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
