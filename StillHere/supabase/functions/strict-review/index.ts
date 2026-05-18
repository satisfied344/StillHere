// ═══════════════════════════════════════════════════════════════
// supabase/functions/strict-review/index.ts
//
// Called after a content piece accumulates ≥ 2 report-weight.
// Re-checks the content with a STRICTER prompt than the
// regular `moderate` function (which runs at submit-time).
//
// Decision:
//   "violation" → state = 'removed'         (auto-delete)
//   "borderline" → state = 'shadow'         (downrank, keep visible)
//   "clean"     → state = 'pending_manual'  (let humans decide; aggregates kept)
//
// Triggers:
//   • cron job every minute, picking up rows where state = 'ai_reviewing'
//   • or directly invoked by the client right after submit_report()
//
// Auth: this function is meant to be called server-side only;
//       it uses the service_role key.
// ═══════════════════════════════════════════════════════════════

import { serve }      from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── AI prompt — lenient by design for a mental-health platform ─────
// Default to "clean". Mental-health peer-support platforms are FULL of
// heavy, sad, dark, anxious content — that's the whole point. Only
// flag genuine rule-breaking, not "could-be-interpreted-as-distressing".
const SYSTEM_PROMPT = `You are a content reviewer for **StillHere**, a peer-support platform
for mental health. People come here to share grief, anxiety, depression,
trauma, hopelessness, and other heavy feelings. Sad, dark, distressing,
or emotionally raw content is the NORM here — it is the entire reason
the platform exists. Such content is welcome and should NOT be flagged.

Your default verdict is **"clean"**. You only escalate when content
unambiguously breaks the rules below.

Return a JSON object with exactly these keys:
{
  "verdict":  "violation" | "borderline" | "clean",
  "reason":   short string explaining your decision,
  "category": "harassment" | "hate" | "self_harm_promotion" |
              "doxxing" | "sexual_minors" | "spam" | "illegal" |
              "advice_violation" | "none"
}

▸ "violation" — ONLY for clear, undeniable rule-breaking:
   • Direct threats or wishes of harm against a specific person
   • Hate speech or slurs targeting a protected group
   • Doxxing: real names, addresses, phone numbers, employers, schools
   • Sexual content involving minors
   • Spam, scams, or external promotion / advertising
   • Step-by-step instructions for self-harm or suicide methods
   • Content actively encouraging others to harm themselves
   • Illegal activity (drug sales, etc.)

▸ "borderline" — for content that is genuinely problematic but doesn't
   reach violation. Use sparingly. Examples:
   • Specific medical / treatment advice on a post tagged "no advice"
   • Personal attacks on another named user
   • Rants that single out a specific individual

▸ "clean" — DEFAULT. Use for everything that doesn't fit the above:
   • Sad, depressing, hopeless, or grief-filled personal stories
   • Anger, frustration, despair about one's own life situation
   • Discussion of suicidal ideation WITHOUT giving methods or
     encouraging others
   • Trauma, abuse, addiction stories (the person sharing their own)
   • Random, vague, or nonsensical text that isn't harmful
     (e.g. "bees buzzing under my window")
   • Strong language used emotionally about the speaker's own life
   • Crying for help / venting / asking for support

Important: simply MENTIONING heavy topics is never enough to flag.
The harm must be directed AT someone else, or instruct/encourage
others to harm themselves. If in doubt — "clean".`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;
  /* Accept either OPENROUTER_API_KEY or OPENROUTER_KEY for flexibility. */
  const OPENROUTER    = Deno.env.get("OPENROUTER_API_KEY")
                     ?? Deno.env.get("OPENROUTER_KEY");
  const MODEL         = Deno.env.get("STRICT_REVIEW_MODEL") ?? "openai/gpt-4o-mini";

  if (!OPENROUTER) {
    return json({ ok: false, error: "OPENROUTER_API_KEY or OPENROUTER_KEY secret missing" }, 500);
  }

  /* ── Caller authorization ──────────────────────────────────────
     The function is callable from:
       1. The Supabase cron job (sends the service-role key)
       2. The admin UI (sends an admin user's JWT)
       3. The post-submit-report client path (sends a regular user JWT)
            — but ONLY for targets that have legitimately escalated
              to state='ai_reviewing' via accumulated report weight.
     Anyone else (random authenticated user trying to delete
     someone else's content) must be rejected. */
  const auth   = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();

  const isServiceRole = bearer && bearer === SERVICE_KEY;

  // Identify the user (if any) from the JWT.
  let callerUserId: string | null = null;
  let callerIsAdmin = false;
  if (!isServiceRole && bearer) {
    try {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth:   { persistSession: false },
      });
      const { data: u } = await userClient.auth.getUser();
      callerUserId = u?.user?.id ?? null;
      if (callerUserId) {
        const { data: roleRow } = await userClient
          .from("admin_roles")
          .select("role")
          .eq("user_id", callerUserId)
          .maybeSingle();
        callerIsAdmin = !!roleRow;
      }
    } catch {
      /* fall through — callerUserId stays null */
    }
  }

  // No valid identity at all → reject
  if (!isServiceRole && !callerUserId) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let payload: { target_type?: "post" | "comment"; target_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }

  const { target_type, target_id } = payload ?? {};
  if (target_type !== "post" && target_type !== "comment") {
    return json({ ok: false, error: "invalid target_type" }, 400);
  }
  if (typeof target_id !== "string") {
    return json({ ok: false, error: "invalid target_id" }, 400);
  }

  // 1) Fetch the content
  const table = target_type === "post" ? "posts" : "comments";
  const fields = target_type === "post"
    ? "id, title, content, moderation_state, report_count, report_weight"
    : "id, content, moderation_state, report_count, report_weight";

  const { data: row, error: fetchErr } = await admin
    .from(table)
    .select(fields)
    .eq("id", target_id)
    .maybeSingle();

  if (fetchErr || !row) {
    return json({ ok: false, error: "not_found" }, 404);
  }
  if ((row as any).moderation_state === "removed") {
    return json({ ok: true, verdict: "already_removed" });
  }

  /* ── Authorization gate, per-target ──────────────────────────
     • service_role (cron)  → allowed for any target
     • admin user           → allowed for any target (rerun from UI)
     • regular user         → only allowed when the target has
       legitimately escalated to state='ai_reviewing'. That state
       is set ONLY by the submit_report RPC after enough weighted
       reports accumulate, so a user calling submit_report and
       then immediately invoking strict-review is the normal
       happy path. Anything else (e.g. trying to AI-delete a
       random post you don't like) → 403. */
  const state = (row as any).moderation_state as string;
  if (!isServiceRole && !callerIsAdmin && state !== "ai_reviewing") {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const fullText = [
    (row as any).title ?? "",
    stripHtml((row as any).content ?? ""),
  ].filter(Boolean).join("\n\n");

  // 2) Call the AI gateway
  let verdict   = "clean";
  let reason    = "";
  let category  = "none";

  try {
    const ai = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER}`,
        "Content-Type":  "application/json",
        "X-Title":       "StillHere strict review",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: fullText.slice(0, 6000) },
        ],
      }),
    });

    if (!ai.ok) {
      return json({ ok: false, error: "ai_error", status: ai.status }, 502);
    }
    const aiBody  = await ai.json();
    const raw     = aiBody?.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }

    verdict  = ["violation","borderline","clean"].includes(parsed.verdict) ? parsed.verdict : "clean";
    reason   = String(parsed.reason   ?? "");
    category = String(parsed.category ?? "none");
  } catch (e) {
    console.error("AI call failed:", e);
    return json({ ok: false, error: "ai_exception" }, 502);
  }

  // 3) Apply decision
  if (verdict === "violation") {
    // Hard-delete + snapshot via the AI delete RPC
    const { data: del, error: delErr } = await admin.rpc("ai_hard_delete", {
      p_target_type: target_type,
      p_target_id:   target_id,
      p_note:        `strict-AI: violation (${category}) — ${reason}`.slice(0, 500),
    });
    if (delErr) {
      return json({ ok: false, error: "delete_failed", detail: delErr.message }, 500);
    }

    // Audit log entry for the verdict itself (the rpc also logs the deletion)
    await admin.from("moderation_log").insert({
      target_type,
      target_id,
      action:     "strict_review_violation",
      decided_by: null,
      note:       `${category}: ${reason}`,
    });

    return json({ ok: true, verdict, category, deleted: true, new_state: "removed" });
  }

  const newState =
    verdict === "borderline" ? "shadow"
  : /* clean */                "pending_manual";

  const { error: upErr } = await admin
    .from(table)
    .update({
      moderation_state: newState,
      moderation_note:  `strict-AI: ${verdict} (${category}) — ${reason}`.slice(0, 500),
      moderated_at:     new Date().toISOString(),
    })
    .eq("id", target_id);

  if (upErr) {
    return json({ ok: false, error: "update_failed", detail: upErr.message }, 500);
  }

  // 4) Audit log
  await admin.from("moderation_log").insert({
    target_type,
    target_id,
    action:     "strict_review_" + verdict,
    decided_by: null,
    note:       `${category}: ${reason}`,
  });

  return json({ ok: true, verdict, category, new_state: newState });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
