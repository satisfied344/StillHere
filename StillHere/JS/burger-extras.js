/* ══════════════════════════════════════════════════════════════════
   burger-extras.js — append 4 extra items (About / Contacts /
   Updates / Profile) to the burger menu on every page.

   Why a separate file (and not nav-menu.js):
   Most pages already wire their burger open/close via an inline
   <script> block. Adding click-handling here would double-bind and
   the burger would visibly fail to toggle (each click cancels its
   pair). This file does ONLY DOM injection — never attaches click
   listeners to .main-menu-trigger.

   Visibility on desktop vs mobile is gated by CSS, not JS, so the
   same markup ships everywhere; mobile.css decides what shows.
   ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var panels = document.querySelectorAll('.main-menu-panel');
    if (!panels.length) return;

    /* Figure out the directory depth so the hrefs resolve from
       wherever the page sits. Three possibilities:
         • /StillHere/<page>.html                    → depth 0
         • /StillHere/nav-bar/<page>.html            → depth 1
         • /StillHere/docs/html/<page>.html          → depth 2  */
    var depth = pathDepth();
    var base  = depth === 0 ? '' : depth === 1 ? '../' : '../../';

    panels.forEach(function (panel) { injectInto(panel, base); });
  }

  function pathDepth() {
    var p = window.location.pathname || '';
    if (p.indexOf('/docs/html/') !== -1) return 2;
    if (p.indexOf('/nav-bar/')   !== -1) return 1;
    return 0;
  }

  function injectInto(panel, base) {
    /* Idempotent — skip if already done (e.g. live-server reload). */
    if (panel.querySelector('.mmenu-burger-extras')) return;

    /* Two-part layout:
       1. PROFILE item — inserted at the TOP, ABOVE the Login /
          Sign-out pill. Reads as a primary action when the user
          is logged in (their profile). When guest, clicking goes
          to profile.html which redirects to login — harmless.
       2. ABOUT · CONTACTS · UPDATES — appended at the BOTTOM as
          a compact footer-style text row with dot separators.
       Both blocks are mobile-only via .mmenu-burger-extras CSS
       in mobile.css. */

    /* ── 1. Profile entry at the top ── */
    var profileLi = document.createElement('li');
    profileLi.className = 'mmenu-burger-extras mmenu-burger-extras--profile-row';
    profileLi.setAttribute('role', 'none');
    profileLi.innerHTML =
      '<a href="' + base + 'nav-bar/profile" class="mmenu-item mmenu-extra--profile" role="menuitem">' +
        iconProfile() +
        '<span data-i18n="nav.profile">profile</span>' +
      '</a>';

    /* Place ABOVE the Login/Sign-out pill (top of the menu). */
    var loginItem = panel.querySelector('.mmenu-item--login');
    var loginLi   = loginItem ? loginItem.closest('li') : null;
    if (loginLi) {
      panel.insertBefore(profileLi, loginLi);
    } else {
      panel.insertBefore(profileLi, panel.firstChild);
    }

    /* ── 2. Bottom row: about · contacts · updates ── */
    var divider = document.createElement('li');
    divider.className = 'mmenu-burger-extras mmenu-burger-extras--divider';
    divider.setAttribute('aria-hidden', 'true');

    var rowLi = document.createElement('li');
    rowLi.className = 'mmenu-burger-extras mmenu-burger-extras--row';
    rowLi.setAttribute('role', 'none');
    rowLi.innerHTML =
      '<a href="' + base + 'nav-bar/about"    class="mmenu-extra-link" role="menuitem" data-i18n="nav.about">about</a>' +
      '<span class="mmenu-extra-dot" aria-hidden="true">·</span>' +
      '<a href="' + base + 'nav-bar/contacts" class="mmenu-extra-link" role="menuitem" data-i18n="nav.contacts">contacts</a>' +
      '<span class="mmenu-extra-dot" aria-hidden="true">·</span>' +
      '<a href="' + base + 'nav-bar/updates"  class="mmenu-extra-link" role="menuitem" data-i18n="nav.updates">updates</a>';

    panel.appendChild(divider);
    panel.appendChild(rowLi);

    /* Re-translate the new links if i18n already booted. */
    if (window.SH_I18N && typeof window.SH_I18N.apply === 'function') {
      window.SH_I18N.apply(profileLi);
      window.SH_I18N.apply(rowLi);
    }

    /* When the user is logged in, replace the generic "profile"
       label with their display name (or @username). Mirrors the
       same labelling session.js does on the top-info navProfileLink.
       Live-updates on every `sh:session` event so a sign-in /
       sign-out swap re-labels without a reload. */
    function applyProfileLabel(user) {
      var span = profileLi.querySelector('.mmenu-extra--profile span');
      if (!span) return;
      if (!user) {
        // Reset to the default i18n-translated "profile" label.
        span.removeAttribute('data-sh-user-label');
        var t = (window.SH_I18N && window.SH_I18N.t)
          ? window.SH_I18N.t('nav.profile') : 'profile';
        span.textContent = t;
        return;
      }
      var name = (user.displayName && String(user.displayName).trim()) ||
                 (user.username    && String(user.username).trim())    ||
                 null;
      if (!name) return;
      if (name.length > 18) name = name.slice(0, 17) + '…';
      span.textContent = name;
      span.setAttribute('data-sh-user-label', '1');
      // Strip data-i18n so the next i18n apply doesn't overwrite
      // the user-specific name with the generic "profile" string.
      span.removeAttribute('data-i18n');
    }
    // Initial — session may already be ready.
    if (window.SH_SESSION && window.SH_SESSION.user) {
      applyProfileLabel(window.SH_SESSION.user);
    } else if (window.SH_SESSION && typeof window.SH_SESSION.whenReady === 'function') {
      window.SH_SESSION.whenReady(applyProfileLabel);
    }
    // Live — re-label on auth state changes.
    document.addEventListener('sh:session', function (e) {
      applyProfileLabel(e.detail);
    });
  }

  function iconProfile() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
           '<path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"/>' +
           '</svg>';
  }
})();
