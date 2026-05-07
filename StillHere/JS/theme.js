/* theme.js — apply saved theme immediately to prevent flash of wrong theme.
   Include as early as possible in <head>, before CSS links if possible. */
(function () {
  var t = localStorage.getItem('sh_theme');
  if (t === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

/* Helper used by preferences.html and any other page that needs to toggle */
window.SH_THEME = {
  get: function () {
    return localStorage.getItem('sh_theme') || 'light';
  },
  set: function (theme) {
    localStorage.setItem('sh_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  },
  toggle: function () {
    var next = this.get() === 'dark' ? 'light' : 'dark';
    this.set(next);
    return next;
  }
};
