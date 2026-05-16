/* ══════════════════════════════════════════════════════
   ai-chat.js — real chat: OpenAI API + user auth + history
   ══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ────────────────────────────────────────────────
     0. Tiny helpers
     ──────────────────────────────────────────────── */
  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.from((root || document).querySelectorAll(sel)); };
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uid() { return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
  function nowIso() { return new Date().toISOString(); }

  /* ────────────────────────────────────────────────
     1. Navbar dropdown + scroll-shrink
     ──────────────────────────────────────────────── */
  $$('.main-menu-dropdown').forEach(function (wrap) {
    var btn   = wrap.querySelector('.main-menu-trigger');
    var panel = wrap.querySelector('.main-menu-panel');
    if (!btn || !panel) return;
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
  });
  document.addEventListener('click', function () {
    $$('.main-menu-panel.is-open').forEach(function (p) {
      p.classList.remove('is-open');
      var b = p.closest('.main-menu-dropdown').querySelector('.main-menu-trigger');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  });

  (function () {
    var navEl = $('.top-info');
    if (!navEl) return;
    var last = false;
    window.addEventListener('scroll', function () {
      var s = window.scrollY > 24;
      if (s !== last) { navEl.classList.toggle('is-scrolled', s); last = s; }
    }, { passive: true });
  })();

  /* ────────────────────────────────────────────────
     2. Delete confirmation modal
     ──────────────────────────────────────────────── */
  var delBackdrop  = $('#chatDelBackdrop');
  var delConfirmEl = $('#chatDelConfirm');
  var delCancelEl  = $('#chatDelCancel');
  var _delCallback = null;

  function showDelModal(onConfirm) {
    _delCallback = onConfirm;
    if (delBackdrop) {
      delBackdrop.classList.add('is-open');
      delBackdrop.setAttribute('aria-hidden', 'false');
      if (delConfirmEl) delConfirmEl.focus();
    }
  }
  function closeDelModal() {
    if (delBackdrop) {
      delBackdrop.classList.remove('is-open');
      delBackdrop.setAttribute('aria-hidden', 'true');
    }
    _delCallback = null;
  }
  if (delConfirmEl) {
    delConfirmEl.addEventListener('click', function () {
      var cb = _delCallback;
      closeDelModal();
      if (cb) cb();
    });
  }
  if (delCancelEl) delCancelEl.addEventListener('click', closeDelModal);
  if (delBackdrop) {
    delBackdrop.addEventListener('click', function (e) {
      if (e.target === delBackdrop) closeDelModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && delBackdrop && delBackdrop.classList.contains('is-open')) closeDelModal();
  });

  /* ────────────────────────────────────────────────
     3. Sidebar toggle (collapse + REOPEN)
     ──────────────────────────────────────────────── */
  var page         = $('.chat-page');
  var collapseBtn  = $('.sidebar-toggle');
  var reopenBtn    = $('#sidebarReopen');

  function setSidebar(open) {
    if (!page) return;
    page.classList.toggle('is-sidebar-collapsed', !open);
  }
  if (collapseBtn) collapseBtn.addEventListener('click', function () { setSidebar(false); });
  if (reopenBtn)   reopenBtn  .addEventListener('click', function () { setSidebar(true);  });

  /* ────────────────────────────────────────────────
     3. User identity — pulled from SH_SESSION
     ──────────────────────────────────────────────── */
  var currentUser = {
    name:   'you',
    initial:'·',
    avatar: null,
    id:     null
  };

  function applyUser(u) {
    if (!u) {
      /* Anonymous / signed-out — reload history under "guest" bucket */
      if (typeof startFresh === 'function') startFresh();
      return;
    }
    currentUser.id     = u.id || null;
    currentUser.name   = (u.displayName || u.username || 'you');
    currentUser.avatar = u.avatarUrl || null;
    currentUser.initial = currentUser.name.trim().charAt(0).toLowerCase() || '·';
    /* If any messages are already rendered, refresh their author labels */
    $$('.msg--you .msg-who').forEach(function (el) { el.textContent = currentUser.name; });
    refreshSelfAvatars();

    /* Re-render sidebar history with this user's chats (closes any open chat
       that may have been showing from a stale "guest" view) */
    if (typeof startFresh === 'function') startFresh();

    /* Reflect in login menu item */
    var loginItem = $('.mmenu-item--login');
    if (loginItem && u) {
      loginItem.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">' +
        '<path d="M112,216a8,8,0,0,1-8,8H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h56a8,8,0,0,1,0,16H48V208h56A8,8,0,0,1,112,216Z' +
        'M218.83,130.83l-40,40a8,8,0,0,1-11.32-11.32L192.69,136H104a8,8,0,0,1,0-16h88.69L167.51,96.49a8,8,0,1,1,11.32-11.32l40,40A8,8,0,0,1,218.83,130.83Z"/></svg>' +
        'Sign out';
      loginItem.removeAttribute('href');
      loginItem.style.cursor = 'pointer';
      loginItem.addEventListener('click', async function (e) {
        e.preventDefault();
        await window.SH_SESSION.signOut();
        window.location.href = 'login.html';
      });
    }
  }
  function refreshSelfAvatars() {
    $$('.msg--you .msg-avatar').forEach(function (el) {
      renderAvatarInto(el, currentUser);
    });
  }
  function renderAvatarInto(el, user) {
    el.innerHTML = '';
    if (user && user.avatar) {
      var img = document.createElement('img');
      img.src = user.avatar; img.alt = ''; img.className = 'avatar-img';
      el.appendChild(img);
    } else {
      el.textContent = (user && user.initial) || '·';
    }
  }

  if (window.SH_SESSION && window.SH_SESSION.whenReady) {
    window.SH_SESSION.whenReady(applyUser);
  }

  /* ────────────────────────────────────────────────
     4. Local chat store (browser localStorage) — scoped per user
     Each chat: { id, title, createdAt, updatedAt, messages: [{role, content, ts}] }

     The storage key includes the current user id, so chats stay with their
     account. Signed-out / anonymous users get a separate "guest" bucket.
     ──────────────────────────────────────────────── */
  function storeKey() {
    var uid = (window.SH_SESSION && window.SH_SESSION.user && window.SH_SESSION.user.id)
      || (currentUser && currentUser.id)
      || 'guest';
    return 'sh_ai_chats_v1_' + uid;
  }
  var activeChatId = null;

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(storeKey()) || '[]'); }
    catch (_) { return []; }
  }
  function saveAll(list) {
    try { localStorage.setItem(storeKey(), JSON.stringify(list)); } catch (_) {}
  }
  function getChat(id) { return loadAll().find(function (c) { return c.id === id; }) || null; }
  function upsertChat(chat) {
    var list = loadAll();
    var i = list.findIndex(function (c) { return c.id === chat.id; });
    if (i >= 0) list[i] = chat; else list.unshift(chat);
    saveAll(list);
  }
  function deleteChat(id) {
    saveAll(loadAll().filter(function (c) { return c.id !== id; }));
  }
  function createChat() {
    var chat = {
      id: uid(),
      title: 'new conversation',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      messages: []
    };
    upsertChat(chat);
    return chat;
  }

  /* ────────────────────────────────────────────────
     5. Render: sidebar history
     ──────────────────────────────────────────────── */
  var historyEl   = $('#chatHistory');
  var historyEmpty= $('#historyEmpty');

  function bucketLabel(iso) {
    var d = new Date(iso);
    var now = new Date();
    var dayMs = 86400000;
    var diff = (now - d) / dayMs;
    if (diff < 1 && d.getDate() === now.getDate()) return 'today';
    if (diff < 7) return 'this week';
    return 'earlier';
  }

  function renderHistory() {
    var chats = loadAll();
    if (!historyEl) return;
    historyEl.innerHTML = '';

    if (!chats.length) {
      historyEl.innerHTML =
        '<div class="history-empty" id="historyEmpty">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48H40A16,16,0,0,0,24,64V224a15.85,15.85,0,0,0,9.24,14.5A16.05,16.05,0,0,0,40,240a15.89,15.89,0,0,0,10.25-3.78L82.5,208H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,144H82.5a16,16,0,0,0-10.25,3.78L40,224V64H216Z"/></svg>' +
        '<p>no conversations yet.<br>start one above.</p></div>';
      return;
    }

    /* Group by bucket */
    var buckets = { 'today': [], 'this week': [], 'earlier': [] };
    chats.forEach(function (c) { buckets[bucketLabel(c.updatedAt)].push(c); });

    Object.keys(buckets).forEach(function (label) {
      var items = buckets[label];
      if (!items.length) return;
      var section = document.createElement('div');
      section.className = 'history-section';
      section.innerHTML = '<span class="history-label">' + label + '</span><ul class="history-list"></ul>';
      var ul = section.querySelector('.history-list');

      items.forEach(function (c) {
        var snippet = '';
        for (var i = c.messages.length - 1; i >= 0; i--) {
          if (c.messages[i].role === 'user') { snippet = c.messages[i].content; break; }
        }
        var li = document.createElement('li');
        li.className = 'history-item' + (c.id === activeChatId ? ' is-active' : '');
        li.dataset.id = c.id;
        li.innerHTML =
          '<svg class="history-dot" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="3"/></svg>' +
          '<div class="history-meat">' +
            '<span class="history-title">' + escapeHtml(c.title || 'untitled') + '</span>' +
            '<span class="history-snippet">' + escapeHtml(snippet || '…') + '</span>' +
          '</div>' +
          '<button class="history-menu" aria-label="Delete">×</button>';
        li.addEventListener('click', function (e) {
          if (e.target.closest('.history-menu')) {
            showDelModal(function () {
              deleteChat(c.id);
              if (c.id === activeChatId) startFresh();
              renderHistory();
            });
            return;
          }
          openChat(c.id);
        });
        ul.appendChild(li);
      });
      historyEl.appendChild(section);
    });
  }

  /* ────────────────────────────────────────────────
     6. Render: messages stream
     ──────────────────────────────────────────────── */
  var streamEl  = $('#chatStream');
  var welcomeEl = $('#chatWelcome');

  var doodlesEl = $('#welcomeDoodles');
  function showWelcome(show) {
    if (welcomeEl) welcomeEl.hidden = !show;
    if (streamEl)  streamEl.hidden  = show;
    if (doodlesEl) doodlesEl.classList.toggle('is-hidden', !show);
  }

  function appendMsg(role, text, opts) {
    if (!streamEl) return null;
    opts = opts || {};
    var who    = role === 'user' ? currentUser.name : 'stillhere';
    var roleCls= role === 'user' ? 'you' : 'ai';
    var msg = document.createElement('div');
    msg.className = 'msg msg--' + roleCls + (opts.pending ? ' is-pending' : '');
    msg.innerHTML =
      '<div class="msg-avatar" aria-hidden="true"></div>' +
      '<div class="msg-bubble">' +
        '<span class="msg-who">' + escapeHtml(who) + '</span>' +
        '<p class="msg-text"></p>' +
      '</div>';
    var av = msg.querySelector('.msg-avatar');
    if (role === 'user') {
      renderAvatarInto(av, currentUser);
    } else {
      av.textContent = '✦';
    }
    msg.querySelector('.msg-text').textContent = text || '';
    streamEl.appendChild(msg);
    streamEl.scrollTop = streamEl.scrollHeight;
    return msg;
  }

  function renderMessages(chat) {
    if (!streamEl) return;
    streamEl.innerHTML = '';
    if (!chat || !chat.messages.length) { showWelcome(true); return; }
    showWelcome(false);
    chat.messages.forEach(function (m) {
      appendMsg(m.role === 'user' ? 'user' : 'ai', m.content);
    });
  }

  /* ────────────────────────────────────────────────
     7. Open / fresh chat helpers
     ──────────────────────────────────────────────── */
  function openChat(id) {
    var chat = getChat(id);
    if (!chat) { startFresh(); return; }
    activeChatId = id;
    renderMessages(chat);
    renderHistory();
  }
  function startFresh() {
    activeChatId = null;
    if (streamEl) streamEl.innerHTML = '';
    showWelcome(true);
    renderHistory();
  }

  /* ────────────────────────────────────────────────
     8. The AI call — goes through Supabase Edge Function
        which holds the OPENROUTER_KEY_SUPPORT secret.
     ──────────────────────────────────────────────── */
  function getConfig() {
    var cfg = window.SH_AI_CONFIG || {};
    var baseUrl = (window.SH_SUPABASE_URL || '').replace(/\/+$/, '');
    return {
      functionUrl: cfg.functionUrl || (baseUrl + '/functions/v1/ai-chat'),
      anonKey:     window.SH_SUPABASE_KEY || '',
      model:       cfg.model    || 'openai/gpt-5.4-mini',
      systemPrompt: cfg.systemPrompt || 'You are a calm, listening companion.'
    };
  }

  /* Compose the system prompt with active toggles.
     All three prompts live in JS/ai-chat-config.js — edit them there. */
  function buildSystemPrompt() {
    var cfg   = window.SH_AI_CONFIG || {};
    var parts = [cfg.systemPrompt || ''];
    if (toolState.noAdvice && cfg.noAdvicePrompt) {
      parts.push(cfg.noAdvicePrompt);
    }
    if (toolState.mood && cfg.moodPrompt) {
      parts.push(cfg.moodPrompt.replace(/\{mood\}/g, toolState.mood));
    }
    return parts.filter(Boolean).join('\n\n');
  }

  async function getAuthToken() {
    try {
      if (!window.supabase || !window.SH_SUPABASE_URL) return null;
      if (!window._sbClient) {
        window._sbClient = window.supabase.createClient(window.SH_SUPABASE_URL, window.SH_SUPABASE_KEY);
      }
      var s = await window._sbClient.auth.getSession();
      return (s && s.data && s.data.session && s.data.session.access_token) || null;
    } catch (_) { return null; }
  }

  async function callAI(messages) {
    var cfg = getConfig();
    if (!cfg.functionUrl) {
      throw new Error("Edge Function URL is not configured.");
    }

    var jwt = await getAuthToken();

    var payload = {
      model: cfg.model,
      system: buildSystemPrompt(),
      messages: messages.map(function (m) {
        return { role: m.role, content: m.content };
      })
    };

    var res = await fetch(cfg.functionUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        /* Anon key is required for Edge Functions; user JWT identifies the caller */
        'apikey':        cfg.anonKey,
        'Authorization': 'Bearer ' + (jwt || cfg.anonKey)
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      var body = await res.text();
      throw new Error('api error ' + res.status + ': ' + body);
    }
    var data = await res.json();
    /* Accept either { reply: "..." } or full OpenAI/OpenRouter shape */
    if (data && typeof data.reply === 'string') return data.reply;
    var content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return content || '…';
  }

  /* ────────────────────────────────────────────────
     8b. Composer tools — no-advice + mood
     ──────────────────────────────────────────────── */
  var toolState = { noAdvice: false, mood: '' };

  var noAdviceBtn = $('#toolNoAdvice');
  if (noAdviceBtn) {
    noAdviceBtn.addEventListener('click', function () {
      toolState.noAdvice = !toolState.noAdvice;
      noAdviceBtn.setAttribute('aria-pressed', String(toolState.noAdvice));
    });
  }

  var moodBtn   = $('#toolMood');
  var moodMenu  = $('#moodMenu');
  var moodLabel = $('#moodLabel');
  function closeMoodMenu() { if (moodMenu) moodMenu.hidden = true; if (moodBtn) moodBtn.setAttribute('aria-pressed', String(!!toolState.mood)); }
  if (moodBtn && moodMenu) {
    moodBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      moodMenu.hidden = !moodMenu.hidden;
    });
    moodMenu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', closeMoodMenu);

    $$('.mood-opt', moodMenu).forEach(function (opt) {
      opt.addEventListener('click', function () {
        toolState.mood = opt.getAttribute('data-mood') || '';
        if (moodLabel) moodLabel.textContent = toolState.mood || 'mood';
        moodBtn.setAttribute('aria-pressed', String(!!toolState.mood));
        $$('.mood-opt', moodMenu).forEach(function (o) { o.classList.remove('is-active'); });
        if (toolState.mood) opt.classList.add('is-active');
        moodMenu.hidden = true;
      });
    });
  }

  /* ────────────────────────────────────────────────
     9. Send flow
     ──────────────────────────────────────────────── */
  var ta      = $('#chatInput');
  var sendBtn = $('#sendBtn');
  var newBtn  = $('#newChatBtn');

  function autosize() {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
  }
  function refreshSendBtn() {
    if (!ta || !sendBtn) return;
    sendBtn.disabled = ta.value.trim().length === 0 || sendBtn.dataset.busy === '1';
    autosize();
  }
  if (ta) {
    ta.addEventListener('input', refreshSendBtn);
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) send();
      }
    });
  }

  async function send() {
    var text = (ta.value || '').trim();
    if (!text) return;

    /* Ensure we have an active chat */
    var chat;
    if (!activeChatId) {
      chat = createChat();
      activeChatId = chat.id;
    } else {
      chat = getChat(activeChatId);
      if (!chat) { chat = createChat(); activeChatId = chat.id; }
    }

    showWelcome(false);

    /* Append user message — UI + store */
    appendMsg('user', text);
    chat.messages.push({ role: 'user', content: text, ts: nowIso() });

    /* Set chat title from first user message */
    if (chat.messages.filter(function (m) { return m.role === 'user'; }).length === 1) {
      chat.title = text.length > 42 ? text.slice(0, 42).trim() + '…' : text;
    }
    chat.updatedAt = nowIso();
    upsertChat(chat);

    ta.value = '';
    sendBtn.dataset.busy = '1';
    refreshSendBtn();
    renderHistory();

    /* Append typing indicator */
    var pendingEl = appendMsg('ai', '', { pending: true });
    if (pendingEl) {
      var dotEl = pendingEl.querySelector('.msg-text');
      dotEl.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    }

    try {
      var reply = await callAI(chat.messages);
      if (pendingEl) pendingEl.remove();
      appendMsg('ai', reply);
      chat.messages.push({ role: 'assistant', content: reply, ts: nowIso() });
      chat.updatedAt = nowIso();
      upsertChat(chat);
      renderHistory();
    } catch (err) {
      if (pendingEl) pendingEl.remove();
      var errMsg = appendMsg('ai', '');
      var pEl = errMsg.querySelector('.msg-text');
      pEl.innerHTML =
        '<span style="color:#c0392b;">couldn\'t reach the model.</span><br>' +
        '<span style="color:var(--ink-light);font-size:12px;">' + escapeHtml(err.message) + '</span>';
    } finally {
      sendBtn.dataset.busy = '0';
      refreshSendBtn();
      ta.focus();
    }
  }
  if (sendBtn) sendBtn.addEventListener('click', send);

  if (newBtn) newBtn.addEventListener('click', startFresh);

  /* ────────────────────────────────────────────────
     10. Sidebar search filter
     ──────────────────────────────────────────────── */
  var search = $('#sidebarSearch');
  if (search) {
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      $$('.history-item').forEach(function (it) {
        var t = it.textContent.toLowerCase();
        it.style.display = (!q || t.indexOf(q) !== -1) ? '' : 'none';
      });
    });
  }

  /* ────────────────────────────────────────────────
     11. Init
     ──────────────────────────────────────────────── */
  renderHistory();
  showWelcome(true);
  refreshSendBtn();
})();
