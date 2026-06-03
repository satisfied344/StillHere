# Architecture & engineering notes

This document is the counterpart to the [README](README.md). The README explains
*what* StillHere is and why it exists; this one explains *how it's built*, the
decisions that shaped it, what I'd do differently, and how to verify it works.

---

## 1. The shape of the system

StillHere has no application server of its own. The browser talks directly to
managed services, and the only custom server-side code is four small Deno edge
functions that exist purely to hold secrets the browser must never see (the LLM
key, the service-role key) and to enforce limits the browser can't be trusted to
enforce.

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER  (vanilla HTML/CSS/JS, served static from Vercel)             │
│                                                                        │
│   feed · editor · letters · companion · profile · admin                │
│   client-side: crisis regex, image→WebP compression, DOMPurify,        │
│                i18n, theme, service worker (PWA/offline)               │
└───────┬───────────────────────────┬───────────────────┬───────────────┘
        │ supabase-js (anon key)     │ fetch (Bearer JWT │ presigned PUT
        │ + RLS on every table       │  or anon)         │ (short-lived)
        ▼                            ▼                   ▼
┌────────────────────┐   ┌────────────────────────┐   ┌──────────────────┐
│  SUPABASE POSTGRES │   │  SUPABASE EDGE (Deno)   │   │  CLOUDFLARE R2   │
│                    │   │                         │   │  (media bytes)   │
│ posts · comments   │   │ ai-chat ─────┐          │   └──────────────────┘
│ profiles · letters │   │ crisis-check ┤ service- │
│ notifications      │   │ strict-review┤ role +   │──────► OpenRouter
│ reports · modlog   │   │ recover-pass ┘ LLM key  │       (GPT-class LLM)
│ ai_chat_usage      │   └─────────────────────────┘
│ site_pings         │
│                    │   Realtime (WebSocket) ───────────► browser
│ RLS + RPCs + triggers │   • feed:posts                  (live feed,
└────────────────────┘   • post-comments:<id>             comments,
                         • notifications:<userId>         notifications)
```

The guiding rule: **push everything that can run in the browser into the
browser, and let Postgres' row-level security (RLS) be the real security
boundary.** The anon key shipped in [`JS/supabase-config.js`](JS/supabase-config.js)
is meant to be public; it grants nothing that RLS doesn't already allow.

---

## 2. Request flows worth tracing

### Publishing a post
```
type in Quill editor
  → client crisis regex (JS/crisis.js)         ── if "high": pause, offer hotline
  → if unsure but heavy → crisis-check edge fn  ── LLM judges intent
  → images compressed to WebP in-browser (media-compress.js)
  → presigned PUT → bytes land in R2, URL returned
  → insert row in `posts` (RLS: author = auth.uid())
  → Realtime broadcasts the insert on `feed:posts`
  → every open feed prepends the new card live
```

### Reporting → moderation (no human required to keep working)
```
report → rpc submit_report()         weighs by reporter trust, updates aggregates
  weight ≥ 2  → ai_reviewing → strict-review edge fn re-checks with a stricter prompt
  weight ≥ 5  → shadow      (downranked, author still sees it)
  weight ≥ 10 → hidden      (author + admins only)
  AI verdict → removed / shadow / pending_manual
  admin queue (RPCs gated by is_admin()) → keep / shadow / remove → moderation_log
```
Full writeup: [`supabase/MODERATION_SYSTEM.md`](supabase/MODERATION_SYSTEM.md).

### Talking to the companion
```
browser → ai-chat edge fn (Bearer JWT or anon)
  → identify caller: real user → key "u:<uuid>";  anon → key "ip:<sha256(ip)>"
  → ai_rate_check RPC (atomic, service-role only)  ── fail CLOSED on error
  → proxy to OpenRouter, cap messages/chars, stream back the reply
