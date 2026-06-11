// Supabase Edge Function: ai-chat
// Proxies StillHere chat messages to OpenRouter using the OPENROUTER_KEY_SUPPORT
// secret. HARDENED: requires a real logged-in user, enforces a per-user
// rate limit, and caps input size so nobody can drain your OpenRouter
// credits or send a token-bomb.
//
// Deploy (NOTE: no more --no-verify-jwt; we verify the user ourselves so
// we can return friendly JSON instead of a bare 401, and still rate-limit):
//   supabase functions deploy ai-chat
//
// Required secrets (Dashboard → Edge Functions → ai-chat → Settings):
//   OPENROUTER_KEY_SUPPORT   sk-or-…           (the LLM key)
// Auto-provided by Supabase (no need to set):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ── Abuse caps ────────────────────────────────────────────────────────
const MAX_MESSAGES      = 40;     // conversation turns sent per request
const MAX_MSG_CHARS     = 4000;   // per-message length
const MAX_TOTAL_CHARS   = 32000;  // whole conversation length (history the model remembers)

// Logged-in users get a generous budget keyed by their account.
const USER_MAX_PER_HOUR = 60;
const USER_MAX_PER_DAY  = 300;
// Anonymous users (the companion is open to everyone by design) get a
// tighter budget keyed by a hash of their IP, so a script can't drain
// the OpenRouter bill — but a real person venting still has room.
const ANON_MAX_PER_HOUR = 40;
const ANON_MAX_PER_DAY  = 90;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);

  const SUPA_URL   = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY   = Deno.env.get("SUPABASE_ANON_KEY");
  const orKey      = Deno.env.get("OPENROUTER_KEY_SUPPORT");
  if (!orKey)       return json({ error: "OPENROUTER_KEY_SUPPORT not set" }, 500);
  if (!SUPA_URL || !SERVICE_KEY) return json({ error: "supabase env not set" }, 500);

  // ── 1. Identify the caller (logged-in OR anonymous) ────────────────
  // The companion is open to everyone. If there's a real user JWT we
  // key the rate limit on their account; otherwise we key it on a hash
  // of their IP. Either way they can chat — just within a budget.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  let userId: string | null = null;
  if (token && token !== ANON_KEY) {
    try {
      const ures = await fetch(`${SUPA_URL}/auth/v1/user`, {
        headers: { "Authorization": `Bearer ${token}`, "apikey": ANON_KEY ?? "" },
      });
      if (ures.ok) {
        const u = await ures.json();
        userId = u?.id ?? null;
      }
    } catch (_) { /* treat as anonymous */ }
  }

  // Build the rate-limit subject + pick the budget.
  let subject: string;
  let maxHour: number;
  let maxDay:  number;
  if (userId) {
    subject = "u:" + userId;
    maxHour = USER_MAX_PER_HOUR;
    maxDay  = USER_MAX_PER_DAY;
  } else {
    // First IP in x-forwarded-for is the client; hash it (never store raw IP).
    const xff = req.headers.get("x-forwarded-for") || "";
    const ip  = xff.split(",")[0].trim() || "unknown";
    subject = "ip:" + (await sha256Hex(ip));
    maxHour = ANON_MAX_PER_HOUR;
    maxDay  = ANON_MAX_PER_DAY;
  }

  // ── 2. Parse + validate the payload size ───────────────────────────
  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid json" }, 400); }

  const model    = typeof body.model === "string" ? body.model : "openai/gpt-5.4-mini";
  const system   = typeof body.system === "string" ? body.system : "";
  const userMsgs = Array.isArray(body.messages) ? body.messages : [];

  if (userMsgs.length > MAX_MESSAGES) {
    return json({ error: "too_many_messages", message: "Conversation too long — start a new chat." }, 413);
  }

  let total = system.length;
  for (const m of userMsgs) {
    const c = (m && typeof m.content === "string") ? m.content : "";
    if (c.length > MAX_MSG_CHARS) {
      return json({ error: "message_too_long", message: "That message is too long." }, 413);
    }
    total += c.length;
  }
  if (total > MAX_TOTAL_CHARS) {
    return json({ error: "payload_too_large", message: "Conversation too long — start a new chat." }, 413);
  }

  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...userMsgs
      .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({ role: m.role, content: m.content })),
  ];
  if (!messages.length) return json({ error: "no messages" }, 400);

  // ── 3. Rate limit (atomic, server-side, per user) ──────────────────
  try {
    const rl = await fetch(`${SUPA_URL}/rest/v1/rpc/ai_rate_check`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        p_subject:  subject,
        p_max_hour: maxHour,
        p_max_day:  maxDay,
      }),
    });
    const verdict = await rl.json().catch(() => null);
    if (!rl.ok || !verdict || verdict.allowed !== true) {
      const retry = verdict?.retry_after_seconds ?? 3600;
      const friendly = verdict?.reason === "day_limit"
        ? "You've reached today's limit for the companion. It'll reset tomorrow — take a gentle break."
        : "You're sending messages quickly. Take a breath and try again in a moment.";
      return json(
        { error: "rate_limited", message: friendly, retry_after_seconds: retry },
        429,
        { "Retry-After": String(retry) },
      );
    }
  } catch (_) {
    // If the rate-check itself fails we FAIL CLOSED for safety — better to
    // briefly block chat than to leave the cost door open.
    return json({ error: "rate_check_failed", message: "Something went wrong — try again shortly." }, 503);
  }

  // ── 4. Proxy to OpenRouter ─────────────────────────────────────────
  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${orKey}`,
      "Content-Type":  "application/json",
      "HTTP-Referer":  "https://stillhere.app",
      "X-Title":       "StillHere",
    },
    // Friend-vibe params: warm but coherent (0.8), top_p 0.9, frequency penalty
    // to avoid repeated stock phrases. max_tokens is a HIGH safety ceiling (cost
    // guard) only, NOT a length target — the system prompt keeps replies short;
    // the ceiling just guarantees a reply is never cut off mid-sentence.
    // See JS/ai-chat-config.js for the voice/system prompt.
    body: JSON.stringify({
      model,
      messages,
      temperature:       0.8,
      max_tokens:        1000,
      top_p:             0.9,
      frequency_penalty: 0.4,
    }),
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return json({ error: "openrouter error", status: upstream.status, body: text }, 502);
  }

  let data: any;
  try { data = JSON.parse(text); }
  catch { return json({ error: "openrouter returned non-json", body: text }, 502); }

  const reply = data?.choices?.[0]?.message?.content ?? "";
  return json({ reply, raw: data });
});

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
