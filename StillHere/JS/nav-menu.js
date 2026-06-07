/* ══════════════════════════════════════════════════════════════════
   nav-menu.js - shared burger-menu wiring.

   Wires every `.main-menu-dropdown` (trigger + panel pair) on the
   page so the dropdown opens / closes correctly across all pages
   without duplicating the snippet inline. Also coordinates with the
   notifications bell so opening one closes the other.

   Lives in its own file so adding it to a new page is one <script>
   tag instead of a 30-line inline block.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var triggers = document.querySelectorAll('.main-menu-dropdown');
    if (!triggers.length) return;

    triggers.forEach(function (wrap) {
      var btn   = wrap.querySelector('.main-menu-trigger');
      var panel = wrap.querySelector('.main-menu-panel');
      if (!btn || !panel) return;

      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = panel.classList.contains('is-open');

        // Close every OTHER menu panel + the notifications dropdown.
        document.querySelectorAll('.main-menu-panel.is-open').forEach(function (p) {
          p.classList.remove('is-open');
          var b = p.closest('.main-menu-dropdown').querySelector('.main-menu-trigger');
          if (b) b.setAttribute('aria-expanded', 'false');
        });
        closeNotificationsPanel();

        if (!isOpen) {
          panel.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    // Click anywhere outside any menu → close all menus.
    document.addEventListener('click', function (e) {
      // If the click was inside the menu/burger, the local handler
      // already managed it; let it stand.
      if (e.target.closest('.main-menu-dropdown')) return;
      document.querySelectorAll('.main-menu-panel.is-open').forEach(function (p) {
        p.classList.remove('is-open');
        var b = p.closest('.main-menu-dropdown').querySelector('.main-menu-trigger');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.main-menu-panel.is-open').forEach(function (p) {
        p.classList.remove('is-open');
        var b = p.closest('.main-menu-dropdown').querySelector('.main-menu-trigger');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* Helper used from this file AND callable from notifications.js
     (window.SH_closeMenus()). Closes both menus + notif panel so
     opening one always dismisses the other. */
  function closeNotificationsPanel() {
    var p = document.getElementById('shNotifPanel');
    var b = document.getElementById('shNotifBell');
    if (p && p.classList.contains('is-open')) {
      p.classList.remove('is-open');
      if (b) b.setAttribute('aria-expanded', 'false');
    }
  }

  // Public hook so notifications.js can close us when its bell opens.
  window.SH_closeAllMenus = function () {
    document.querySelectorAll('.main-menu-panel.is-open').forEach(function (p) {
      p.classList.remove('is-open');
      var b = p.closest('.main-menu-dropdown').querySelector('.main-menu-trigger');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  };
})();
