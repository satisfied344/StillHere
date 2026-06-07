/* ══════════════════════════════════════════════════════════════════
   u-page.js - public profile renderer.
   URL: /u?u=<username>
   Loads the profile by username + that user's posts, reusing the same
   .post-card markup as the main feed so the visual language is 1:1.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Liked posts (shared with main feed via same localStorage key) ── */
  var _uLiked = (function () {
    try { return new Set(JSON.parse(localStorage.getItem('sh_liked_posts') || '[]')); }
    catch (_) { return new Set(); }
  })();
  function _uSaveLiked() {
    try { localStorage.setItem('sh_liked_posts', JSON.stringify([..._uLiked])); } catch (_) {}
  }

  function _uToast(msg) {
    var t = document.getElementById('uPageToast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(_uToast._timer);
    _uToast._timer = setTimeout(function () { t.classList.remove('is-visible'); }, 2800);
  }

  /* ── Action handler: support (heart) and share ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var postId = btn.getAttribute('data-post-id');
    if (!action || !postId) return;
    e.preventDefault();
    e.stopPropagation();

    if (action === 'support') {
      var active = btn.classList.toggle('post-actions-item--active');
      var titleEl = btn.querySelector('.action-title');
      if (titleEl && window.SH_I18N) {
        titleEl.textContent = active
          ? window.SH_I18N.t('main.post.support.active')
          : window.SH_I18N.t('main.post.support');
      }
      if (active) _uLiked.add(postId); else _uLiked.delete(postId);
      _uSaveLiked();
      _uToast(window.SH_I18N
        ? window.SH_I18N.t(active ? 'main.toast.presence' : 'main.toast.presence.off')
        : (active ? 'they know someone is here.' : 'okay - quietly stepping back.'));
      /* Persist to DB */
      if (window._sbClient) {
        var fn = active ? 'increment_support' : 'decrement_support';
        window._sbClient.rpc(fn, { post_id: postId }).then(function (r) {
          if (r && r.error) console.warn('[u-support-rpc]', fn, r.error.message);
        });
      }
    }

    if (action === 'share') {
      var url = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'post?id=' + postId;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          _uToast(window.SH_I18N ? window.SH_I18N.t('main.toast.linkcopied') : 'Link copied');
        });
      }
    }
  });

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    var qs = new URLSearchParams(window.location.search);
    var username = (qs.get('u') || qs.get('user') || '').trim().toLowerCase();
    if (!username) {
      /* No `?u=` → there's no profile to view. 404 is the correct
         response, not a content-area error. */
      location.replace('/404.html');
      return;
    }
    if (!window.supabase || !window.SH_SUPABASE_URL) {
      showError((window.SH_I18N && window.SH_I18N.t)
        ? window.SH_I18N.t('u.err.service')
        : 'Service unavailable.');
      return;
    }
    if (!window._sbClient) {
      window._sbClient = window.supabase.createClient(window.SH_SUPABASE_URL, window.SH_SUPABASE_KEY);
    }
    var sb = window._sbClient;

    loadProfile(sb, username);
  }

  /* ──────────────────────────────────────────────────────────────
     A. Profile load
     ────────────────────────────────────────────────────────────── */
  function loadProfile(sb, username) {
    sb.from('profiles')
      .select('id, username, display_name, avatar_url, created_at')
      .eq('username', username)
      .maybeSingle()
      .then(function (res) {
        if (res.error || !res.data) {
          /* Profile doesn't exist (or RLS hid it) → 404 page. */
          location.replace('/404.html');
          return;
        }
        renderHeader(res.data);
        applyDocumentMeta(res.data);
        loadStories(sb, res.data);
      });
  }

  function renderHeader(p) {
    var displayName = (p.display_name && p.display_name.trim()) || p.username;

    /* Hero - left side (big Caveat name + tagline) */
    var heroSpan = document.getElementById('heroNameSpan');
    if (heroSpan) heroSpan.textContent = displayName;

    /* Profile card on the right */
    var nameEl   = document.getElementById('pfName');
    var handleEl = document.getElementById('pfHandle');
    var avatarEl = document.getElementById('pfAvatar');
    var joinedEl = document.getElementById('pfJoined');

    if (nameEl)   nameEl.textContent   = displayName;
    if (handleEl) handleEl.textContent = '@' + p.username;
    if (joinedEl) {
      var span = joinedEl.querySelector('span');
      if (span) {
        /* "here since {month year}" - prefix is i18n, the date is
           localised via toLocaleDateString below. */
        var prefix = (window.SH_I18N && window.SH_I18N.t)
          ? window.SH_I18N.t('u.card.joined')
          : 'here since';
        span.textContent = prefix + ' ' + formatJoined(p.created_at);
      }
    }
    if (avatarEl && p.avatar_url) {
      avatarEl.innerHTML = '<img src="' + escAttr(p.avatar_url) + '" alt="" loading="lazy">';
    }
  }

  function applyDocumentMeta(p) {
    var displayName = (p.display_name && p.display_name.trim()) || p.username;
    document.title = displayName + ' (@' + p.username + ') - StillHere';

    var url = 'https://www.stillhere.global/u?u=' + encodeURIComponent(p.username);
    setMeta('description', 'Stories shared by @' + p.username + ' on StillHere - anonymous, free, no advice.');
    setLink('canonical', url);

    // Open Graph + Twitter
    setMeta('og:title', displayName + ' - StillHere', true);
    setMeta('og:description', 'Quiet stories from @' + p.username + '.', true);
    setMeta('og:url', url, true);
    setMeta('og:type', 'profile', true);
    setMeta('og:image', p.avatar_url || 'https://www.stillhere.global/assets/favicon/og-image.svg', true);
    setMeta('twitter:card', 'summary');
    setMeta('twitter:title', displayName + ' - StillHere');
    setMeta('twitter:description', 'Quiet stories from @' + p.username + '.');
  }

  function setMeta(name, content, isOg) {
    var attr = isOg ? 'property' : 'name';
    var el = document.head.querySelector('meta[' + attr + '="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }
  function setLink(rel, href) {
    var el = document.head.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function showError(msg) {
    var heroSpan = document.getElementById('heroNameSpan');
    var lede     = document.getElementById('heroLede');
    var card     = document.querySelector('.pf-hero-right');
    var sections = document.querySelectorAll('.pf-section, .pf-closing');
    var notHere  = (window.SH_I18N && window.SH_I18N.t)
      ? window.SH_I18N.t('u.err.notfound')
      : 'not here';
    if (heroSpan) heroSpan.textContent = notHere;
    if (lede)     lede.textContent     = msg;
    if (card)     card.style.display   = 'none';
    sections.forEach(function (s) { s.style.display = 'none'; });
  }

  /* ──────────────────────────────────────────────────────────────
     B. Stories load - same .post-card markup as the feed
     ────────────────────────────────────────────────────────────── */
  function loadStories(sb, profile) {
    sb.from('posts')
      .select('*, comments(count)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(40)
      .then(function (res) {
        if (res.error) {
          // try without comments join (RLS / column missing)
          sb.from('posts')
            .select('*')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(40)
            .then(function (r2) { renderStories(profile, r2.data || []); });
          return;
        }
        renderStories(profile, res.data || []);
      });
  }

  function renderStories(profile, posts) {
    var totalSupport = 0;
    posts.forEach(function (p) { totalSupport += p.support_count || 0; });

    /* Stats row - 3 metrics in profile.html style */
    var elStories = document.getElementById('statStories');
    var elSupport = document.getElementById('statSupport');
    var elDays    = document.getElementById('statDays');
    if (elStories) elStories.textContent = String(posts.length);
    if (elSupport) elSupport.textContent = String(totalSupport);
    if (elDays && profile.created_at) {
      var days = Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000));
      elDays.textContent = String(days);
    }

    var container = document.getElementById('uStories');
    if (!container) return;

    if (!posts.length) {
      var t = (window.SH_I18N && window.SH_I18N.t)
        ? window.SH_I18N.t
        : function (_, fb) { return fb; };
      container.innerHTML =
        '<div class="u-empty"><em>' +
          (t('u.empty.tag', 'quiet here') || 'quiet here') +
        '</em>' +
          (t('u.empty.text', 'no stories yet - they\'re just listening.') || 'no stories yet - they\'re just listening.') +
        '</div>';
      return;
    }

    container.innerHTML = '';
    posts.forEach(function (p) {
      p.profiles = {
        username:     profile.username,
        display_name: profile.display_name,
        avatar_url:   profile.avatar_url
      };
      var liveCount = (p.comments && p.comments[0]) ? (p.comments[0].count || 0) : 0;
      p.comment_count = liveCount;
      container.insertAdjacentHTML('beforeend', buildPostCard(p));
    });
  }

  /* ──────────────────────────────────────────────────────────────
     C. Card builder - clone of main-page.js buildPostCard MINUS
     the in-feed delete/edit menu (this is a public view).
     ────────────────────────────────────────────────────────────── */
  function buildPostCard(post) {
    var title    = post.title ? escHtml(post.title) : '';
    var plain    = stripHtml(post.content || '');
    var preview  = escHtml(plain.length > 220 ? plain.slice(0, 220) + '…' : plain);
    var id       = escAttr(post.id);
    var uname    = (post.profiles && post.profiles.username) || '';
    var displayN = (post.profiles && (post.profiles.display_name || post.profiles.username)) || 'Anonymous';
    var avatarTag = post.profiles && post.profiles.avatar_url
      ? '<img src="' + escAttr(post.profiles.avatar_url) + '" alt="Avatar" class="post-avatar-img">'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
    /* Avatar + name both link to the user's public profile; whole-
       card click handler skips `.post-avatar-link` and `.post-author-link`. */
    var avatarHtml = uname
      ? '<a class="post-avatar post-avatar-link" href="u?u=' + escAttr(uname) + '" aria-label="' + escAttr(displayN) + '">' + avatarTag + '</a>'
      : '<div class="post-avatar">' + avatarTag + '</div>';
    var authorHtml = uname
      ? '<a class="post-author post-author-link" href="u?u=' + escAttr(uname) + '">' + escHtml(displayN) + '</a>'
      : '<span class="post-author">' + escHtml(displayN) + '</span>';

    /* Markup mirrors main-page.js buildPostCard exactly: same icons,
       same labels ("I'm here", "Responses", "Share"). Heart shows NO
       count (mirrors the feed - count only appears via JS on click). */
    var i18nLabel = function (k, fb) { return window.SH_I18N ? window.SH_I18N.t(k) : fb; };
    return (
      '<article class="post-card" data-post-id="' + id + '">' +
        '<div class="post-header">' +
          '<div class="post-author-info">' +
            avatarHtml +
            '<div class="post-include-info">' +
              authorHtml +
              '<span class="post-time">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg> ' +
                timeAgo(post.created_at) +
              '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="post-content">' +
          '<h2 class="post-title">' +
            '<a href="post?id=' + id + '">' + (title || '<em>(no title)</em>') + '</a>' +
          '</h2>' +
          '<div class="post-tags">' + buildTagsHtml(post) + '</div>' +
          '<p class="post-preview">' + preview + '</p>' +
        '</div>' +

        '<div class="post-actions">' +
          /* "I'm here" - button, in-place support (no navigation) */
          '<button type="button" class="post-actions-item' + (_uLiked.has(id) ? ' post-actions-item--active' : '') + '" data-action="support" data-post-id="' + id + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
              '<path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z"/>' +
            '</svg>' +
            '<span class="action-title">' + i18nLabel(_uLiked.has(id) ? 'main.post.support.active' : 'main.post.support', "I'm here") + '</span>' +
          '</button>' +
          /* Responses - link to post comments */
          '<a class="post-actions-item" href="post?id=' + id + '#comments">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
              '<path d="M116,128a12,12,0,1,1,12,12A12,12,0,0,1,116,128ZM84,140a12,12,0,1,0-12-12A12,12,0,0,0,84,140Zm88,0a12,12,0,1,0-12-12A12,12,0,0,0,172,140Zm60-76V192a16,16,0,0,1-16,16H83l-32.6,28.16-.09.07A15.89,15.89,0,0,1,40,240a16.13,16.13,0,0,1-6.8-1.52A15.85,15.85,0,0,1,24,224V64A16,16,0,0,1,40,48H216A16,16,0,0,1,232,64ZM40,224h0ZM216,64H40V224l34.77-30A8,8,0,0,1,80,192H216Z"/>' +
            '</svg>' +
            '<span class="action-stat">' + (post.comment_count || 0) + '</span>' +
            '<span class="action-title">' + i18nLabel('main.post.responses', 'Responses') + '</span>' +
          '</a>' +
          /* Share - button, copies link in-place */
          '<button type="button" class="post-actions-item" data-action="share" data-post-id="' + id + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" class="icon" aria-hidden="true">' +
              '<path d="M176,160a39.89,39.89,0,0,0-28.62,12.09l-46.1-29.63a39.8,39.8,0,0,0,0-28.92l46.1-29.63a40,40,0,1,0-8.66-13.45l-46.1,29.63a40,40,0,1,0,0,55.82l46.1,29.63A40,40,0,1,0,176,160Zm0-128a24,24,0,1,1-24,24A24,24,0,0,1,176,32ZM64,152a24,24,0,1,1,24-24A24,24,0,0,1,64,152Zm112,72a24,24,0,1,1,24-24A24,24,0,0,1,176,224Z"/>' +
            '</svg>' +
            '<span class="action-title">' + i18nLabel('main.post.share', 'Share') + '</span>' +
          '</button>' +
        '</div>' +
      '</article>'
    );
  }

  function buildTagsHtml(post) {
    var html = '<span class="tag tag-lang">' + escHtml((post.lang || 'en').toUpperCase()) + '</span>';
    (post.topics || []).forEach(function (topic) {
      var topicLabel = (window.SH_I18N && window.SH_I18N.t('main.side.topic.' + topic));
      if (!topicLabel || topicLabel === 'main.side.topic.' + topic) {
        topicLabel = topic.charAt(0).toUpperCase() + topic.slice(1);
      }
      html += '<a class="tag tag-topic" href="main?topic=' + escAttr(topic) + '">' +
              escHtml(topicLabel) +
              '</a>';
    });
    if (post.mode === 'no-advice') {
      /* Same hover/focus tooltip vocabulary as main-page.js so users
         get the same "presence, not advice" explanation everywhere. */
      var naTip = window.SH_I18N
        ? window.SH_I18N.t('main.tooltip.noadvice')
        : 'they asked for presence, not advice.';
      html += '<span class="tag tag-mode tag-no-advice"' +
        ' tabindex="0" role="note"' +
        ' aria-label="' + escAttr(naTip) + '"' +
        ' data-presence-tooltip="' + escAttr(naTip) + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.56,87.56,0,0,1-20.41,56.28L71.72,60.4A88,88,0,0,1,216,128ZM40,128A87.56,87.56,0,0,1,60.41,71.72L184.28,195.6A88,88,0,0,1,40,128Z"/></svg> ' +
        ((window.SH_I18N && window.SH_I18N.t('main.filter.noadvice')) || 'No Advice') + '</span>';
    } else {
      html += '<span class="tag tag-mode tag-need-support"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40Z"/></svg> ' +
        ((window.SH_I18N && window.SH_I18N.t('main.filter.need')) || 'Need Support') + '</span>';
    }
    return html;
  }

  /* ──────────────────────────────────────────────────────────────
     D. Utilities
     ────────────────────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escAttr(s) { return escHtml(s).replace(/'/g, '&#39;'); }
  function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function timeAgo(iso) {
    if (!iso) return '';
    var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff / 60)   + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }
  function formatJoined(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    /* Use the active i18n language for the locale so "May 2026"
       renders as "май 2026" in Russian. Falls back to en-GB. */
    var lang = (window.SH_I18N && window.SH_I18N.getLang)
      ? window.SH_I18N.getLang()
      : 'en';
    var locale = lang === 'ru' ? 'ru-RU' : 'en-GB';
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  /* Whole-card click → open post (mirrors main.html behaviour). */
  document.addEventListener('click', function (e) {
    if (e.target.closest('a, button, .post-actions-item, .tag-topic, input, textarea, label')) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && sel.toString().length > 0) return;
    var card = e.target.closest('.post-card[data-post-id]');
    if (!card) return;
    var pid = card.getAttribute('data-post-id');
    if (pid) window.location.href = 'post?id=' + encodeURIComponent(pid);
  });
})();
