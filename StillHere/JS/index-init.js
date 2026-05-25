window.SH_SESSION.whenReady(function (user) {
  if (!user) return;
  var loginLink = document.getElementById('navLoginLink');
  if (loginLink) {
    loginLink.href = 'nav-bar/profile.html';
    loginLink.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
      '<path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z"/>' +
      '</svg>' +
      '<span>' + (user.displayName || user.username) + '</span>';
  }
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
