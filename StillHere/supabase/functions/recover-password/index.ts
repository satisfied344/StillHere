// Supabase Edge Function: recover-password
// Email-free password reset for StillHere's anonymous accounts.
//
// Flow: user provides { username, recoveryKey, newPassword }. We resolve
// the username → user_id (service role), compare SHA-256(recoveryKey)
// against the stored hash in account_recovery, and on match set the new
// password via the Admin API. No email, no PII leaves the server.
//
// Deploy:
//   supabase functions deploy recover-password
//
// Auto-provided secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Same fake-email scheme as JS/auth.js → toFakeEmail()
function toFakeEmail(username: string) {
  return username.toLowerCase() + "@stillhere.users";
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Normalise the key the same way on both sides: trim, lowercase, strip
// spaces and dashes so "STILL-ab12 cd34" == "stillab12cd34".
function normaliseKey(k: string) {
  return (k || "").toLowerCase().replace(/[\s-]+/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")    return json({ error: "method_not_allowed" }, 405);

  const SUPA_URL    = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPA_URL || !SERVICE_KEY) return json({ error: "supabase_env_missing" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const username    = (body.username || "").toString().trim().toLowerCase();
  const recoveryKey = (body.recoveryKey || "").toString();
  const newPassword = (body.newPassword || "").toString();

  if (!username || !recoveryKey || !newPassword) {
    return json({ ok: false, error: "missing_fields", message: "Fill in all fields." }, 400);
  }
  // Same policy as registration (client validates too, but enforce
  // server-side so DevTools can't bypass it):
  //   • length ≥ 8
  //   • at least one letter
  //   • at least one digit
  if (newPassword.length < 8) {
    return json({ ok: false, error: "weak_password", message: "Password must be at least 8 characters." }, 400);
  }
  if (!/[A-Za-z]/.test(newPassword)) {
    return json({ ok: false, error: "weak_password", message: "Password must contain at least one letter." }, 400);
  }
  if (!/[0-9]/.test(newPassword)) {
    return json({ ok: false, error: "weak_password", message: "Password must contain at least one number." }, 400);
  }

  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${SUPA_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type":  "application/json",
        "apikey":        SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        ...(init.headers || {}),
      },
    });

  // 1. username → user_id (profiles is readable by service role)
  let userId: string | null = null;
  try {
    const pr = await rest(`/rest/v1/profiles?select=id&username=eq.${encodeURIComponent(username)}`);
    const rows = await pr.json();
    userId = Array.isArray(rows) && rows[0] ? rows[0].id : null;
  } catch (_) { /* fall through */ }

  // Generic failure message — never reveal whether the username exists.
  const GENERIC = { ok: false, error: "invalid", message: "Username or recovery key is incorrect." };
  if (!userId) return json(GENERIC, 200);

  // 2. fetch stored recovery hash
  let storedHash: string | null = null;
  try {
    const rr = await rest(`/rest/v1/account_recovery?select=key_hash&user_id=eq.${userId}`);
    const rows = await rr.json();
    storedHash = Array.isArray(rows) && rows[0] ? rows[0].key_hash : null;
  } catch (_) { /* fall through */ }
  if (!storedHash) return json(GENERIC, 200);

  // 3. compare hashes (constant-ish; both are fixed-length hex)
  const givenHash = await sha256Hex(normaliseKey(recoveryKey));
  if (givenHash !== storedHash) return json(GENERIC, 200);

  // 4. set the new password via the Admin API
  try {
    const up = await rest(`/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ password: newPassword }),
    });
    if (!up.ok) {
      // Log server-side only; never leak raw Admin API errors to the client.
      console.error("recover-password admin update failed:", up.status, await up.text().catch(() => ""));
      return json({ ok: false, error: "update_failed", message: "Could not reset password. Try again." }, 502);
    }
  } catch (_) {
    return json({ ok: false, error: "update_failed", message: "Could not reset password. Try again." }, 502);
  }

  return json({ ok: true, message: "Password updated — you can sign in now." });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
