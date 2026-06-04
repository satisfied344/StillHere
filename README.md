<div align="center">

<img src="StillHere/assets/favicon/web-app-manifest-192x192.png" alt="StillHere" width="120" height="120" />

# StillHere

**presence, not solutions**

*you don't have to be okay. you just have to be here.*

[stillhere.global](https://www.stillhere.global)

</div>

## why this exists

If you've ever scrolled TikTok or Twitter late at night, you've seen it: someone typing the most honest, breaking sentence of their week into the comments under a video that has nothing to do with their pain. Not for attention. They just have nowhere else to put it, and they're quietly hoping one stranger reads it.

Sometimes one does. They reply *"i read every word,"* and for that person it's the only moment in days they felt heard.

StillHere is that moment, built on purpose instead of by accident – not buried under someone else's video. It's a small, slow, anonymous place where you can write the thing you can't say out loud, and someone who's been through it will sit with you for a minute.

It is not a clinic, not a forum, not a social network. There are no likes, no follower counts, no algorithm deciding who gets seen, no streaks, no stories, no notifications nagging you to come back. The feed is plain chronological – newest at the top, that's the whole ranking. It's meant to feel like the opposite of the apps that wore you out.

A few things it deliberately is **not**, and we say so out loud everywhere on the site:

- not a replacement for a therapist – it doesn't diagnose or prescribe;
- not a crisis line – if you're in danger right now, please call real professionals (there's a one-tap [crisis resources](StillHere/docs/html/crisis-resources.html) page from every screen);
- not a debate forum – the "well, actually" crowd gets removed;
- not a place to sell anything.

---

## what you can actually do here

**Read and share stories.** The community feed (`/main`) is a chronological wall of posts. Instead of likes there are two gentle signals: **"i'm here"** (just presence – *someone is sitting with this*) and **responses** (replies). You can filter by what you're carrying – anxiety, depression, relationships, grief, burnout, loneliness, trauma, or other – but nothing is scored or boosted. Writing a post (`/create-post`) gives you a real rich editor with text, images and video; it autosaves a draft as you go, and runs two quiet checks before anything publishes (more on those below).

**Ask for no advice.** This is the feature StillHere is really built around. When you write a post, you can mark it **"i don't need advice – just presence."** Readers see that tag clearly, and the moderation leans harder on those posts to filter out the passive-aggressive *"have you tried yoga?"* replies. Sometimes advice is the worst thing a person can hear, and this is the one place that takes that seriously.

**Write a letter you'll never send.** Quiet Letters (`/letters`) is a wall of unsent letters – to a parent who can't hear it anymore, to the version of you that didn't make it, to a dog you forgot to thank, to a first love, to someone you fought with and never got to fix it. No replies. No counter. Just a color, a name or a single word, and the truth. It's inspired by Rora Blue's *The Unsent Project*.

**Talk to the companion.** The AI chat (`/ai-chat`) is a quiet conversation, not a diagnosis and not a "5 steps to happiness" script. It has a mood selector (sad, anxious, angry, numb, tired, lonely, ok, hopeful), the same no-advice toggle the posts have, and it remembers your past conversations if you have an account. It's built to *be with you*, not to fix you.

**Be as anonymous as you want.** You can read and post without an account at all. If you want a presence, you pick a username and your nick + avatar become clickable in the comments, leading to a public profile (`/u?u=username`) with the posts you chose to make public.

**See the honest numbers.** The statistics page (`/statistics`) shows aggregate totals – people here today, stories shared, languages in use, topics carried – and *only* aggregates. Nothing personal, nothing that traces back to you.

There's also a small [therapists directory](StillHere/therapists.html) for when presence isn't enough and you want a real professional, and a set of documents written in the same plain voice: [community guidelines](StillHere/docs/html/guidelines.html), [privacy policy](StillHere/docs/html/privacy-policy.html), [terms](StillHere/docs/html/terms-of-service.html).

---

## privacy and anonymity, taken literally

This is the part that's easy to claim and hard to actually build, so here's how it really works.

Accounts don't use real email. When you register, StillHere creates a throwaway address like `username@stillhere.users` – there's no inbox, nothing to verify, nothing that ties the account to you. The trade-off is that the normal "reset your password by email" flow can't exist. So instead, at sign-up you're given a single high-entropy **recovery key** to save, like a wallet seed phrase. It's stored only as a SHA-256 hash; to reset a password you supply your username and that key. Lose both and the account is genuinely gone – which is the honest cost of having no email on file.

You can download everything we hold about you at any time. The "export my data" button (GDPR Article 15 / 20) assembles a full machine-readable bundle straight from the database using your own session – row-level security already limits every query to *your* rows, so it needs no special server endpoint and can't leak anyone else's data.

