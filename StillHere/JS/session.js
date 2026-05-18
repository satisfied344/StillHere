(function () {
  'use strict';

  var _sb = null;
  function getSB() {
    if (_sb) return _sb;
    _sb = window.supabase.createClient(window.SH_SUPABASE_URL, window.SH_SUPABASE_KEY);
    return _sb;
  }

  var _ready     = false;
  var _user      = null;
  var _callbacks = [];

  var SHS = {
    get user() { return _user; },
    get ready() { return _ready; },

    whenReady: function (cb) {
      if (_ready) { try { cb(_user); } catch (e) {} return; }
      _callbacks.push(cb);
    },

    signOut: async function () {
      await getSB().auth.signOut();
      try { localStorage.removeItem('sh_username'); } catch (_) {}
    }
  };

  window.SH_SESSION = SHS;

  function fire(user) {
    _user  = user;
    _ready = true;
    _callbacks.forEach(function (cb) { try { cb(user); } catch (e) {} });
    _callbacks = [];
    document.dispatchEvent(new CustomEvent('sh:session', { detail: user }));

    /* ── Auto-decorate the navbar everywhere ───────────────────
       Runs after session is loaded so every page that includes
       session.js gets the same behavior:
         • The "profile" link in the top nav shows the user's name
           (display name → username → "profile")
         • The dropdown's "Login" item swaps to "Sign out"
       Idempotent: if a page already swapped them, we still respect
       the user object (we just rewrite the visible label).
    ────────────────────────────────────────────────────────────── */
    try { decorateNavForSession(user); } catch (e) {}
  }

  function decorateNavForSession(user) {
    /* 1) Profile nav link → user.displayName or @username when logged in */
    var profileLink =
         document.querySelector('.nav-link[href$="nav-bar/profile.html"]')
      || document.querySelector('.nav-link[href="profile.html"]')
      || document.querySelector('.nav .nav-link[href*="profile.html"]');

    if (profileLink) {
      var labelEl = profileLink.querySelector('span');
      if (user && labelEl) {
        var name = (user.displayName && String(user.displayName).trim()) ||
                   (user.username    && String(user.username).trim())    ||
                   'profile';
        /* Trim long names so they don't break the nav layout */
        if (name.length > 18) name = name.slice(0, 17) + '…';
        labelEl.textContent = name;
        profileLink.setAttribute('title', name);
      }
    }

    /* 2) Dropdown "Login" → "Sign out" when logged in */
    var loginItem = document.querySelector('.mmenu-item--login');
    if (loginItem && user && !loginItem.dataset.shAuthSwapped) {
      loginItem.dataset.shAuthSwapped = '1';
      loginItem.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
        '<path d="M112,216a8,8,0,0,1-8,8H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h56a8,8,0,0,1,0,16H48V208h56A8,8,0,0,1,112,216Z' +
        'M218.83,130.83l-40,40a8,8,0,0,1-11.32-11.32L192.69,136H104a8,8,0,0,1,0-16h88.69L167.51,96.49a8,8,0,1,1,11.32-11.32l40,40A8,8,0,0,1,218.83,130.83Z"/></svg>' +
        'Sign out';
      loginItem.removeAttribute('href');
      loginItem.style.cursor = 'pointer';
      loginItem.addEventListener('click', async function (e) {
        e.preventDefault();
        await SHS.signOut();
        /* Find the right login URL relative to the current page */
        var loginHref = location.pathname.indexOf('/nav-bar/') !== -1
          ? '../login.html'
          : 'login.html';
        window.location.href = loginHref;
      });
    }
  }

  async function load() {
    try {
      var sb = getSB();
      var { data: { session } } = await sb.auth.getSession();
      if (!session || !session.user) { fire(null); return; }

      /* Try to fetch profile including avatar_url; fall back if column missing */
      var profile = null;
      var { data: profileFull, error: profileErr } = await sb
        .from('profiles')
        .select('username, display_name, created_at, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileErr && profileErr.message && profileErr.message.includes('avatar_url')) {
        /* Column not yet added — retry without it */
        var { data: profileBasic } = await sb
          .from('profiles')
          .select('username, display_name, created_at')
          .eq('id', session.user.id)
          .maybeSingle();
        profile = profileBasic;
      } else {
        profile = profileFull;
      }

      /* ── Auto-create profile if missing ──────────────────────────
         Happens when there's no DB trigger and the user registered
         before the explicit insert was added to auth.js.
         We read the username/display_name from Supabase auth metadata
         (stored there during signUp) and upsert into profiles.
      ────────────────────────────────────────────────────────────── */
      if (!profile && session.user) {
        var meta   = session.user.user_metadata || {};
        var uname  = meta.username     || localStorage.getItem('sh_username') || ('user_' + session.user.id.slice(0, 8));
        var dname  = meta.display_name || null;
        try {
          var upsertRes = await sb.from('profiles').upsert(
            { id: session.user.id, username: uname, display_name: dname, avatar_url: null },
            { onConflict: 'id' }
          );
          if (!upsertRes.error) {
            profile = { username: uname, display_name: dname, avatar_url: null, created_at: session.user.created_at };
          }
        } catch (_) {}
      }

      fire({
        id:          session.user.id,
        username:    profile ? profile.username     : (localStorage.getItem('sh_username') || 'user'),
        displayName: profile ? (profile.display_name || profile.username) : null,
        createdAt:   profile ? profile.created_at   : session.user.created_at,
        avatarUrl:   profile ? (profile.avatar_url  || null) : null
      });
    } catch (err) {
      console.warn('SH_SESSION load error:', err);
      fire(null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
}());
