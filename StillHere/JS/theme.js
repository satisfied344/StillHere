/* theme.js - minimal native theme handling.
   Priority:
     1. localStorage.sh_theme - explicit user choice via the FAB / preferences.
     2. matchMedia('(prefers-color-scheme: dark)') - OS / browser preference.
   The inline <head> bootstrap applies the initial theme synchronously. */
(function () {
  var html = document.documentElement;

  /* Drop stale flags from previous versions. */
  try { localStorage.removeItem('sh_ext_lock'); } catch (_) {}
  /* Migrate the retired "total-dark" theme back to plain dark. */
  try {
    if (localStorage.getItem('sh_theme') === 'total-dark') {
      localStorage.setItem('sh_theme', 'dark');
    }
  } catch (_) {}
  html.removeAttribute('data-paper');

  /* Helper API used by the FAB and preferences page. */
  window.SH_THEME = {
    get: function () {
      var saved = localStorage.getItem('sh_theme');
      if (saved === 'total-dark') saved = 'dark';
      return saved ||
        (html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    },
    set: function (theme) {
      if (theme !== 'dark' && theme !== 'light') theme = 'dark';
      localStorage.setItem('sh_theme', theme);
      html.setAttribute('data-theme', theme);
    },
    toggle: function () {
      var next = this.get() === 'dark' ? 'light' : 'dark';
      this.set(next);
      return next;
    }
  };

  /* Live-react to OS / browser theme toggles - only if no explicit choice. */
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
