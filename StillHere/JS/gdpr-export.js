/* ═══════════════════════════════════════════════════════════════════
   gdpr-export.js - "download my data" on the profile page.

   GDPR Article 15 (right of access) + Article 20 (portability):
   the user can request and receive ALL personal data we hold about
   them, in a machine-readable format, at any time.

   We assemble the export client-side from Supabase using the user's
   own session - RLS already restricts every SELECT to "id = auth.uid()
   OR user_id = auth.uid()", so the user can only ever fetch their
   own rows. No new server endpoint required.

   The button + status text are wired up in profile.html. We just
   need:
     1) wait for SH_SESSION
     2) reveal the section
     3) on click → query, package, download
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.SH_SESSION) return;

  window.SH_SESSION.whenReady(function (user) {
    var section = document.getElementById('pf-data-section');
    var btn     = document.getElementById('exportDataBtn');
    var status  = document.getElementById('exportDataStatus');
    if (!section || !btn) return;

    // Signed-out users get no export panel at all - nothing to export.
    if (!user) return;
    section.style.display = '';

    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      btn.disabled = true;
      setStatus(status, t('pf.data.preparing', 'preparing your data…'), '');

      buildExport(user).then(function (bundle) {
        downloadJson(bundle, fileName(user));
        setStatus(status, t('pf.data.ok', 'downloaded.'), 'is-ok');
      }).catch(function (err) {
        console.warn('[gdpr-export]', err);
        setStatus(status, t('pf.data.error', 'something went wrong - try again.'), 'is-error');
      }).then(function () {
        btn.disabled = false;
        // Clear status after a few seconds so the section stays calm.
        setTimeout(function () { setStatus(status, '', ''); }, 6000);
      });
    });
  });

  function t(key, fallback) {
    return (window.SH_I18N && window.SH_I18N.t)
      ? (window.SH_I18N.t(key) || fallback)
      : fallback;
  }

  function setStatus(el, text, cls) {
    if (!el) return;
    el.textContent = text;
    el.className = 'pf-data-status' + (cls ? ' ' + cls : '');
  }

  function getDb() {
    if (window._sbClient) return window._sbClient;
    if (window.supabase && window.SH_SUPABASE_URL && window.SH_SUPABASE_KEY) {
      window._sbClient = window.supabase.createClient(
        window.SH_SUPABASE_URL, window.SH_SUPABASE_KEY
      );
      return window._sbClient;
    }
    throw new Error('Supabase client unavailable');
  }

  /* Assemble the bundle. Each fetch is guarded - if a table doesn't
     exist on this deployment, or RLS hides it, we just record it as
     null and keep going. Partial > nothing. */
  async function buildExport(user) {
    var db = getDb();
    var bundle = {
      schema_version: 1,
      exported_at:    new Date().toISOString(),
      generator:      'StillHere GDPR export',
      legal_basis:    'GDPR Art. 15 (access) / Art. 20 (portability)',
      account: {
        id:           user.id,
        username:     user.username    || null,
        display_name: user.displayName || null,
        avatar_url:   user.avatarUrl   || null,
        joined_at:    user.createdAt   || null
      }
    };

    bundle.profile       = await safeFetch(db, 'profiles',          { eq: { id: user.id } });
    bundle.posts         = await safeFetch(db, 'posts',             { eq: { user_id: user.id } });
    bundle.comments      = await safeFetch(db, 'comments',          { eq: { user_id: user.id } });
    bundle.reactions     = await safeFetch(db, 'reactions',         { eq: { user_id: user.id } });
    bundle.saved_posts   = await safeFetch(db, 'saved_posts',       { eq: { user_id: user.id } });
    bundle.notifications = await safeFetch(db, 'notifications',     { eq: { user_id: user.id } });
    bundle.reports       = await safeFetch(db, 'reports',           { eq: { reporter_id: user.id } });

    return bundle;
  }

  /* Single-table fetch with a defensive shape: returns the row array
     on success, or { _unavailable: <reason> } so the export still
     surfaces that we tried. */
  function safeFetch(db, table, opts) {
    var q = db.from(table).select('*');
    if (opts && opts.eq) {
      Object.keys(opts.eq).forEach(function (col) {
        q = q.eq(col, opts.eq[col]);
      });
    }
    return q.then(function (res) {
      if (res.error) {
        // Missing-table errors (PGRST or 404) → quietly note them.
        return { _unavailable: res.error.message || String(res.error) };
      }
      return res.data || [];
    }).catch(function (err) {
      return { _unavailable: String(err && err.message || err) };
    });
  }

  function fileName(user) {
    var stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    var who   = (user.username || 'me').replace(/[^a-z0-9_-]/gi, '');
    return 'stillhere-' + who + '-' + stamp + '.json';
  }

  function downloadJson(obj, name) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
})();
