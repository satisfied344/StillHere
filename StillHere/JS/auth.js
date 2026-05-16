

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

      var { data: signData, error: signErr } = await sb.auth.signUp({
        email:    toFakeEmail(username),
        password: password,
        options: {
          data: {
            username:     username.toLowerCase(),
            display_name: displayName
          }
        }
      });

      if (signErr) {
        setBtnLoading(btn, false);
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
      window.location.href = 'main.html';
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

      setBtnLoading(btn, true);

      var { data, error } = await getSB().auth.signInWithPassword({
        email:    toFakeEmail(username),
        password: password
      });

      if (error) {
        setBtnLoading(btn, false);
        // Generic message — don't leak which of username/password is wrong
        setFormError(form, 'Incorrect username or password. Please try again.');
        return;
      }

      try { localStorage.setItem('sh_username', username.toLowerCase()); } catch (_) {}
      window.location.href = 'main.html';
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    initRegister();
    initLogin();
    initPasswordToggles();
  });

}());