The visitor counter is deliberately blind. The table behind the "X here now / Y total" widget stores **only a timestamp per visit** – no IP, no user-id, no fingerprint, no path, no user agent. You literally cannot reconstruct who did what from it. Site analytics (Vercel) are cookieless. And [`robots.txt`](StillHere/robots.txt) opts the whole site *out* of LLM training crawlers – this place is about human voices, not feedstock.

We don't sell your story, profile you, or train models on what you write.

---

## keeping it safe without being heavy-handed

Two systems run quietly in the background so the place stays gentle.

**Crisis detection.** When someone writes something that sounds like acute danger, StillHere doesn't block them. It pauses for a second, in the site's own soft voice, and puts a real hotline one tap away. A cheap keyword check runs first in the browser ([`JS/crisis.js`](StillHere/JS/crisis.js) – a tiered, Unicode-aware lexicon that handles Cyrillic word-stems, not just English); if that's unsure but the text feels heavy, it asks a small language model to judge intent ([`crisis-check`](StillHere/supabase/functions/crisis-check/index.ts)). This runs on posts, comments, letters and chat messages alike.

**Moderation that leaves humans for last.** In a community this fragile, you'd rather a real person catch the edge cases than have a model delete everything. So content escalates *itself* based on accumulated **report weight**, and a human only gets pulled in at the threshold:

```
a report comes in → weighed by who's reporting
   (anonymous 0.5 · new account 1 · 7-day-old account 2 · admin 5)

   weight ≥ 2   →  ai_reviewing     a stricter AI re-check (strict-review)
   weight ≥ 5   →  shadow           downranked, but the author still sees it
   weight ≥ 10  →  hidden           gone for everyone but author + admins

   the AI's verdict: violation → removed · borderline → shadow · clean → human queue

   admin queue (/admin):  keep · shadow · remove   – every action is logged
```

The weighting is what defeats brigading: five brand-new accounts only reach weight 5 (shadow), while five established users reach 10 (hidden). Authors always see their own content so they never think the site is silently broken, and shadowed users aren't told they've been downranked, so they don't just spin up new accounts. Admins can also temporarily block an abusive author by user-id, by anonymous device fingerprint, and by IP. The real security gate is `is_admin()` checked inside every database function – opening `/admin.html` directly changes nothing if you aren't one. The full design is written up in [`supabase/MODERATION_SYSTEM.md`](StillHere/supabase/MODERATION_SYSTEM.md).

Registration is also protected by Cloudflare Turnstile (configurable / optional, see [`JS/supabase-config.js`](StillHere/JS/supabase-config.js)).

---

## how it looks, and why

StillHere is supposed to feel like a paper notebook, not a corporate dashboard.

Hand-drawn doodles, scribbled asterisks and hearts, strips of scotch tape holding posts to the page, and a real paper grain made from an SVG `feTurbulence` filter rather than a flat background. Headings are set in **Caveat** (handwriting), body text in **Ubuntu**. The palette is warm and earthy – cream paper, dark-coffee ink, a coral accent, sage, ochre, lavender – and dark mode trades the cream for burnt coffee instead of going to flat black. It follows your system theme and remembers a manual switch.

The motion is slow and a little springy on purpose: soft bounce easing, doodles that drift and bob on the background, content that reveals itself unhurriedly as you scroll. Nothing snaps, nothing flashes. The logo wobbles when you hover it, the cursor drags a doodle behind it, and across the top of the feed a row of words scrolls by in a few languages – *breathe · respira · respire · atme · дыши*. The copy throughout is lowercase, unhurried, and says "we" instead of "I."

It installs as an app (PWA) on phones and desktop, has its own mobile layout, and the service worker keeps it readable when the network drops.

---

## under the hood

The front end is plain HTML, CSS and JavaScript – no framework, and that's a choice, not a shortcut. It keeps the site fast, keeps it alive for years without dependency churn, and means one person can hold the entire thing in their head. The only front-end libraries are [Quill](https://quilljs.com/) for the rich editor and [DOMPurify](https://github.com/cure53/DOMPurify) for safe rendering of anything user-written. Internationalisation is a small home-grown library ([`JS/i18n.js`](StillHere/JS/i18n.js)) with browser-language auto-detect; the interface ships in **English and Russian**, with **Ukrainian** in beta and more scaffolded, while post *content* can be written in 30-plus languages.

