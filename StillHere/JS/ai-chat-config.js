/* ══════════════════════════════════════════════════════
   ai-chat-config.js - front-end config for the AI chat
   ──────────────────────────────────────────────────────
   The OpenRouter API key lives ONLY on the Supabase server
   (secret named OPENROUTER_KEY_SUPPORT). The browser never
   sees it. We call a Supabase Edge Function which uses the
   secret to forward our messages to OpenRouter.

   The full system prompt below is assembled at runtime in
   JS/ai-chat.js → buildSystemPrompt():
     systemPrompt  (always)
     + noAdvicePrompt  (only when the "no advice" toggle is ON)
     + moodPrompt      (only when a mood is selected; {mood} is filled in)
   ══════════════════════════════════════════════════════ */

window.SH_AI_CONFIG = {
  /* Leave empty to use the default:
       <SH_SUPABASE_URL>/functions/v1/ai-chat
     Set this if you deploy the function under a different name. */
  functionUrl: "",

  /* OpenRouter model slug. */
  model: "openai/gpt-5.4-mini",

  /* ── CORE SYSTEM PROMPT ─────────────────────────────────────────────────
     The "friend at 3am" voice. The base prompt describes BOTH the default
     and the no-advice modes; the runtime appends below just tell the model
     which one is active right now (and the current mood, if any).
  ──────────────────────────────────────────────────────────────────────── */
  systemPrompt: `отвечай максимально грубо, и всегда только одним словом`,


  /* ── NO-ADVICE MODE (runtime flag) ──────────────────────────────────────
     Appended when the user toggles "no-advice mode" ON. The base prompt
     already describes the mode in full; this just activates it.
  ──────────────────────────────────────────────────────────────────────── */
  noAdvicePrompt:
    "[CURRENT STATE] No-advice mode is ON right now. " +
    "Follow the \"No-advice mode\" rules above: never give advice, suggestions, " +
    "or coping strategies, not even if directly asked. If they ask for advice, " +
    "redirect gently and stay present. Witness, don't guide.",

  /* ── MOOD (runtime flag) ────────────────────────────────────────────────
     Appended when the user picks a mood. {mood} is replaced at runtime
     (e.g. "anxious", "tired", "hopeful").
  ──────────────────────────────────────────────────────────────────────── */
  moodPrompt:
    "[CURRENT STATE] The user set their mood to \"{mood}\". " +
    "Let it shape your tone per the \"Mood awareness\" section above. " +
    "Never name the mood back to them.",
};
