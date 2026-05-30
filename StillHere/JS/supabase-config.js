window.SH_SUPABASE_URL  = 'https://wncsrnhwkneidtganlse.supabase.co';
window.SH_SUPABASE_KEY  = 'sb_publishable_Pbmv_KQ7FPtKP91HS6fJ_A_vLT97-68';

/* ── Cloudflare Turnstile (bot protection on registration) ──────────
   Leave empty to disable (registration works without it). To enable:
     1. https://dash.cloudflare.com/?to=/:account/turnstile → add a site
        (domain: stillhere.global + 127.0.0.1 for local). Copy the
        SITE KEY (public) below and the SECRET KEY (private).
     2. Supabase Dashboard → Authentication → Settings → enable
        "Enable Captcha protection" → provider "Turnstile" → paste the
        SECRET KEY. Supabase then rejects any signUp() without a valid
        token, so this can't be bypassed by editing the page.
   The site key is PUBLIC and safe to ship in client code. */
window.SH_TURNSTILE_SITEKEY = '0x4AAAAAADZjG6fbDDOBA61r';
