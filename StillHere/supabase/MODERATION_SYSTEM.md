# StillHere — Moderation System

A layered moderation system that combines **user reports**, **AI escalation**,
**soft moderation (downranking)**, and **human review** — designed for a small
community where you'd rather a real person see the edge cases than have a model
delete everything.

---

## 1. The escalation ladder

Each piece of content (post or comment) carries a **`report_weight`** and a
**`moderation_state`**. State transitions on its own based on accumulated
weight — *no admin needs to be online for the system to keep working*.

| Reports / weight                | State              | What it does                                       |
| ------------------------------- | ------------------ | -------------------------------------------------- |
| **0 (default)**                 | `active`           | Normal visibility everywhere.                      |
| **weight ≥ 2**                  | `ai_reviewing`     | Sends to the **strict-AI** edge function.          |
| **weight ≥ 5**                  | `shadow`           | Downranked in feeds; still visible to the author.  |
| **weight ≥ 10**                 | `hidden`           | Hidden from everyone except the author + admins.   |
| AI says **clean**               | `pending_manual`   | Sits in the admin queue waiting for a human.       |
| AI says **borderline**          | `shadow`           | Downranked.                                        |
| AI says **violation**           | `removed`          | Auto-deleted from public view.                     |
| Admin clicks **keep**           | `active` + reset   | Resets weight to 0. Content restored.              |
| Admin clicks **shadow**         | `shadow`           | Permanent downrank.                                |
| Admin clicks **remove**         | `removed`          | Hidden everywhere, kept in audit log.              |

### Why these thresholds?
- **2 reports** is a low bar to fail-loud, but a high enough bar to defeat a
  single troll. The AI does the heavy lifting before any human is bothered.
- **5 reports** = soft moderation — content stays online but stops trending,
  so a borderline post stops harming the feed before a human can decide.
- **10 reports** = real human-impact threshold — at this point we'd rather
  hide it now and read it later than leave it up.

---

## 2. Report weighting (anti-brigade)

A report's weight depends on **who's reporting**:

| Reporter                            | Weight |
| ----------------------------------- | ------ |
| Anonymous (no account)              | **0.5** |
| Account younger than 7 days         | **1**   |
| Account 7+ days old                 | **2**   |
| Admin / moderator                   | **5**   |

This means a brigade of 5 brand-new accounts only gets you to weight 5
(`shadow`), while 5 established users get you to weight 10 (`hidden`).

> **Reputation later.** When you add a `users.reputation` column, drop it into
> `submit_report()`'s weight calculation — e.g. `weight + log10(rep+1)` — and
> the system automatically gets smarter without other changes.

### Uniqueness (1 user ↔ 1 report per content)
Enforced at the database level via two unique indexes:
```
reports_unique_user  ON (target_type, target_id, reporter_id)
reports_unique_anon  ON (target_type, target_id, reporter_fp)
```
`reporter_fp` is a stable per-device fingerprint stored in localStorage for
anonymous users — they can still report once per device, but spamming the same
button does nothing.

---

## 3. The strict-AI second pass

Once weight ≥ 2, the client (or a cron) calls
`/functions/v1/strict-review` which:

1. Pulls the latest content from `posts` / `comments`.
2. Sends it to an LLM with a **stricter** system prompt than the submit-time
   moderation pass (since two people already flagged it).
3. Parses a JSON verdict:
   - `"violation"` → state `removed` (auto-delete) + audit-log entry.
   - `"borderline"` → state `shadow` (downrank).
   - `"clean"` → state `pending_manual` (admin sees it).
4. Writes the rationale into `moderation_note` so admins reviewing later
   know *why* the AI said what it said.

The function uses `SUPABASE_SERVICE_ROLE_KEY` + an LLM key
(`OPENROUTER_API_KEY` by default; model defaults to `openai/gpt-4o-mini`
— overridable via `STRICT_REVIEW_MODEL`).

> If you'd rather not auto-delete *anything*, change the `verdict==="violation"`
> branch in `strict-review/index.ts` from `"removed"` to `"hidden"` and a human
> always sees it before deletion.

---

## 4. Soft moderation / downranking

`shadow` is the secret sauce. It does **not** delete — it just:

- **Public feed:** the row is still selectable (the RLS policy allows it), but
  `main-page.js` can apply a downrank multiplier (e.g. don't put `shadow`
  posts in the top 10, push them past page 1).
- **Recommendations / This Week stats:** filter out `shadow` rows when
  computing trending lists.
- **Author still sees it** — they don't know they've been shadow-banned, so
  they don't escalate / make new accounts.

To wire feed downranking, add this to your `applyFilters` in
`JS/main-page.js`:
```js
filtered.sort(function (a, b) {
  // Shadowed posts always sort below active ones
  var aShadow = a.moderation_state === 'shadow' ? 1 : 0;
  var bShadow = b.moderation_state === 'shadow' ? 1 : 0;
  if (aShadow !== bShadow) return aShadow - bShadow;
  // …existing tie-breakers (recent, popular, etc.)
});
```
The `moderation_state` column is already on every fetched post.

---

## 5. The admin page (`/admin.html`)

A dedicated page only accessible to users with a row in `admin_roles`.

**What it shows:**
- All posts and comments in `ai_reviewing`, `shadow`, `hidden`, or
  `pending_manual` state.
- Tabs to filter by state, with live counts.
- Each card shows the content, the report count + weight, the AI's note (if
  any), and the actions.

