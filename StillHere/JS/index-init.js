window.SH_SESSION.whenReady(function (user) {
  /* Index navbar mirrors main.html exactly. While the session is
     loading we keep showing the guest navbar (login CTA visible,
     profile + burger hidden). Once we know the auth state:
       • Guest:  login visible, profile + burger hidden (no-op).
       • Authed: hide login, show profile (session.js fills the
         username label) and the burger menu. */
  if (!user) return;
  var loginLink   = document.getElementById('navLoginLink');
  var profileLink = document.getElementById('navProfileLink');
  var burger      = document.getElementById('navMenuDropdown');
  /* Use style.display in addition to .hidden - the [hidden] attribute
     has the same specificity as `.nav-link`, so .nav-link's
     `display:inline-flex` wins and the element stays visible. Setting
     style.display explicitly is the cleanest override. */
  if (loginLink)   { loginLink.hidden   = true;  loginLink.style.display   = 'none'; }
  if (profileLink) { profileLink.hidden = false; profileLink.style.display = ''; }
  if (burger)      { burger.hidden      = false; burger.style.display      = ''; }
});

(function () {
  var fab = document.getElementById('themeFab');
  if (!fab || !window.SH_THEME) return;

  fab.addEventListener('click', function () {
    window.SH_THEME.toggle();

    fab.style.transition = 'none';
    fab.style.transform  = 'scale(0.88) rotate(-15deg)';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fab.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
        fab.style.transform  = 'scale(1) rotate(0deg)';
      });
    });
  });
})();
