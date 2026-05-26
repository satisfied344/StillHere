/* theme.js — minimal native theme handling.
   Priority:
     1. localStorage.sh_theme — explicit user choice via the FAB.
     2. matchMedia('(prefers-color-scheme: dark)') — OS / browser preference.
   The inline <head> bootstrap applies the initial theme synchronously.
   This file exposes the SH_THEME API and reacts to live OS toggles. */
(function () {
  var html = document.documentElement;

  /* Drop any stale flag from previous versions (extension lock). */
  try { localStorage.removeItem('sh_ext_lock'); } catch (_) {}

  /* Helper API used by the FAB and preferences page. */
  window.SH_THEME = {
    get: function () {
      return localStorage.getItem('sh_theme') ||
        (html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    },
    set: function (theme) {
      localStorage.setItem('sh_theme', theme);
      html.setAttribute('data-theme', theme);
    },
    toggle: function () {
      var next = this.get() === 'dark' ? 'light' : 'dark';
      this.set(next);
      return next;
    }
  };

  /* Live-react to OS / browser theme toggles — but only if the user
     has no explicit saved choice. Otherwise their FAB pick always wins. */
  if (window.matchMedia) {
    try {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        if (!localStorage.getItem('sh_theme')) {
          html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener)  mq.addListener(onChange);
    } catch (_) {}
  }
})();