```

---

## 3. Technical challenges & the decisions behind them

### Email-free accounts without losing password recovery
True anonymity meant no real email on file. But "no email" breaks the one flow
every auth system leans on: *reset your password by email*. The naive version of
this project would have left users one forgotten password away from losing
everything they'd ever written.

The fix was to borrow the model crypto wallets use. Registration synthesises a
deterministic throwaway address (`username@stillhere.users`) so Supabase Auth
still has something to key on, and at sign-up the user is handed a single
high-entropy **recovery key** (`STILL-XXXX-XXXX-XXXX-XXXX`, Crockford-style
alphabet). Only its **SHA-256 hash** is stored, in a separate `account_recovery`
table. To reset, the user supplies username + key; the `recover-password` edge
function hashes the input, compares, and resets the password server-side with the
service-role key. The honest trade-off — lose the key *and* the password and the
account is gone — is stated plainly in the UI rather than hidden.

### Moderation that works while the only admin is asleep
A solo-run mental-health community can't promise a moderator is online. Auto-
deleting on a single report would let one troll erase someone's story; doing
nothing would let abuse sit for hours. The answer was to make content escalate
*itself* on an accumulated **report-weight** ladder, with reporter trust baked in
(anonymous 0.5, new account 1, established 2, admin 5). That single weighting
defeats brigading arithmetically: five throwaway accounts can only *shadow* a
post, never hide it. The AI second pass (`strict-review`) does the triage a tired
human would otherwise do at 3am, and a real person still has the final say in the
admin queue — they're just no longer the bottleneck.

### Keeping an open AI endpoint from becoming a bill bomb
The companion is intentionally open to anonymous visitors — requiring an account
to ask for help felt wrong. But an open endpoint hitting a paid LLM is an
invitation to drain the budget with a `for` loop. The defence is layered: the
edge function keys a rate limit on the user id when logged in and on a **hash of
the IP** when not (raw IPs are never stored), counts against an hourly *and*
daily ledger via an atomic `ai_rate_check` RPC that only the service role can
call, caps message count and total characters, and — critically — **fails
closed**: if the rate-check itself errors, the request is refused rather than let
through. Crisis-check gets its own separate budget so heavy chat use can never
starve the safety feature.

### Privacy claims that survive reading the source
It's easy to write "we don't track you" in a privacy policy. Making it true under
inspection took specific choices: the visitor counter table (`site_pings`) stores
**only a timestamp** — no IP, user id, fingerprint, path, or user agent, so the
"who did what" question is unanswerable by construction. The data-export feature
is assembled client-side through the user's own session, so RLS guarantees it can
only ever return that user's rows. And [`robots.txt`](robots.txt) opts the whole
site out of LLM training crawlers. The principle was: *don't claim a privacy
property you can't point at in the code.*

### No framework, on purpose
A React/Next build would have been the default reflex. I chose vanilla
HTML/CSS/JS instead because the site is content-first and largely static, because
zero build step means it can't rot from dependency churn, and because one person
can keep the entire mental model in their head. The cost is manual DOM wiring and
no component reuse out of the box; the code answers that with small self-
contained modules per page and event delegation for anything rendered
dynamically. DOMPurify guards every piece of user-written HTML, since going
framework-free gives up React's automatic escaping.

### Media without paying to store or transcode it
Images are re-encoded to WebP **in the browser** (canvas, long side capped at
1920px) before upload, so the network only ever carries the compressed bytes, and
they go straight to Cloudflare R2 via short-lived presigned PUT URLs rather than
through any server of mine. Video is size-capped but not transcoded — browser-side
transcoding needs ~30MB of ffmpeg.wasm, which wasn't worth the weight for this
audience.

---

## 4. Known limitations (honest list)

- **Anonymous abuse blocking is porous.** Blocking by device fingerprint + IP
  stops casual abuse, but a determined user can clear localStorage, use
  incognito, or change networks. The real escalation lever is requiring sign-in,
  which is a product decision I've deliberately deferred.
- **No automated test suite yet.** Verification today is manual + SQL-level
  (see §5). This is the single biggest gap for a project of this size.
- **AI moderation/crisis depend on a third party.** If OpenRouter is down,
  submit-time AI checks degrade; the client-side crisis regex still fires, and
  the rate-limiter fails closed, so nothing unsafe ships — but coverage is
  reduced.
- **Strict-review relies on a cron sweep** to catch reports made while a client
  was offline; if the cron isn't scheduled, those rows wait until the next
  client-triggered pass.
- **i18n coverage is uneven.** Interface is fully translated for EN/RU, UK is in
  beta, and other languages are scaffolded but not complete.
- **Single maintainer, single region.** No on-call, no multi-region failover.

---

## 5. How to verify it works

There's no unit-test runner wired up yet (see limitations), so verification is
currently manual and at the data layer. Concretely:

**Crisis detection** — open `/create-post` and type a known high-risk phrase
(the lexicon in [`JS/crisis.js`](JS/crisis.js) lists them, EN + RU). Expected: a
gentle care dialog with a hotline appears *before* publish, and publishing is
never hard-blocked.

**Moderation ladder** — in the Supabase SQL editor, call `submit_report` against
a test post from several identities and watch `moderation_state` advance
`active → ai_reviewing → shadow → hidden` at the documented weight thresholds.
Confirm an established account's report outweighs an anonymous one.

**Rate limiting** — hit the `ai-chat` function past the hourly cap and confirm a
`429` with a friendly retry message; confirm `ai_chat_usage` rows are keyed by
opaque `u:`/`ip:` subjects and contain **no raw IP**.

**RLS / privacy** — as user A, attempt to `select`/`update` user B's rows via
the anon client; expect zero rows / rejection. Run the data-export and confirm it
returns only the current user's data.

**Realtime** — open `/main` in two tabs; publish in one and confirm the card
appears live in the other on the `feed:posts` channel.

**Offline / PWA** — load the site, go offline, navigate; expect cached pages or
the `/offline.html` fallback, never a browser error page.

> Roadmap for this section: a small Deno test suite around the edge functions
> (rate-limit math, payload caps, crisis verdict parsing) and `pgTAP` tests for
> the RLS policies and `submit_report` weight ladder would convert most of the
> above from manual steps into CI.

---

## 6. Where the code lives

| Concern | Files |
| --- | --- |
| Feed, filters, realtime | [`JS/main-page.js`](JS/main-page.js) |
| Editor, crisis gate, upload | [`JS/create-post.js`](JS/create-post.js), [`JS/media-compress.js`](JS/media-compress.js) |
| Companion | [`JS/ai-chat.js`](JS/ai-chat.js), [`supabase/functions/ai-chat`](supabase/functions/ai-chat/index.ts) |
| Crisis detection | [`JS/crisis.js`](JS/crisis.js), [`supabase/functions/crisis-check`](supabase/functions/crisis-check/index.ts) |
| Moderation | [`JS/moderation.js`](JS/moderation.js), [`supabase/functions/strict-review`](supabase/functions/strict-review/index.ts), [`supabase/MODERATION_SYSTEM.md`](supabase/MODERATION_SYSTEM.md) |
| Auth, recovery key | [`JS/auth.js`](JS/auth.js), [`supabase/functions/recover-password`](supabase/functions/recover-password/index.ts) |
| Session / nav | [`JS/session.js`](JS/session.js) |
| Notifications | [`JS/notifications.js`](JS/notifications.js), `supabase/migrations/015_notifications.sql` |
| Privacy-pure analytics | [`JS/site-pings.js`](JS/site-pings.js), [`JS/stats.js`](JS/stats.js), `supabase/migrations/009_site_pings.sql` |
| Data export (GDPR) | [`JS/gdpr-export.js`](JS/gdpr-export.js) |
| Schema & policies | [`supabase/migrations/`](supabase/migrations/) (numbered, run in order) |
