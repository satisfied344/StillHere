/* Bulk HTML head optimization across the site.
   - Adds `defer` to known blocking external scripts.
   - Adds <meta viewport> + preconnect hints if missing.
   - Wraps inline scripts that depend on deferred deps (SH_SESSION, SH_THEME,
     window.supabase, SH_SUPABASE_URL) in DOMContentLoaded so they run AFTER
     deferred scripts execute.

   Idempotent — running twice changes nothing.
   Run: node scripts/optimize-html.js */
const fs = require('fs');
const path = require('path');

// Script src patterns that should be deferred (they don't need to block render).
const DEFER_PATTERNS = [
  /supabase\.min\.js/,        // supabase CDN
  /supabase-config\.js/,
  /\/session\.js/,
  /\/theme\.js/,
  /\/moderation\.js/,
  /\/ai-chat-config\.js/,
  /\/main-page\.js/,
  /quill\.min\.js/,
  /purify\.min\.js/,
];

// Inline scripts containing any of these tokens depend on deferred globals.
const NEEDS_DCL_WRAP = [
  'SH_SESSION', 'SH_THEME', 'window.supabase', 'SH_SUPABASE_URL', 'SH_SUPABASE_KEY',
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function addDeferToScripts(html) {
  // Match <script ...src="..." ...> (no defer/async), add defer.
  return html.replace(/<script\b([^>]*?)\bsrc=(['"])([^'"]+)\2([^>]*)>/g,
    (full, before, q, src, after) => {
      const attrs = before + after;
      if (/\bdefer\b/.test(attrs) || /\basync\b/.test(attrs)) return full;
      if (!DEFER_PATTERNS.some(re => re.test(src))) return full;
      return `<script${before}src=${q}${src}${q}${after} defer>`;
    });
}

function ensureViewport(html) {
  if (/<meta[^>]+name=["']viewport["']/i.test(html)) return html;
  return html.replace(/(<meta\s+charset=["'][^"']+["']\s*\/?>)/i,
    `$1\n    <meta name="viewport" content="width=device-width, initial-scale=1">`);
}

/* color-scheme meta tells the browser the site supports both palettes
   (affects scrollbars and native form-control rendering). Standards-
   based — no extension-specific tags. */
function ensureColorScheme(html) {
  // Drop any stale extension-lock metas from earlier iterations.
  html = html.replace(/\s*<meta\s+name=["'](?:darkreader-lock|nighteye|midnight-lizard-status)["'][^>]*>\s*\n?/gi, '\n    ');
  if (/<meta[^>]+name=["']color-scheme["']/i.test(html)) return html;
  return html.replace(/(<meta\s+charset=["'][^"']+["']\s*\/?>)/i,
    `$1\n    <meta name="color-scheme" content="light dark">`);
}

/* Upgrade the theme-bootstrap inline script to also honour the OS
   prefers-color-scheme when the user has no saved preference. This is
   how a Dark Reader / system-dark user lands on the site's own dark
   theme automatically. */
function upgradeThemeBootstrap(html) {
  /* Inline <head> bootstrap. Runs synchronously, BEFORE any other
     resource. Two responsibilities:
       1. Apply localStorage.sh_theme (explicit user choice via FAB).
       2. Otherwise honour matchMedia('(prefers-color-scheme: dark)')
          — i.e. the user's OS / browser-level color preference.
     Idempotent: matches any prior inline bootstrap shape and overwrites. */
  const NEW = `<script>(function(){var t=localStorage.getItem("sh_theme");if(!t&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t)document.documentElement.setAttribute("data-theme",t);})();</script>`;
  const RE = /<script>\s*\(function\(\)[\s\S]*?localStorage\.getItem\(["']sh_theme["']\)[\s\S]*?<\/script>/;
  return RE.test(html) ? html.replace(RE, NEW) : html;
}

function mergeGoogleFonts(html) {
  // Merge Ubuntu + Caveat (the two patterns used site-wide) into one request.
  const ubuntu = /<link\s+href=["']https:\/\/fonts\.googleapis\.com\/css2\?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&display=swap["']\s+rel=["']stylesheet["']\s*\/?>\s*/i;
  const caveat = /<link\s+href=["']https:\/\/fonts\.googleapis\.com\/css2\?family=Caveat:wght@500;600;700&display=swap["']\s+rel=["']stylesheet["']\s*\/?>\s*/i;
  if (!ubuntu.test(html) || !caveat.test(html)) return html;
  let out = html.replace(caveat, '');
  out = out.replace(ubuntu,
    `<link href="https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&family=Caveat:wght@500;600;700&display=swap" rel="stylesheet">\n  `);
  return out;
}

function ensurePreconnect(html) {
  const needsFonts = /fonts\.googleapis\.com/.test(html);
  const needsJsdelivr = /cdn\.jsdelivr\.net/.test(html);
  const needsQuill = /cdn\.quilljs\.com/.test(html);
  const hints = [];
  if (needsFonts && !/preconnect[^>]+fonts\.googleapis\.com/.test(html)) {
    hints.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
    hints.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  }
  if (needsJsdelivr && !/preconnect[^>]+cdn\.jsdelivr\.net/.test(html)) {
    hints.push('<link rel="preconnect" href="https://cdn.jsdelivr.net">');
  }
  if (needsQuill && !/preconnect[^>]+cdn\.quilljs\.com/.test(html)) {
    hints.push('<link rel="preconnect" href="https://cdn.quilljs.com">');
  }
  if (!hints.length) return html;
  return html.replace(/(<meta[^>]+name=["']viewport["'][^>]*>)/i,
    `$1\n    ${hints.join('\n    ')}`);
}

function wrapInlineDeps(html) {
  // Find <script> blocks (no src) whose body references one of the deferred globals.
  // If already wrapped in DOMContentLoaded, leave alone.
  return html.replace(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g,
    (full, attrs, body) => {
      if (!NEEDS_DCL_WRAP.some(tok => body.includes(tok))) return full;
      if (/addEventListener\(\s*['"]DOMContentLoaded['"]/.test(body)) return full;
      // Avoid wrapping pure type=module or already-deferred inline (rare for inline).
      if (/\btype\s*=\s*["']module["']/.test(attrs)) return full;
      const wrapped =
        `document.addEventListener('DOMContentLoaded', function () {\n${body}\n});`;
      return `<script${attrs}>\n${wrapped}\n</script>`;
    });
}

const files = walk('.');
let changed = 0;
for (const f of files) {
  // Skip the optimize script's own output, archives, etc.
  if (f.includes('node_modules')) continue;
  const orig = fs.readFileSync(f, 'utf8');
  let next = orig;
  next = ensureViewport(next);
  next = ensureColorScheme(next);
  next = upgradeThemeBootstrap(next);
  next = mergeGoogleFonts(next);
  next = ensurePreconnect(next);
  next = addDeferToScripts(next);
  next = wrapInlineDeps(next);
  if (next !== orig) {
    fs.writeFileSync(f, next);
    changed++;
    console.log('  updated:', f);
  } else {
    console.log('  unchanged:', f);
  }
}
console.log(`\nDone. ${changed}/${files.length} files updated.`);
