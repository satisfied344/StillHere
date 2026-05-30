// Supabase Edge Function: crisis-check
// Second-pass crisis detector for StillHere. The client first runs a
// cheap keyword regex; if that says "none" but the text has emotional
// markers, the client calls THIS function which asks a small LLM to
// judge intent. Returns { risk: 'none'|'soft'|'high', reason }.
//
// Deploy (open to everyone, since the regex pre-filter already chose
// this is worth a model call):
//   supabase functions deploy crisis-check --no-verify-jwt
//
// Secrets:
//   OPENROUTER_KEY_SUPPORT   sk-or-…  (re-use the existing key)
//   CRISIS_MODEL             (optional) e.g. "openai/gpt-4o-mini"
//
// Cost guard:
//   • Hard length cap (3000 chars) — refused otherwise.
//   • Hybrid rate limit via the existing ai_chat_usage ledger using a
//     dedicated subject prefix ("cr:") so it doesn't eat user's AI-chat
//     budget. Anonymous: 30/hr, 100/day. Logged-in: 60/hr, 300/day.
//   • Short prompt + max_tokens 60 → ~$0.0001 / call on gpt-4o-mini.

// deno-lint-ignore-file no-explicit-any
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const MAX_CHARS = 3000;

// Separate budget from ai-chat so heavy chat users still get crisis checks.
const USER_MAX_PER_HOUR = 60;
const USER_MAX_PER_DAY  = 300;
const ANON_MAX_PER_HOUR = 30;
const ANON_MAX_PER_DAY  = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT =
  "You evaluate short user-written texts for ACUTE suicidal ideation, " +
  "imminent self-harm intent, or active method-planning / overdose. " +
  "Languages: any. Recognise obfuscation, intentional misspellings, " +
  "internet slang and euphemisms — e.g. Russian 'выпилиться' and its " +
  "obfuscated forms ('вырілітся', 'випилитися', 'выпилит*'), 'уйти из " +
  "жизни', 'закончить с этим', 'свести счёты'; English 'unalive', " +
  "'k myself', 'kms', 'sewer slide', 'goodbye everyone'. A goodbye note " +
  "vibe with finality words is a high signal even without explicit method. " +
  "Be VERY conservative against false alarms — depression, venting, " +
  "sadness, anger, breakup grief, exam stress, or metaphor are NOT crisis. " +
  "Only mark 'high' if a real person could be in danger now (explicit " +
  "intent OR method OR clear farewell). Use 'soft' for hopelessness / " +
  "worthlessness / 'I can't go on' without explicit intent. Respond ONLY " +
  'with strict JSON: {"risk":"none"|"soft"|"high","reason":"<short reason>"} ' +
  "Do not add commentary.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ risk: "none", reason: "bad_method" });

  const SUPA_URL    = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY    = Deno.env.get("SUPABASE_ANON_KEY");
  const orKey       = Deno.env.get("OPENROUTER_KEY_SUPPORT");
  const model       = Deno.env.get("CRISIS_MODEL") || "openai/gpt-4o-mini";

  // FAIL-OPEN: any infra problem → return "none" so the user is never
  // blocked. The local regex already ran; this is a bonus pass.
  if (!orKey || !SUPA_URL || !SERVICE_KEY) {
    return json({ risk: "none", reason: "env_missing" });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return json({ risk: "none", reason: "bad_json" }); }

  const text = (typeof body.text === "string" ? body.text : "").trim();
  if (!text)                  return json({ risk: "none", reason: "empty" });
  if (text.length > MAX_CHARS) return json({ risk: "none", reason: "too_long" });

  // ── caller identification (same logic as ai-chat) ────────────────
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
    } catch (_) { /* anon */ }
  }

  let subject: string;
  let maxHour: number, maxDay: number;
  if (userId) {
    subject = "cr:u:" + userId;
    maxHour = USER_MAX_PER_HOUR; maxDay = USER_MAX_PER_DAY;
  } else {
    const xff = req.headers.get("x-forwarded-for") || "";
    const ip  = xff.split(",")[0].trim() || "unknown";
    subject = "cr:ip:" + (await sha256Hex(ip));
    maxHour = ANON_MAX_PER_HOUR; maxDay = ANON_MAX_PER_DAY;
  }

  // ── rate limit via shared ai_chat_usage ledger ───────────────────
  try {
    const rl = await fetch(`${SUPA_URL}/rest/v1/rpc/ai_rate_check`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        p_subject: subject, p_max_hour: maxHour, p_max_day: maxDay,
      }),
    });
    const verdict = await rl.json().catch(() => null);
    if (!rl.ok || !verdict || verdict.allowed !== true) {
      // FAIL-OPEN — rate limited just means no AI bonus this round.
      return json({ risk: "none", reason: "rate_limited" });
    }
  } catch (_) {
    return json({ risk: "none", reason: "rate_check_failed" });
  }

  // ── ask the model ────────────────────────────────────────────────
  let llmRes: Response;
  try {
    llmRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${orKey}`,
        "Content-Type":  "application/json",
        "HTTP-Referer":  "https://stillhere.app",
        "X-Title":       "StillHere",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens:  60,
        // Force JSON-mode where supported, fall back to parsing prose.
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: text },
        ],
      }),
    });
  } catch (_) {
    return json({ risk: "none", reason: "network" });
  }

  if (!llmRes.ok) return json({ risk: "none", reason: "upstream_" + llmRes.status });

  let data: any;
  try { data = await llmRes.json(); }
  catch { return json({ risk: "none", reason: "bad_upstream_json" }); }

  const content = data?.choices?.[0]?.message?.content || "";
  let parsed: any = null;
  try { parsed = JSON.parse(content); }
  catch {
    // Loose parse — find {...} substring.
    const m = content.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch (_) {} }
  }
  if (!parsed || typeof parsed.risk !== "string") {
    return json({ risk: "none", reason: "unparseable" });
  }

  const risk = ["none", "soft", "high"].includes(parsed.risk) ? parsed.risk : "none";
  const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 80) : "";
  return json({ risk, reason });
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
