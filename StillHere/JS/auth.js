

(function () {
  'use strict';

  // ── Supabase client ──────────────────────────────────────────────────────

  var _sb = null;
  function getSB() {
    if (_sb) return _sb;
    _sb = window.supabase.createClient(
      window.SH_SUPABASE_URL,
      window.SH_SUPABASE_KEY
    );
    return _sb;
  }

  // Fake-email constructor (deterministic — same username always gives same email)
  function toFakeEmail(username) {
    return username.toLowerCase() + '@stillhere.users';
  }

  // ── Recovery key (email-free password reset) ───────────────────────────────
  // High-entropy key shown once at signup. Stored only as SHA-256 in
  // account_recovery. Format: STILL-XXXX-XXXX-XXXX-XXXX (Crockford-ish
  // base32, no easily-confused chars).
  var RECOVERY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/1/I/O
  function generateRecoveryKey() {
    var bytes = new Uint8Array(16);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var chars = '';
    for (var i = 0; i < bytes.length; i++) {
      chars += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
    }
    // STILL-XXXX-XXXX-XXXX-XXXX
    return 'STILL-' + chars.slice(0, 4) + '-' + chars.slice(4, 8) +
           '-' + chars.slice(8, 12) + '-' + chars.slice(12, 16);
  }
  // Must match the edge function's normaliseKey(): lowercase, strip space/dash.
  function normaliseRecoveryKey(k) {
    return (k || '').toLowerCase().replace(/[\s-]+/g, '');
  }
  async function sha256Hex(str) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  // ── Validation ───────────────────────────────────────────────────────────

  // Allowed: a-z A-Z 0-9 _ -   |   3–30 chars   |   no leading/trailing _ -   |   no consecutive __ --
  function validateUsername(val) {
    val = (val || '').trim();
    if (!val)          return 'Username is required.';
    if (val.length < 3)  return 'Must be at least 3 characters.';
    if (val.length > 30) return 'Must be 30 characters or less.';
    if (!/^[a-zA-Z0-9_-]+$/.test(val))  return 'Only letters, numbers, _ and - are allowed.';
    if (/^[_-]/.test(val))               return 'Cannot start with _ or -.';
    if (/[_-]$/.test(val))               return 'Cannot end with _ or -.';
    if (/[_-]{2}/.test(val))             return 'No consecutive _ or - characters.';
    return null;
  }

  function validateDisplayName(val) {
    if (!val) return null; // optional
    if (val.length > 30) return 'Max 30 characters.';
    if (/\s/.test(val))  return 'One word per field — put the rest in Last name.';
    if (!/^[\p{L}\p{M}][\p{L}\p{M}'\-]*$/u.test(val)) return 'Letters, hyphens and apostrophes only.';
    return null;
  }

  function validatePassword(val) {
    if (!val)            return 'Password is required.';
    if (val.length < 8)  return 'Must be at least 8 characters.';
    if (!/[a-zA-Z]/.test(val)) return 'Must contain at least one letter.';
    if (!/[0-9]/.test(val))    return 'Must contain at least one number.';
    return null;
  }

  // ── UI helpers ───────────────────────────────────────────────────────────

  function setFieldError(fieldEl, msg) {
    if (!fieldEl) return;
    var old = fieldEl.querySelector('.field-error');
    if (old) old.remove();
    fieldEl.classList.toggle('field--error', !!msg);
    if (msg) {
      var span = document.createElement('span');
      span.className = 'field-error';
      span.textContent = msg;
      fieldEl.appendChild(span);
    }
  }

  function clearFieldError(fieldEl) {
    setFieldError(fieldEl, null);
  }

  function setFormError(formEl, msg) {
    var el = formEl.querySelector('.form-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'form-error';
      el.setAttribute('role', 'alert');
      formEl.insertBefore(el, formEl.firstChild);
    }
    if (msg) {
      el.textContent = msg;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function setBtnLoading(btn, on) {
    btn.disabled = on;
    btn.classList.toggle('auth-btn--loading', on);
    if (on) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span>';
    } else if (btn.dataset.origHtml) {
      btn.innerHTML = btn.dataset.origHtml;
    }
  }

  // ── Password strength ────────────────────────────────────────────────────

  function calcStrength(val) {
    if (!val) return 0;
    var score = 0;
    if (val.length >= 8)  score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;
    return score; // 0–5
  }

  var STRENGTH_LEVELS = ['', 'weak', 'fair', 'good', 'strong', 'strong'];
  var STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];

  function updateStrengthBar(val, barEl, textEl) {
    if (!barEl) return;
    var score = calcStrength(val);
    var level = val ? (STRENGTH_LEVELS[score] || 'weak') : '';
    barEl.className = 'pw-strength-bar' + (level ? ' pw-strength-bar--' + level : '');
    barEl.style.width = val ? (score * 20) + '%' : '0';
    if (textEl) textEl.textContent = val ? (STRENGTH_LABELS[score] || '') : '';
  }

  // ── Show/hide password toggle ────────────────────────────────────────────

  function initPasswordToggles() {
    document.querySelectorAll('.pw-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById(btn.dataset.target);
        if (!input) return;
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        var showSpan = btn.querySelector('.pw-toggle-show');
        var hideSpan = btn.querySelector('.pw-toggle-hide');
        if (showSpan) showSpan.hidden = show;
        if (hideSpan) hideSpan.hidden = !show;
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        input.focus();
      });
    });
  }

  // ── Register page ────────────────────────────────────────────────────────

  // ── Cloudflare Turnstile (bot protection) ──────────────────────────────────
  // captchaEnabled() is true only when a site key is configured. We load the
  // Turnstile script on demand and render an invisible-until-needed widget.
  var _captchaToken = null;
  var _captchaWidgetId = null;
  function captchaEnabled() {
    return !!(window.SH_TURNSTILE_SITEKEY && String(window.SH_TURNSTILE_SITEKEY).trim());
  }
  function loadTurnstileScript() {
    return new Promise(function (resolve) {
      if (window.turnstile) return resolve();
      var existing = document.getElementById('cf-turnstile-script');
      if (existing) { existing.addEventListener('load', function () { resolve(); }); return; }
      var s = document.createElement('script');
      s.id = 'cf-turnstile-script';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true; s.defer = true;
      s.onload = function () { resolve(); };
      document.head.appendChild(s);
    });
  }
  async function renderCaptcha(container) {
    if (!captchaEnabled() || !container) return;
    await loadTurnstileScript();
    if (!window.turnstile) return;
    _captchaWidgetId = window.turnstile.render(container, {
      sitekey: String(window.SH_TURNSTILE_SITEKEY).trim(),
      theme: (document.documentElement.getAttribute('data-theme') === 'dark') ? 'dark' : 'light',
      /* Span the form width like the other fields instead of a fixed
         300px box floating to one side. */
      size: 'flexible',
      callback: function (token) { _captchaToken = token; },
      'expired-callback':  function () { _captchaToken = null; },
      'error-callback':    function () { _captchaToken = null; }
    });
  }
  function resetCaptcha() {
    _captchaToken = null;
    try { if (window.turnstile && _captchaWidgetId !== null) window.turnstile.reset(_captchaWidgetId); }
    catch (_) {}
  }

  function initRegister() {
    var form = document.getElementById('registerForm');
    if (!form) return;

    var fUsername = document.getElementById('field-username');
    var fPassword = document.getElementById('field-password');
    var inUsername = document.getElementById('reg-username');
    var inPassword = document.getElementById('reg-password');
    var btn        = form.querySelector('.auth-btn');
    var barEl      = document.getElementById('pwStrengthBar');
    var textEl     = document.getElementById('pwStrengthText');

    // Render the captcha widget (no-op if no site key configured).
    var capContainer = document.getElementById('captchaContainer');
    if (captchaEnabled() && capContainer) { renderCaptcha(capContainer); }

    // Live validation
    inUsername.addEventListener('input', function () {
      var err = validateUsername(inUsername.value);
      setFieldError(fUsername, err);
    });

    inPassword.addEventListener('input', function () {
      updateStrengthBar(inPassword.value, barEl, textEl);
      // Only show error if they've typed something
      if (inPassword.value) {
        var err = validatePassword(inPassword.value);
        setFieldError(fPassword, err);
      } else {
        clearFieldError(fPassword);
      }
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      setFormError(form, null);

      var username  = (inUsername.value || '').trim();
      var password  = inPassword.value || '';
      var firstname = (document.getElementById('reg-firstname')  || {value:''}).value.trim();
      var lastname  = (document.getElementById('reg-lastname')   || {value:''}).value.trim();
      var termsBox  = form.querySelector('input[type="checkbox"]');

      // Validate all
      var uErr  = validateUsername(username);
      var pErr  = validatePassword(password);
      var fnErr = validateDisplayName(firstname);
      var lnErr = validateDisplayName(lastname);
      setFieldError(fUsername, uErr);
      setFieldError(fPassword, pErr);

      var fnEl = document.getElementById('reg-firstname');
      var lnEl = document.getElementById('reg-lastname');
      if (fnEl && fnErr) {
        var fnWrap = fnEl.closest('.field') || fnEl.parentNode;
        var ep = fnWrap.querySelector('.field-error') || document.createElement('p');
        ep.className = 'field-error'; ep.textContent = fnErr;
        if (!fnWrap.contains(ep)) fnWrap.appendChild(ep);
      } else if (fnEl) {
        var fnWrap2 = fnEl.closest('.field') || fnEl.parentNode;
        var old = fnWrap2.querySelector('.field-error'); if (old) old.remove();
      }
      if (lnEl && lnErr) {
        var lnWrap = lnEl.closest('.field') || lnEl.parentNode;
        var ep2 = lnWrap.querySelector('.field-error') || document.createElement('p');
        ep2.className = 'field-error'; ep2.textContent = lnErr;
        if (!lnWrap.contains(ep2)) lnWrap.appendChild(ep2);
      } else if (lnEl) {
        var lnWrap2 = lnEl.closest('.field') || lnEl.parentNode;
        var old2 = lnWrap2.querySelector('.field-error'); if (old2) old2.remove();
      }

      if (uErr || pErr || fnErr || lnErr) return;

      if (termsBox && !termsBox.checked) {
        setFormError(form, 'Please agree to the Terms of Service to continue.');
        return;
      }

      // CAPTCHA — require a token when bot protection is enabled.
      if (captchaEnabled() && !_captchaToken) {
        setFormError(form, 'Please complete the "I\'m human" check below.');
        return;
      }

      setBtnLoading(btn, true);

      var sb = getSB();

      // 1. Check username availability
      var { data: existing, error: checkErr } = await sb
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (checkErr && checkErr.code !== 'PGRST116') {
        setBtnLoading(btn, false);
        setFormError(form, 'Something went wrong. Please try again.');
        return;
      }

      if (existing) {
        setBtnLoading(btn, false);
        setFieldError(fUsername, 'This username is already taken.');
        return;
      }

      // 2. Moderate username + names (AI check — no JWT needed)
      if (window.SH_MOD) {
        var modResult = await window.SH_MOD.checkUsername(username);
        if (!modResult.allowed) {
          setBtnLoading(btn, false);
          setFieldError(fUsername, modResult.label || 'This username is not allowed.');
          return;
        }

        // Check first/last name if provided
        var nameToCheck = [firstname, lastname].filter(Boolean).join(' ');
        if (nameToCheck) {
          var nameResult = await window.SH_MOD.checkUsername(nameToCheck);
          if (!nameResult.allowed) {
            setBtnLoading(btn, false);
            setFormError(form, nameResult.label || 'This name is not allowed.');
            return;
          }
        }
      }

      // 3. Sign up
      var displayName = [firstname, lastname].filter(Boolean).join(' ') || username;

      var signUpOptions = {
        data: {
          username:     username.toLowerCase(),
          display_name: displayName
        }
      };
      // Attach the Turnstile token so Supabase can verify it server-side.
      if (captchaEnabled() && _captchaToken) {
        signUpOptions.captchaToken = _captchaToken;
      }

      var { data: signData, error: signErr } = await sb.auth.signUp({
        email:    toFakeEmail(username),
        password: password,
        options:  signUpOptions
      });

      if (signErr) {
        setBtnLoading(btn, false);
        resetCaptcha(); // token is single-use; refresh it for a retry
        setFormError(form, signErr.message || 'Registration failed. Please try again.');
        return;
      }

      // Session will be set if email confirmation is disabled.
      // If signData.session is null, email confirmation is still enabled —
      // remind the user to disable it in Supabase dashboard.
      if (signData && !signData.session) {
        setBtnLoading(btn, false);
        setFormError(form, 'Almost there — but email confirmation is enabled in your Supabase project. ' +
          'Disable it under Authentication → Settings → Email confirmations.');
        return;
      }

      /* ── Insert profile row ──────────────────────────────────────
         Without a DB trigger Supabase won't auto-create the profile.
         After signUp() the client already holds the new session so
         auth.uid() = signData.user.id and RLS allows the insert.
      ────────────────────────────────────────────────────────────── */
      if (signData && signData.user) {
        await sb.from('profiles').upsert(
          {
            id:           signData.user.id,
            username:     username.toLowerCase(),
            display_name: displayName || null,
            avatar_url:   null
          },
          { onConflict: 'id' }
        );
        // Ignore errors — even if RLS blocks it we still redirect.
        // The session.js auto-create will retry on next login.
      }

      try { localStorage.setItem('sh_username', username.toLowerCase()); } catch (_) {}

      /* ── Recovery key ────────────────────────────────────────────
         Generate a one-time recovery key, store ONLY its hash, and
         show it to the user once. This is their email-free way back
         in if they forget their password. We block the redirect on
         the modal so they can't miss it. */
      var recoveredHandled = false;
      try {
        if (signData && signData.user) {
          var recKey  = generateRecoveryKey();
          var recHash = await sha256Hex(normaliseRecoveryKey(recKey));
          await sb.from('account_recovery').upsert(
            { user_id: signData.user.id, key_hash: recHash, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          );
          recoveredHandled = true;
          showRecoveryKeyModal(recKey, function () {
            window.location.href = 'main.html';
          });
        }
      } catch (_) { /* if anything fails, don't trap the user */ }

      if (!recoveredHandled) window.location.href = 'main.html';
    });
  }

  // ── Login page ───────────────────────────────────────────────────────────

  function initLogin() {
    var form = document.getElementById('loginForm');
    if (!form) return;

    var fUsername  = document.getElementById('field-username');
    var fPassword  = document.getElementById('field-password');
    var inUsername = document.getElementById('login-username');
    var inPassword = document.getElementById('login-password');
    var btn        = form.querySelector('.auth-btn');

    // Render captcha widget on login too — when CAPTCHA is enabled in
    // Supabase Auth settings, it applies to signInWithPassword too,
    // not just signUp. Without a token Supabase returns a generic
    // error that surfaces as "Incorrect username or password" → the
    // user thinks the password is wrong when it's actually fine.
    var capContainer = document.getElementById('captchaContainer');
    if (captchaEnabled() && capContainer) { renderCaptcha(capContainer); }

    // Clear errors on input
    inUsername.addEventListener('input', function () { clearFieldError(fUsername); setFormError(form, null); });
    inPassword.addEventListener('input', function () { clearFieldError(fPassword); setFormError(form, null); });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      setFormError(form, null);

      var username = (inUsername.value || '').trim();
      var password = inPassword.value || '';

      var uErr = username ? null : 'Username is required.';
      var pErr = password ? null : 'Password is required.';
      setFieldError(fUsername, uErr);
      setFieldError(fPassword, pErr);
      if (uErr || pErr) return;

      if (captchaEnabled() && !_captchaToken) {
        setFormError(form, 'Please complete the "I\'m human" check below.');
        return;
      }

      setBtnLoading(btn, true);

      var signInOptions = {
        email:    toFakeEmail(username),
        password: password
      };
      if (captchaEnabled() && _captchaToken) {
        signInOptions.options = { captchaToken: _captchaToken };
      }

      var { data, error } = await getSB().auth.signInWithPassword(signInOptions);

      if (error) {
        setBtnLoading(btn, false);
        resetCaptcha(); // single-use token; refresh for retry
        // Surface "captcha verification process failed" plainly so the
        // user doesn't think it's their password. Anything else stays generic.
        var em = (error.message || '').toLowerCase();
        if (em.indexOf('captcha') !== -1) {
          setFormError(form, 'Captcha check failed — please tick the box below again and retry.');
        } else {
          setFormError(form, 'Incorrect username or password. Please try again.');
        }
        return;
      }

      try { localStorage.setItem('sh_username', username.toLowerCase()); } catch (_) {}
      window.location.href = 'main.html';
    });
  }

  // ── Recovery-key modal (shown once at signup) ──────────────────────────────
  function showRecoveryKeyModal(key, onContinue) {
    var bd = document.createElement('div');
    bd.className = 'sh-rec-backdrop';
    bd.innerHTML =
      '<div class="sh-rec-modal" role="dialog" aria-modal="true" aria-labelledby="shRecTitle">' +
        '<div class="sh-rec-icon" aria-hidden="true">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 256 256" fill="currentColor">' +
          '<path d="M216.57,39.43a80,80,0,0,0-117.66,108L34.34,212.28A8,8,0,0,0,32,217.94V240a8,8,0,0,0,8,8H72a8,8,0,0,0,8-8V224H96a8,8,0,0,0,8-8V200h16a8,8,0,0,0,5.66-2.34l12.52-12.52A80,80,0,0,0,216.57,39.43ZM164,100a16,16,0,1,1,16-16A16,16,0,0,1,164,100Z"/></svg>' +
        '</div>' +
        '<h2 id="shRecTitle" class="sh-rec-title">save your recovery key</h2>' +
        '<p class="sh-rec-desc">there\'s no email on file — this key is the <strong>only</strong> way ' +
          'back into your account if you forget your password. write it down or save it somewhere safe. ' +
          'we can\'t recover it for you.</p>' +
        '<div class="sh-rec-key" id="shRecKey">' + key + '</div>' +
        '<div class="sh-rec-actions">' +
          '<button type="button" class="sh-rec-btn sh-rec-copy" id="shRecCopy">copy key</button>' +
          '<button type="button" class="sh-rec-btn sh-rec-save" id="shRecDownload">download .txt</button>' +
        '</div>' +
        '<label class="sh-rec-confirm"><input type="checkbox" id="shRecAck"> I\'ve saved my recovery key somewhere safe</label>' +
        '<button type="button" class="sh-rec-continue" id="shRecGo" disabled>continue</button>' +
      '</div>';
    document.body.appendChild(bd);
    injectRecoveryStyles();
    requestAnimationFrame(function () { bd.classList.add('is-open'); });

    var ack  = bd.querySelector('#shRecAck');
    var go   = bd.querySelector('#shRecGo');
    var copy = bd.querySelector('#shRecCopy');
    var dl   = bd.querySelector('#shRecDownload');

    ack.addEventListener('change', function () { go.disabled = !ack.checked; });
    copy.addEventListener('click', function () {
      if (navigator.clipboard) navigator.clipboard.writeText(key);
      copy.textContent = 'copied ✓';
      setTimeout(function () { copy.textContent = 'copy key'; }, 1800);
    });
    dl.addEventListener('click', function () {
      var blob = new Blob(
        ['StillHere recovery key\n\n' + key +
         '\n\nKeep this safe. It is the only way to reset your password ' +
         'if you forget it. Anyone with this key can reset your account.\n'],
        { type: 'text/plain' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'stillhere-recovery-key.txt';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    go.addEventListener('click', function () {
      bd.remove();
      if (typeof onContinue === 'function') onContinue();
    });
  }

  function injectRecoveryStyles() {
    if (document.getElementById('sh-rec-styles')) return;
    var s = document.createElement('style');
    s.id = 'sh-rec-styles';
    /* Mirrors the .del-modal aesthetic used elsewhere (edit-profile,
       post, create-post): blurred backdrop, centered card, Caveat
       title, icon circle, pop animation, pill buttons. */
    s.textContent =
      '.sh-rec-backdrop{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;' +
        'justify-content:center;background:rgba(26,20,16,.55);backdrop-filter:blur(4px);' +
        '-webkit-backdrop-filter:blur(4px);padding:20px;opacity:0;visibility:hidden;' +
        'transition:opacity .25s ease,visibility .25s ease;}' +
      '.sh-rec-backdrop.is-open{opacity:1;visibility:visible;}' +
      '.sh-rec-modal{background:var(--paper-soft,#fffaf0);color:var(--ink,#1a1410);' +
        'border:1px solid var(--line,rgba(26,20,16,.14));border-radius:12px;max-width:440px;' +
        'width:calc(100% - 32px);padding:30px 32px 26px;text-align:center;font-family:"Ubuntu",sans-serif;' +
        'box-shadow:0 20px 60px -20px rgba(26,20,16,.4);transform:translateY(10px) scale(.98);opacity:0;' +
        'transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .25s ease;}' +
      '.sh-rec-backdrop.is-open .sh-rec-modal{transform:none;opacity:1;}' +
      '.sh-rec-icon{width:56px;height:56px;border-radius:50%;background:rgba(214,83,60,.14);' +
        'color:var(--accent-2,#d6533c);display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;}' +
      '.sh-rec-title{margin:0 0 8px;font-family:"Caveat",cursive;font-size:30px;font-weight:600;color:var(--ink,#1a1410);}' +
      '.sh-rec-desc{margin:0 0 18px;font-size:13.5px;line-height:1.55;color:var(--ink-mid,#6e5f53);}' +
      '.sh-rec-key{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:700;letter-spacing:.04em;' +
        'text-align:center;padding:16px;border:1.5px dashed var(--accent-2,#d6533c);border-radius:10px;' +
        'background:rgba(214,83,60,.06);color:var(--ink,#1a1410);user-select:all;word-break:break-all;margin-bottom:14px;}' +
      '.sh-rec-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:0 0 16px;}' +
      '.sh-rec-btn{padding:10px 18px;border-radius:999px;border:1px solid var(--line,rgba(26,20,16,.18));' +
        'background:transparent;color:var(--ink-mid,#6e5f53);font:inherit;font-size:13px;font-weight:600;cursor:pointer;' +
        'transition:background .25s ease,border-color .25s ease,color .25s ease;}' +
      '.sh-rec-btn:hover{color:var(--ink,#1a1410);border-color:var(--ink,#1a1410);}' +
      '.sh-rec-confirm{display:flex;align-items:flex-start;gap:9px;font-size:12.5px;line-height:1.4;text-align:left;' +
        'color:var(--ink-soft,#4a3f37);margin-bottom:16px;cursor:pointer;justify-content:center;}' +
      '.sh-rec-confirm input{margin-top:2px;flex-shrink:0;}' +
      '.sh-rec-continue{padding:11px 26px;border-radius:999px;border:1px solid var(--accent-2,#d6533c);' +
        'background:var(--accent-2,#d6533c);color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer;' +
        'transition:background .25s ease,opacity .2s ease,transform .15s ease;}' +
      '.sh-rec-continue:hover:not(:disabled){background:#b8462f;border-color:#b8462f;}' +
      '.sh-rec-continue:disabled{opacity:.45;cursor:not-allowed;}' +
      '.sh-rec-continue:not(:disabled):active{transform:translateY(1px);}' +
      'html[data-theme="dark"] .sh-rec-modal{background:#26201a;border-color:rgba(244,234,214,.14);color:#f4ead6;}' +
      'html[data-theme="dark"] .sh-rec-title{color:#f4ead6;}' +
      'html[data-theme="dark"] .sh-rec-key{color:#f4ead6;background:rgba(214,83,60,.12);}' +
      'html[data-theme="dark"] .sh-rec-btn{color:#d8cab0;border-color:rgba(244,234,214,.18);}' +
      'html[data-theme="dark"] .sh-rec-btn:hover{color:#f4ead6;border-color:rgba(244,234,214,.4);}';
    document.head.appendChild(s);
  }

  // ── Forgot-password / recovery flow (login page) ───────────────────────────
  function recoverFunctionUrl() {
    return window.SH_SUPABASE_URL + '/functions/v1/recover-password';
  }

  function initRecovery() {
    var trigger = document.getElementById('forgotPasswordLink');
    if (!trigger) return;
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      openRecoveryModal();
    });
  }

  function openRecoveryModal() {
    injectRecoveryStyles();
    var bd = document.createElement('div');
    bd.className = 'sh-rec-backdrop';
    bd.innerHTML =
      '<div class="sh-rec-modal" role="dialog" aria-modal="true" aria-labelledby="shRecResetTitle">' +
        '<div class="sh-rec-icon" aria-hidden="true">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 256 256" fill="currentColor">' +
          '<path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM136,148.07V172a8,8,0,0,1-16,0V148.07a20,20,0,1,1,16,0Z"/></svg>' +
        '</div>' +
        '<h2 id="shRecResetTitle" class="sh-rec-title">reset your password</h2>' +
        '<p class="sh-rec-desc">enter your username and the recovery key you saved when you joined, ' +
          'then choose a new password.</p>' +
        '<div class="sh-rec-form">' +
          '<input type="text" id="shRecUser" placeholder="username" autocomplete="username" class="sh-rec-input">' +
          '<input type="text" id="shRecKeyIn" placeholder="STILL-XXXX-XXXX-XXXX-XXXX" class="sh-rec-input">' +
          '<input type="password" id="shRecPass" placeholder="new password" autocomplete="new-password" class="sh-rec-input">' +
          '<p class="sh-rec-hint">min 8 characters, at least 1 letter &amp; 1 number</p>' +
          '<p class="sh-rec-msg" id="shRecMsg"></p>' +
        '</div>' +
        '<div class="sh-rec-actions">' +
          '<button type="button" class="sh-rec-btn" id="shRecCancel">cancel</button>' +
          '<button type="button" class="sh-rec-continue" id="shRecSubmit">reset password</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bd);
    requestAnimationFrame(function () { bd.classList.add('is-open'); });

    // form input styling (reuse the rec namespace)
    if (!document.getElementById('sh-rec-form-styles')) {
      var s = document.createElement('style');
      s.id = 'sh-rec-form-styles';
      s.textContent =
        '.sh-rec-form{display:flex;flex-direction:column;gap:10px;margin-bottom:6px;}' +
        '.sh-rec-input{width:100%;padding:11px 13px;border-radius:8px;border:1px solid var(--line,rgba(26,20,16,.2));' +
          'background:var(--surface-input,#fffaf0);color:var(--ink,#1a1410);font:inherit;font-size:14px;text-align:left;}' +
        '.sh-rec-input:focus{outline:none;border-color:var(--accent-2,#d6533c);box-shadow:0 0 0 3px rgba(214,83,60,.14);}' +
        '.sh-rec-hint{margin:-4px 0 0;font-size:11.5px;color:var(--ink-light,#8a7a6e);text-align:center;font-style:italic;}' +
        '.sh-rec-msg{margin:2px 0 0;font-size:12.5px;min-height:16px;color:#c0392b;text-align:center;}' +
        '.sh-rec-msg.ok{color:var(--accent-3,#6d8268);}' +
        'html[data-theme="dark"] .sh-rec-input{background:#1f1a15;color:#f4ead6;border-color:rgba(244,234,214,.18);}';
      document.head.appendChild(s);
    }

    function closeReset() {
      bd.classList.remove('is-open');
      setTimeout(function () { bd.remove(); }, 250);
    }
    var msg = bd.querySelector('#shRecMsg');
    bd.querySelector('#shRecCancel').addEventListener('click', closeReset);
    bd.addEventListener('click', function (e) { if (e.target === bd) closeReset(); });

    var submit = bd.querySelector('#shRecSubmit');
    submit.addEventListener('click', async function () {
      var u = (bd.querySelector('#shRecUser').value || '').trim();
      var k = (bd.querySelector('#shRecKeyIn').value || '').trim();
      var p = bd.querySelector('#shRecPass').value || '';
      msg.className = 'sh-rec-msg';
      if (!u || !k || !p) { msg.textContent = 'Please fill in all fields.'; return; }
      /* Same rules as registration so we don't end up with weak passwords
         set via the recovery path: min 8 chars, at least one letter, one digit. */
      var pErr = validatePassword(p);
      if (pErr) { msg.textContent = pErr; return; }

      submit.disabled = true; submit.textContent = 'resetting…';
      try {
        var res = await fetch(recoverFunctionUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': window.SH_SUPABASE_KEY,
                     'Authorization': 'Bearer ' + window.SH_SUPABASE_KEY },
          body: JSON.stringify({ username: u, recoveryKey: k, newPassword: p })
        });
        var data = await res.json().catch(function () { return null; });
        if (data && data.ok) {
          msg.className = 'sh-rec-msg ok';
          msg.textContent = 'Password updated — you can sign in now.';
          submit.textContent = 'done ✓';
          setTimeout(closeReset, 1800);
        } else {
          msg.textContent = (data && data.message) || 'Could not reset password.';
          submit.disabled = false; submit.textContent = 'reset password';
        }
      } catch (_) {
        msg.textContent = 'Network error — try again.';
        submit.disabled = false; submit.textContent = 'reset password';
      }
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    initRegister();
    initLogin();
    initPasswordToggles();
    initRecovery();
  });

}());