**What admins can do:**
| Button     | Effect                                                  |
| ---------- | ------------------------------------------------------- |
| **keep**   | `state → active`, **resets** report aggregates to 0.    |
| **shadow** | `state → shadow` (downrank but keep visible).           |
| **remove** | `state → removed` (gone from public, kept in audit log).|
| **open**   | Opens the post in a new tab to see it in full context.  |

Each click writes an entry to `moderation_log` (target, action, who, note,
timestamp).

> The page also checks **client-side** for admin status (queries
> `admin_roles` for the current user) before rendering — but the real
> gate is the `is_admin()` SQL function called inside every RPC, so a
> non-admin who navigates to `/admin.html` directly still can't change
> any data.

---

## 6. Making someone an admin

Admins are stored in `public.admin_roles`. Promote a user with one SQL
statement in the Supabase **SQL Editor**:

```sql
-- Find the user's id (replace 'yourhandle' with the @username):
select id, email
  from auth.users
  join public.profiles on profiles.id = auth.users.id
 where profiles.username = 'yourhandle';

-- Promote them:
insert into public.admin_roles (user_id, role)
values ('<uuid-from-the-query-above>', 'super_admin');
```

Roles: `moderator` < `admin` < `super_admin`. All three can access
the admin queue; you can add finer-grained checks later (e.g. only
`super_admin` can promote others) by editing `is_admin()` or adding
new RPCs.

Revoke admin:
```sql
delete from public.admin_roles where user_id = '<uuid>';
```

---

## 7. Setup checklist (one-time, in order)

1. **Run the migration**: open Supabase → SQL Editor → paste & run
   `supabase/migrations/002_moderation_system.sql`.
2. **Deploy the edge function**:
   ```bash
   supabase functions deploy strict-review
   ```
3. **Set the function secrets** (Supabase Dashboard → Edge Functions →
   strict-review → Settings):
   ```
   OPENROUTER_API_KEY       sk-or-…
   STRICT_REVIEW_MODEL      openai/gpt-4o-mini   # optional
   ```
4. **Promote yourself** as the first super_admin (SQL block above).
5. **Visit** `/admin.html` — you should see the queue (initially empty).
6. *(optional)* schedule the strict-review function on a 1-minute cron so
   even reports made while the client was offline get processed:
   ```sql
   select cron.schedule(
     'strict-review-sweep', '* * * * *',
     $$ … see Supabase cron docs … $$
   );
   ```

---

## 8. How it all fits together (data flow)

```
USER clicks "Report" on a post
        │
        ▼
SH_MOD.report('post', id, reason)            [JS/moderation.js]
        │  rpc('submit_report', …)
        ▼
public.submit_report (PLPGSQL)               [Migration 002]
  ├─ checks uniqueness         (unique index)
  ├─ computes weight           (auth.users.created_at)
  ├─ inserts row in reports
  ├─ updates report_count / report_weight on target
  ├─ chooses new moderation_state             (ladder)
  └─ returns { ok, total_weight, new_state }
        │
        ▼  if new_state == "ai_reviewing":
SH_MOD.report fires POST to strict-review
        │
        ▼
strict-review edge function                  [functions/strict-review/index.ts]
  ├─ pulls target content
  ├─ calls LLM with strict prompt
  ├─ updates moderation_state
  └─ writes moderation_note + moderation_log

ADMIN visits /admin.html
        │  rpc('admin_queue_list')
        ▼
public.admin_queue view  (gated by is_admin())
        │
        ▼
Admin clicks keep / shadow / remove
        │  rpc('admin_decide', …)
        ▼
public.admin_decide
  ├─ verifies is_admin()
  ├─ updates moderation_state on target
  └─ appends to moderation_log
```

---

## 9. What's hidden from whom

Enforced by the RLS policies in the migration:

| State            | anon / other users  | author | admin |
| ---------------- | ------------------- | ------ | ----- |
| `active`         | ✅                  | ✅     | ✅    |
| `shadow`         | ✅ (downranked)     | ✅     | ✅    |
| `ai_reviewing`   | ❌                  | ✅     | ✅    |
| `pending_manual` | ❌                  | ✅     | ✅    |
| `hidden`         | ❌                  | ✅     | ✅    |
| `removed`        | ❌                  | ❌     | ✅ (in queue/log) |

Authors always see their own content so they don't think the platform is
silently broken. Admins always see everything so they can review.

---

## 10. Future hooks (when you want them)

- **Reputation system** → multiply `weight` by `log(reputation + 1)` in
  `submit_report()`. Drop it in; nothing else changes.
- **Auto-ban repeat-offenders** → trigger on `moderation_log` when the same
  `target.user_id` has ≥ N `remove` actions.
- **Appeal page** → a per-row "appeal" form for authors whose content was
  removed; routes to a new state `appealed` that admins see at the top.
- **Cron sweeper** → catch any `ai_reviewing` rows that the client failed to
  push (network drop, tab closed) and re-run strict-review on them.

---

*That's the whole system.* You now have:
- ✅ Working user reports with anti-brigade weighting
- ✅ Automatic AI-strict re-check above threshold
- ✅ Soft moderation via downranking (shadow)
- ✅ Hard moderation via hidden (≥ 10 reports)
- ✅ Admin-only queue page with full audit log
- ✅ Documented promotion / revocation of admins
