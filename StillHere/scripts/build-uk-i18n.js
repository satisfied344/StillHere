#!/usr/bin/env node
/*
 * build-uk-i18n.js — regenerate JS/i18n.uk.js from JS/i18n.js (RU source of truth).
 *
 * Run:  cd public/StillHere && node scripts/build-uk-i18n.js
 *
 * Inputs (all live in the tracked tree, so a fresh clone can rebuild):
 *   ../JS/i18n.js                    — canonical key list + RU translations
 *   ../JS/i18n.uk.js                 — current UK file (we read it for keys
 *                                      whose translation is already correct)
 *   scripts/i18n-uk-additions.json   — newly authored UK translations for
 *                                      keys that didn't exist before
 *   scripts/i18n-uk-fixes.json       — corrected UK translations that
 *                                      override the existing file (kill
 *                                      paraphrased / truncated entries)
 *
 * Output:
 *   ../JS/i18n.uk.js                 — fully regenerated, in RU key order,
 *                                      stale UK-only keys dropped naturally
 *
 * Priority order when filling each key:
 *   fixes  >  additions  >  existing
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const HERE  = __dirname;
const I18N  = path.join(HERE, '..', 'JS', 'i18n.js');
const UK    = path.join(HERE, '..', 'JS', 'i18n.uk.js');
const ADDS  = path.join(HERE, 'i18n-uk-additions.json');
const FIXES = path.join(HERE, 'i18n-uk-fixes.json');

/* ── 1. Parse RU dict from i18n.js ─────────────────────────────
   Format: 'key': { en: '...', ru: '...' },
   ru can be a concatenation of string fragments — collapse them. */
function parseRu(src) {
  const re = /'([a-zA-Z][a-zA-Z0-9._-]+)':\s*\{[\s\S]*?ru:\s*('[^']*(?:'\s*\+\s*'[^']*)*')[\s\S]*?\}/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const fragments = m[2].match(/'([^']*)'/g) || [];
    const ru = fragments.map(s => s.slice(1, -1)).join('');
    out.push({ key: m[1], ru });
  }
  return out;
}

/* ── 2. Parse existing UK file ─────────────────────────────────
   Format (one entry per line): 'key': 'value', */
function parseUk(src) {
  const map = {};
  const re = /'([a-zA-Z][a-zA-Z0-9._-]+)':\s*('[^']*(?:'\s*\+\s*'[^']*)*'),/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const fragments = m[2].match(/'([^']*)'/g) || [];
    map[m[1]] = fragments.map(s => s.slice(1, -1)).join('');
  }
  return map;
}

/* ── 3. Serialize a single-quoted JS string literal ──────────── */
function q(str) {
  return "'" + String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r') + "'";
}

/* ── Main ─────────────────────────────────────────────────────── */
const ru        = parseRu(fs.readFileSync(I18N, 'utf8'));
const existing  = fs.existsSync(UK) ? parseUk(fs.readFileSync(UK, 'utf8')) : {};
const additions = fs.existsSync(ADDS)  ? JSON.parse(fs.readFileSync(ADDS,  'utf8')) : {};
const fixes     = fs.existsSync(FIXES) ? JSON.parse(fs.readFileSync(FIXES, 'utf8')) : {};

const finalUk = {};
const todos   = [];
for (const { key } of ru) {
  if (fixes[key]     !== undefined)      finalUk[key] = fixes[key];
  else if (additions[key] !== undefined) finalUk[key] = additions[key];
  else if (existing[key]  !== undefined) finalUk[key] = existing[key];
  else { finalUk[key] = '[TODO_UK] ' + key; todos.push(key); }
}

const lines = [
  '(function () {',
  "  'use strict';",
  '  /* Ukrainian dictionary — keys mirror i18n.js (RU is canonical).',
  '     Maintained by scripts/build-uk-i18n.js: any new RU key auto-flows',
  '     here on the next run. Hand-authored UK strings live in',
  '     scripts/i18n-uk-additions.json (new keys) and',
  '     scripts/i18n-uk-fixes.json (overrides for bad existing ones). */',
  '  window.SH_I18N_UK = {'
];
for (const { key } of ru) {
  lines.push('    ' + q(key) + ': ' + q(finalUk[key]) + ',');
}
lines.push('  };');
lines.push('}());');
lines.push('');

fs.writeFileSync(UK, lines.join('\n'));

console.log('Total keys:', ru.length);
console.log('From fixes:    ', Object.keys(fixes).length);
console.log('From additions:', Object.keys(additions).length);
console.log('From existing: ', Object.keys(finalUk).length - Object.keys(fixes).length - Object.keys(additions).length);
console.log('TODOs (need UK):', todos.length);
if (todos.length) todos.forEach(k => console.log('  TODO:', k));
console.log('Wrote', path.relative(process.cwd(), UK));
