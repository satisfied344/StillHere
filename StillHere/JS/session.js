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
