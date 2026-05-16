// Supabase Edge Function: ai-chat
// Proxies StillHere chat messages to OpenRouter using the OPENROUTER_KEY_SUPPORT
// secret (set via the Supabase dashboard or `supabase secrets set`).
//
// Deploy:
//   supabase functions deploy ai-chat --no-verify-jwt
//
// (If you want only logged-in users to call it, remove --no-verify-jwt and
//  Supabase will validate the user's JWT automatically.)

// deno-lint-ignore-file no-explicit-any
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const key = Deno.env.get("OPENROUTER_KEY_SUPPORT");
  if (!key) return json({ error: "OPENROUTER_KEY_SUPPORT not set" }, 500);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "invalid json" }, 400); }

  const model    = body.model    || "openai/gpt-5.4-mini";
  const system   = body.system   || "";
  const userMsgs = Array.isArray(body.messages) ? body.messages : [];

  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...userMsgs
      .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({ role: m.role, content: m.content })),
  ];

  if (!messages.length) return json({ error: "no messages" }, 400);

  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type":  "application/json",
      // OpenRouter likes these but they're optional
      "HTTP-Referer":  "https://stillhere.app",
      "X-Title":       "StillHere",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens:  600,
    }),
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return json({ error: "openrouter error", status: upstream.status, body: text }, 502);
  }

  let data: any;
  try { data = JSON.parse(text); }
  catch { return json({ error: "openrouter returned non-json", body: text }, 502); }

  const reply =
    data?.choices?.[0]?.message?.content ??
    "";

  return json({ reply, raw: data });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