The back end is [Supabase](https://supabase.com): Postgres with row-level security on everything, email/password auth (over those throwaway addresses), and Supabase Realtime so new posts, comments and notifications appear live. Notifications themselves are a Postgres trigger that fires on new comments and writes a row for the post author or parent-comment author; the browser subscribes and shows a small corner toast. The server-side logic lives in Deno edge functions:

| function | what it does |
|---|---|
| `moderate` | the submit-time AI guard. Every post, comment, letter or username runs through this before publishing — text and any attached images. Has its own prompt-injection regex pre-filter, a 24-hour verdict cache (skip the LLM if we just saw the same text), and an honest per-subject block ledger: 3 blocks in 24h → escalating ban (24h → 72h → 168h → 720h). Anonymous callers are tracked by a SHA-256 hash of their IP — never the raw address. |
| [`ai-chat`](StillHere/supabase/functions/ai-chat/index.ts) | proxies the companion to OpenRouter. Verifies the user, rate-limits per account *and* per hashed IP, caps payload size, and fails closed – so nobody can run up the model bill. |
| [`crisis-check`](StillHere/supabase/functions/crisis-check/index.ts) | the second-pass crisis judgement, with its own separate rate-limit budget so it never competes with the chat. |
| [`strict-review`](StillHere/supabase/functions/strict-review/index.ts) | the stricter AI re-check that fires once a piece of content crosses the report threshold. |
| [`recover-password`](StillHere/supabase/functions/recover-password/index.ts) | the email-free, recovery-key reset flow. |

Images are compressed to WebP **in the browser** before they ever leave it ([`JS/media-compress.js`](StillHere/JS/media-compress.js)), then uploaded straight to [Cloudflare R2](https://developers.cloudflare.com/r2/) through short-lived presigned URLs. The AI features (moderation and companion) route through [OpenRouter](https://openrouter.ai/). Hosting is Vercel, with clean URLs and cookieless analytics.

```
StillHere/
├── *.html              every screen – index, main, create-post, ai-chat,
│                       letters, post, u (profile), login, register, admin …
├── CSS/                one stylesheet per screen, plus dark-theme / mobile / motion
├── JS/                 vanilla modules: main-page, create-post, ai-chat, crisis,
│                       moderation, auth, session, i18n, notifications,
│                       media-compress, gdpr-export, stats …
├── docs/               crisis resources · guidelines · privacy · terms
├── nav-bar/            about · contacts · profile · updates
├── assets/             doodles, paper & crayon textures, scotch tape, icons, fonts
├── supabase/
│   ├── functions/      ai-chat · crisis-check · strict-review · recover-password
│   ├── migrations/     numbered SQL – RLS, moderation, notifications,
│   │                   rate-limits, account recovery, privacy-pure pings …
│   └── MODERATION_SYSTEM.md
├── sw.js               service worker (network-first HTML, cache-first shell)
└── manifest.webmanifest
```

---

## running it yourself

It's a static site, so any local server works:

```bash
npx serve .
# or
python -m http.server 8000
```

Point [`JS/supabase-config.js`](StillHere/JS/supabase-config.js) at your own Supabase project – the key in there is the public publishable key and is safe to ship, because row-level security does the real protecting. For the full back end:

```bash
supabase db push                              # apply everything in migrations/
supabase functions deploy ai-chat crisis-check strict-review recover-password
```

Then set the function secrets (your OpenRouter key, optional model overrides) in the Supabase dashboard, and fill in the R2 and optional Turnstile keys following the comments in the config files.

---

## tests & verifying it works

There's no automated test runner wired up yet – honestly noted as the biggest gap for a project this size. For now, verification is manual and at the data layer: triggering the crisis dialog with known phrases, walking a test post up the moderation weight ladder in SQL, confirming the AI endpoint returns a friendly `429` past its cap, checking that one user can't read another's rows under RLS, and opening the feed in two tabs to watch a post arrive live. Each of these is written out step by step in [`ARCHITECTURE.md`](ARCHITECTURE.md#5-how-to-verify-it-works), along with the test suite I'd add next (Deno tests around the edge functions, `pgTAP` for the RLS policies).

## digging deeper

- **[`ARCHITECTURE.md`](ARCHITECTURE.md)** – the system diagram, the request flows, the *why* behind the hard decisions (email-free auth, human-last moderation, keeping an open AI endpoint from becoming a bill bomb), and an honest list of known limitations.
- **[`supabase/MODERATION_SYSTEM.md`](StillHere/supabase/MODERATION_SYSTEM.md)** – the full moderation design.

---

## license

Released under the [MIT License](StillHere/LICENSE) – use it, learn from it, build on it. If StillHere or anything in here is useful to you, that's the whole point.

---

<div align="center">

> *you don't always need to be fixed. sometimes you just need to be witnessed.*

If you found your way here because you're the person writing things at 3am under strangers' videos – this was built for you. You don't have to look strong to have the right to say something true. It's free, and it always will be.

&nbsp; [stillhere.global](https://www.stillhere.global) &nbsp;

</div>
