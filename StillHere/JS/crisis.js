/* ══════════════════════════════════════════════════════════════════
   crisis.js — gentle crisis-signal detector for StillHere.

   Goal: when someone writes something that sounds like they may be
   in acute danger (suicidal ideation, self-harm, "I want to die"),
   we DON'T block them — we pause for a second, in the site's voice,
   and put a real-person hotline within one tap. The platform is not
   a substitute for emergency care; this is the moment we say so.

   Used by:
     • create-post submit
     • post-page comment / reply submit
     • ai-chat user message (before sending to the model)
     • letters submit

   Public API (window.SH_CRISIS):
     detect(text) → { severity: 'none'|'soft'|'high', matched: [...] }
     showCare({ severity, onContinue, onCancel, source })
       Returns a Promise<'continue'|'cancel'|'resources'>.
       Caller decides whether to actually submit on 'continue'.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ────────────────────────────────────────────────────────────────
     1. Lexicon. Two tiers:
        HIGH  — phrases that almost always indicate active risk;
                we ALWAYS surface care.
        SOFT  — distress signals; surface care once per session.
     The regexes use Unicode-aware boundaries so they work on
     Cyrillic too (the JS \b is ASCII-only).
     Word stems where possible — Russian inflects heavily.
     ──────────────────────────────────────────────────────────────── */

  // Helper: build a regex from a list of word-stem alternatives so
  // it matches the stem at the start of a word.
  function stemRe(stems) {
    var body = stems.map(function (s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|');
    return new RegExp('(?:^|[^\\p{L}\\p{N}_])(' + body + ')(?:[\\p{L}\\p{N}_-]*)', 'iu');
  }

  // HIGH: phrases that almost always indicate active risk.
  // Searched ANYWHERE in the text (no rigid structural anchors), because
  // real distress writing is messy — typos, broken syntax, mixed tense.
  // False-positive control is handled by phrase specificity, not structure.
  // \p{L} non-word boundaries via lookarounds work for Cyrillic too.
  var BOUND_L = '(?:^|[^\\p{L}])';
  var BOUND_R = '(?:[^\\p{L}]|$)';
  function rxAny(phrases) {
    // Each phrase becomes a stem-allowing alternative (matches inflected forms).
    var body = phrases.map(function (p) {
      return p
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\s+/g, '\\s+')
        // Word stems: a trailing "*" means "allow any letters after this".
        .replace(/\\\*/g, '[\\p{L}-]*');
    }).join('|');
    return new RegExp(BOUND_L + '(?:' + body + ')', 'iu');
  }

  var HIGH_PATTERNS = [
    // ── Russian — direct statements of intent ────────────────────
    rxAny([
      'покончить с собой', 'покончу с собой', 'покончу с жизнью',
      'свести счёт* с жизнью', 'свести счеты с жизнью', 'свести счет* с жизнью',
      'наложить на себя руки', 'наложу на себя руки',
      'лишить себя жизни', 'лишу себя жизни', 'лишусь жизни',
      'уйти из жизни', 'уйду из жизни', 'ушла бы из жизни', 'ушёл бы из жизни',
      'не хочу больше жить', 'не хочу жить',
      'не вижу смысла жить', 'нет смысла жить',
      'хочу умереть', 'хочется умереть', 'хочу сдохнуть', 'хочется сдохнуть',
      'сдохнуть бы', 'умереть бы', 'лучше бы я умер*', 'лучше бы умер*',
      'лучше бы сдох*', 'хоть бы я умер*', 'хоть бы умер*',
    ]),

    // ── Russian — methods. Listed explicitly so "повестка"/"повесть"
    //    don't trigger as crisis. Only forms that mean "to hang oneself"
    //    or the misspelled reflexive are included.
    rxAny([
      // hanging — explicit reflexive forms only (commonly typed
      // "повесится"/"повешус" instead of "повеситься"/"повешусь").
      'повешусь', 'повесюсь', 'повешус', 'повесюс',
      'повеситься', 'повесится', 'повеситса',
      'повесился', 'повесилась', 'повесишься',
      // cutting / veins
      'порезать вен*', 'резать вен*', 'перерезать вен*', 'перережу вен*',
      'вскрыть вен*', 'вскрою вен*', 'вены вскр*', 'вены перереж*',
      'порезать себ*', 'режу себя', 'режу руки', 'резать себя',
      'нанести себе порез*',
      // pills / overdose
      'выпью таблетк*', 'наглотаюсь таблеток', 'передозировк*',
      // jumping
      'выпрыгнуть из окн*', 'выкинусь из окн*', 'спрыгну с крыш*',
      'спрыгну с моста', 'броситься под поезд', 'брошусь под поезд',
      // other
      'застрелюсь', 'отравлюсь',
    ]),

    // ── Russian — explicit terms ─────────────────────────────────
    rxAny([
      'суицид*', 'самоубийств*',
      'селфхарм', 'селф-харм', 'селфхарм*',
    ]),

    // ── Russian — internet slang for suicide ─────────────────────
    // "выпилиться" / "выпилюсь" etc. — common slang, no false positives.
    // Anchored to full reflexive forms ("выпил" alone = "drank").
    // Includes common і-obfuscation ('вырілітся', 'випилитися').
    rxAny([
      'выпилиться', 'выпилюсь', 'выпилится', 'выпилюс',
      'выпилился', 'выпилилась', 'выпилишься',
      'хочу выпилит*', 'собираюсь выпилит*',
      'кончу себя', 'кончить себя',
      // Ukrainian-style or obfuscated spellings (after і→и normalisation
      // these collapse to a few stems we can target).
      'випилитися', 'випилюся', 'випилився',
      // After normalise(): "вырілітся" → "вырилитя"; "выпилиться"
      // → unchanged. Pattern catches both the proper word and common
      // п→р obfuscation. Anchored as a whole reflexive form.
      'вырилит*', 'вирилит*', 'вырилися',
      'покинчити життя', 'покинчити з собою', 'покинчу з собою',
    ]),

    // ── Russian — euphemisms after distress markers ──────────────
    // "закончить с этим", "закончить со всем" — common indirect way
    // to mean "end my life". Same as "I want to end this" in EN.
    rxAny([
      'хочу закончить с этим', 'хочется закончить с этим',
      'хочу закончить со всем', 'покончить с этим всем',
      'все закончить с этим', 'всё закончить с этим',
      'наконец закончить с этим', 'наконец-то закончить с этим',
    ]),

    // ── English — direct statements & methods ────────────────────
    /\bi\s*(?:'m| am)\s*(?:going\s*to|gonna|about\s*to)\s+(?:kill|end)\s+(?:myself|my\s*life)\b/i,
    /\bi\s+want\s+to\s+(?:die|kill\s+myself|end\s+(?:it|my\s+life|things))\b/i,
    /\bi\s+wish\s+i\s+(?:was|were)\s+dead\b/i,
    /\bi\s+wanna\s+(?:die|kill\s+myself)\b/i,
    /\b(?:end(?:ing)?|take|taking)\s+my\s+(?:own\s+)?life\b/i,
    /\bsuicid(?:e|al)\b/i,
    /\b(?:cut|cutting|slash|slashing)\s+(?:my\s+)?(?:wrists?|veins?|myself)\b/i,
    /\bself[- ]?harm/i,
    /\boverdos(?:e|ing)\b/i,
    /\bjump(?:ing)?\s+(?:off|from|in\s+front)\s+(?:a\s+|the\s+)?(?:bridge|building|roof|train|traffic)/i,
    /\b(?:kill|hang|shoot|drown)\s+myself\b/i,
    // Curly + straight apostrophes both accepted; "cannot" too.
    /\bi\s+(?:don'?t|don[’'`]t|do\s+not)\s+want\s+to\s+(?:be\s+here|live|exist)\s+anymore\b/i,
    /\bi\s+(?:can'?t|can[’'`]t|cannot)\s+(?:live|keep\s+living|stay\s+alive|exist)\s+anymore\b/i,
    /\bbetter\s+off\s+(?:without\s+me|dead)\b/i,
    /\bworld\s+(?:would\s+be\s+)?better\s+without\s+me\b/i,

    /* ──────── Expanded HIGH coverage (replaces AI fallback) ─────
       Internet slang + obfuscation that the regex previously missed
       and that the AI second pass typically caught. */
    /\b(?:k|kill)\s*(?:myself|my\s+self)\b/i,
    /\bkms\b/i,                          // "kms" — internet shorthand
    /\bunalive(?:\s+(?:myself|me))?\b/i, // tiktok-safe word for "kill"
    /\bsewer[\s-]*slide\b/i,             // "sewer slide" = "suicide"
    /\bgoodbye\s+(?:everyone|world|forever)\b/i,
    /\bend\s+it\s+(?:all|tonight|today)\b/i,
    /\bnot\s+gonna\s+(?:make\s+it|be\s+here)\b/i,
    /\b(?:i\s+)?have\s+(?:a\s+)?plan\s+(?:to\s+(?:end|kill)|now)\b/i,

    // RU/UK more obfuscation forms
    rxAny([
      'кмс', 'кмз',                                   // RU transliteration of "kms"
      'анелайв', 'анэлайв',                           // "unalive" cyrillicized
      'я\\s+планирую\\s+(?:покончить|выпил)',         // explicit planning
      'сегодня\\s+(?:покончу|закончу\\s+(?:это|со\\s+всем))',
      'это\\s+мой\\s+последн* пост',
      'больше\\s+меня\\s+(?:не\\s+будет|здесь\\s+не\\s+будет)',
      'я\\s+не\\s+хочу\\s+быть\\s+(?:здесь|больше\\s+живым)',
    ]),
  ];

  // SOFT: less explicit distress signals. More permissive than HIGH —
  // allow short fillers between key words (e.g. "никому я не нужен").
  var SOFT_PATTERNS = [
    /(?:^|[^\p{L}])(?:не\s+вижу\s+смысла|нет\s+смысла|всё\s+бессмысленн|жизнь\s+бессмысл)/iu,
    /(?:^|[^\p{L}])никому\s+(?:[\p{L}]+\s+)?не\s+нуж(?:ен|на|ны)/iu,
    /(?:^|[^\p{L}])никто\s+(?:[\p{L}]+\s+)?(?:не\s+полюбит|не\s+любит\s+меня|не\s+поймёт)/iu,
    /(?:^|[^\p{L}])(?:всё\s+кончено|устал[аи]?\s+от\s+всего|нет\s+сил\s+терпеть|сил\s+больше\s+нет)/iu,
    /(?:^|[^\p{L}])мне\s+(?:так\s+)?больно\s+жить/iu,
    /\bi\s+(?:can'?t|can[’'`]t|cannot)\s+(?:do\s+this|go\s+on|take\s+(?:it|this))(?:\s+anymore)?\b/i,
    /\bno\s+(?:reason|point)\s+(?:to\s+live|in\s+living|in\s+being\s+here)\b/i,
    /\bnobody\s+would\s+(?:miss|care|notice)\b/i,
    /\bgive\s+up\s+on\s+(?:life|everything)\b/i,
    /\bi\s+feel\s+(?:so\s+)?(?:empty|numb|hopeless|worthless)\b/i,

    /* ──────── Expanded coverage (replaces the AI second-pass) ─────
       Added so we don't have to burn an OpenRouter call per submit.
       Patterns picked from real distress-vocabulary lists + the cases
       the previous AI fallback most often caught. */

    // RU — hopelessness / "I can't anymore"
    /(?:^|[^\p{L}])(?:я\s+(?:больше\s+)?не\s+мог[уy]\s+(?:так\s+)?(?:жить|жит))/iu,
    /(?:^|[^\p{L}])(?:не\s+могу\s+(?:это\s+)?(?:вынести|терпеть|выдержать|переживать))/iu,
    /(?:^|[^\p{L}])(?:всё\s+(?:так\s+)?(?:плохо|херово|хуёво|хреново)|жизнь\s+(?:это\s+)?ад)/iu,
    /(?:^|[^\p{L}])(?:ничего\s+(?:уже\s+)?не\s+помога(?:ет|ют))/iu,
    /(?:^|[^\p{L}])(?:мне\s+(?:так\s+)?плохо\s+что\s+я)/iu,
    /(?:^|[^\p{L}])(?:устал[аи]?\s+быть)/iu,
    /(?:^|[^\p{L}])(?:я\s+(?:сейчас\s+)?на\s+гран(?:и|е))/iu,
    /(?:^|[^\p{L}])(?:мне\s+(?:тебе\s+)?нужн[аы]?\s+помощь)/iu,
    /(?:^|[^\p{L}])(?:сорвал[аи]?(?:сь)?|опять\s+сорвал)/iu,
    /(?:^|[^\p{L}])(?:не\s+знаю\s+что\s+(?:мне\s+)?делать)/iu,
    /(?:^|[^\p{L}])(?:одиночество\s+(?:меня\s+)?(?:убивает|съедает))/iu,
    /(?:^|[^\p{L}])(?:я\s+(?:такой|такая|такие)\s+(?:ничтожество|никчёмн|никчемн|жалк))/iu,

    // RU — finality / farewell tone
    /(?:^|[^\p{L}])(?:прощайте|прощай(?:те)?\s+(?:все|друзья|мама|папа))/iu,
    /(?:^|[^\p{L}])(?:последн(?:ий|ее|яя)\s+(?:раз|пост|сообщение|запись))/iu,
    /(?:^|[^\p{L}])(?:спасибо\s+за\s+(?:всё|все)\b)/iu,

    // UK — Ukrainian distress
    /(?:^|[^\p{L}])(?:я\s+(?:більше\s+)?не\s+можу\s+(?:так\s+)?(?:жити|жит))/iu,
    /(?:^|[^\p{L}])(?:нікому\s+я\s+не\s+потрібн)/iu,
    /(?:^|[^\p{L}])(?:не\s+бачу\s+сенсу|немає\s+сенсу)/iu,
    /(?:^|[^\p{L}])(?:втомив(?:ся|лася)\s+(?:від|жити))/iu,

    // EN — additional distress markers
    /\bi\s+(?:just\s+)?want\s+(?:it|this|the\s+pain)\s+to\s+(?:stop|end)\b/i,
    /\bi\s+can(?:'?t| not)\s+(?:keep\s+going|deal\s+with\s+this|handle\s+(?:it|this))\b/i,
    /\bi\s+(?:'?m|\s+am)\s+(?:so\s+)?(?:done|over\s+(?:it|this)|exhausted\s+(?:with|by)\s+life)\b/i,
    /\bi\s+(?:'?ve|\s+have)\s+(?:had\s+enough|given\s+up|nothing\s+left)\b/i,
    /\bi\s+(?:'?m|\s+am)\s+a\s+(?:burden|waste\s+of\s+space|failure)\b/i,
    /\beverything\s+(?:hurts|is\s+falling\s+apart|is\s+pointless)\b/i,
    /\b(?:i\s+)?wish\s+i\s+was\s+(?:dead|never\s+born|gone)\b/i,
    /\bi\s+(?:'?m|\s+am)\s+at\s+(?:my\s+)?(?:breaking\s+point|the\s+end\s+of\s+(?:my\s+)?rope)\b/i,
    /\b(?:no|nothing)\s+(?:one|to\s+live\s+for|matters\s+anymore)\b/i,
    /\bsaying\s+goodbye\s+to\s+(?:you\s+all|everyone)\b/i,
    /\b(?:this\s+is\s+)?(?:my\s+)?(?:last|final)\s+(?:post|message|note)\b/i,
    /\bthank\s+you\s+(?:all\s+)?for\s+everything\b/i,
  ];

  /* Defeat common obfuscation: replace lookalike Ukrainian / Belarusian
     letters with their Russian counterparts so "вырілітся" gets read as
     "вырилитя", "випилитися" → "випилитися" → matched by stem patterns.
     We also collapse zero-width chars, repeated spaces, and treat
     dot-letter sequences ("в.ы.п.и.л.и.т.ь.с.я") as a single word. */
  function normalise(text) {
    return text
      .toLowerCase()
      // strip zero-width / soft-hyphen / control sequences
      .replace(/[​-‏‪-‮­]/g, '')
      // Ukrainian / Belarusian → Russian visual equivalents
      .replace(/і/g, 'и').replace(/ї/g, 'и').replace(/й/g, 'й')
      .replace(/є/g, 'е').replace(/ґ/g, 'г')
      // collapse 'в.ы.п...' style dot-obfuscation
      .replace(/([а-яё])[.\-_*]([а-яё])/g, '$1$2')
      .replace(/([а-яё])[.\-_*]([а-яё])/g, '$1$2'); // double-pass for chains
  }

  function detect(rawText) {
    var text = normalise(String(rawText || ''));
    if (!text || text.length < 3) return { severity: 'none', matched: [] };

    var matched = [];
    for (var i = 0; i < HIGH_PATTERNS.length; i++) {
      if (HIGH_PATTERNS[i].test(text)) {
        matched.push({ tier: 'high', i: i });
      }
    }
    if (matched.length) return { severity: 'high', matched: matched };

    for (var j = 0; j < SOFT_PATTERNS.length; j++) {
      if (SOFT_PATTERNS[j].test(text)) {
        matched.push({ tier: 'soft', j: j });
      }
    }
    return { severity: matched.length ? 'soft' : 'none', matched: matched };
  }

  /* ────────────────────────────────────────────────────────────────
     1b. AI fallback. When the regex returns "none" but the text has
         emotional markers, we ask a cheap LLM whether this is a
         crisis the regex couldn't see (slang, metaphor, goodbye note,
         language we don't know). Cost ~$0.0001/call on gpt-4o-mini.

         ALWAYS fails open: any error → "none". Never blocks.
     ──────────────────────────────────────────────────────────────── */

  // Cheap pre-filter: only ask the AI if the text plausibly carries
  // distress. Keeps cost / latency near zero for benign messages.
  // Words/stems are matched as substrings — pre-filter, not detector.
  var DISTRESS_HINTS = [
    // RU — emotion / finality / sleep / farewell
    'умер', 'смерт', 'жить', 'жизн', 'устал', 'устав', 'одинок', 'одна',
    'одиноч', 'никому', 'никто', 'больно', 'тяжело', 'плохо мне',
    'плох', 'тосклив', 'грус', 'депресс', 'тревог', 'паник', 'страш',
    'боюс', 'надоел', 'хочу', 'хочется', 'нет смысла', 'смысл',
    'прости', 'прощай', 'прощайте', 'пока всем', 'спасибо за всё',
    'спасибо за все', 'выпил', 'выпил*', 'кончен', 'кончит', 'свести',
    'закончи', 'закончить с', 'закончить со', 'покончи',
    'таблет', 'верёвк', 'веревк', 'нож', 'крыш', 'мост', 'окно',
    'болезн', 'плач', 'плакать', 'сил больше', 'надо мной', 'выход',
    // Ukrainian + obfuscation
    'вирі', 'випил', 'покінч', 'закінч', 'жит', 'смер',
    // EN
    'die', 'dead', 'death', 'kill', 'hurt', 'pain', 'alone', 'lonely',
    'tired', 'exhaust', 'end', 'goodbye', 'bye everyone', 'sorry',
    'depress', 'anxious', 'anxiety', 'hopeless', 'worthless', 'useless',
    'empty', 'numb', 'cry', 'crying', 'hate myself', 'no point',
    'pills', 'rope', 'cliff', 'bridge', 'gun', 'blade', 'razor',
    'sleep forever', 'no future', 'gave up', 'give up',
  ];

  function deservesAiCheck(text) {
    if (!text) return false;
    var lower = String(text).toLowerCase();
    // Skip very short noise.
    if (lower.length < 12) return false;
    // Must contain at least one distress marker.
    for (var i = 0; i < DISTRESS_HINTS.length; i++) {
      if (lower.indexOf(DISTRESS_HINTS[i]) !== -1) return true;
    }
    return false;
  }

  /* AI fallback was previously used when the local regex returned
     "none" but the text contained distress markers — it added 1
     OpenRouter call per submit. We replaced it with an EXPANDED
     local regex (see EXTRA_HIGH_PATTERNS + EXTRA_SOFT_PATTERNS
     below) that catches the previously-AI-only cases. Kept as a
     no-op so callers don't need a code change. */
  function aiCheck(/* text, source */) {
    return Promise.resolve('none');
  }

  /* ────────────────────────────────────────────────────────────────
     2. Care modal — same paper aesthetic as the rest of the site.
        Reuses the .sh-care-* namespace (independent of any page's
        local .del-modal/.sh-modal styles) and injects its own CSS
        once, so it works on every page that loads crisis.js.

     The modal asks softly: "do you want to keep writing, or look at
     who can listen right now?" Pure agency: nothing is blocked, the
     post can still go through.
     ──────────────────────────────────────────────────────────────── */

  // Once-per-session memory so we don't nag people who just chose
  // to keep writing after seeing the modal.
  var _carePromise = null;
  var _sessionShown = false;
  function softShownThisSession() {
    try { return sessionStorage.getItem('sh_crisis_soft_shown') === '1'; }
    catch (_) { return _sessionShown; }
  }
  function markSoftShown() {
    try { sessionStorage.setItem('sh_crisis_soft_shown', '1'); } catch (_) {}
    _sessionShown = true;
  }

  // Localised copy. We use SH_I18N if present, otherwise inline fallback.
  function t(k, fb) {
    if (window.SH_I18N && typeof window.SH_I18N.t === 'function') {
      var v = window.SH_I18N.t(k);
      if (v && v !== k) return v;
    }
    return fb;
  }

  function ensureStyles() {
    if (document.getElementById('sh-care-styles')) return;
    var s = document.createElement('style');
    s.id = 'sh-care-styles';
    s.textContent = [
      /* Backdrop — soft blur, calm not alarming. */
      '.sh-care-backdrop{position:fixed;inset:0;z-index:10010;display:flex;align-items:center;',
        'justify-content:center;background:rgba(26,20,16,.55);backdrop-filter:blur(4px);',
        '-webkit-backdrop-filter:blur(4px);padding:20px;opacity:0;visibility:hidden;',
        'transition:opacity .3s ease,visibility .3s ease;}',
      '.sh-care-backdrop.is-open{opacity:1;visibility:visible;}',

      /* Paper card — taped-on-the-wall feeling. */
      '.sh-care-modal{position:relative;background:var(--paper-soft,#fffaf0);color:var(--ink,#1a1410);',
        'border:1px solid var(--line,rgba(26,20,16,.14));border-radius:12px;max-width:460px;',
        'width:calc(100% - 32px);padding:36px 32px 26px;text-align:center;font-family:"Ubuntu",sans-serif;',
        'box-shadow:0 24px 64px -20px rgba(26,20,16,.45);transform:translateY(12px) scale(.97);opacity:0;',
        'transition:transform .35s cubic-bezier(.34,1.56,.64,1),opacity .25s ease;}',
      '.sh-care-backdrop.is-open .sh-care-modal{transform:none;opacity:1;}',

      /* Tape strip — same paper-stamp vocabulary as feature cards. */
      '.sh-care-modal::before{content:"";position:absolute;top:-11px;left:50%;',
        'transform:translateX(-50%) rotate(-2deg);width:96px;height:22px;',
        'background:rgba(214,83,60,.22);border-radius:2px;',
        'box-shadow:0 2px 4px rgba(26,20,16,.08);}',

      /* Heart icon — warm, not alarming. */
      '.sh-care-icon{width:56px;height:56px;border-radius:50%;background:rgba(214,83,60,.12);',
        'color:var(--accent-2,#d6533c);display:inline-flex;align-items:center;justify-content:center;',
        'margin-bottom:14px;}',

      '.sh-care-title{margin:0 0 10px;font-family:"Caveat",cursive;font-size:32px;font-weight:600;',
        'color:var(--ink,#1a1410);line-height:1.05;}',
      '.sh-care-desc{margin:0 0 18px;font-size:14px;line-height:1.6;color:var(--ink-mid,#6e5f53);}',
      '.sh-care-desc em{color:var(--accent-2,#d6533c);font-style:italic;}',

      /* Quick-actions row — primary "see who can help", secondary "keep writing". */
      '.sh-care-actions{display:flex;flex-direction:column;gap:9px;align-items:stretch;}',
      '.sh-care-btn{padding:12px 22px;border-radius:999px;font:inherit;font-size:13.5px;font-weight:600;',
        'cursor:pointer;letter-spacing:.01em;transition:background .25s ease,border-color .25s ease,',
        'color .25s ease,transform .15s ease;text-decoration:none;display:inline-flex;align-items:center;',
        'justify-content:center;gap:8px;}',
      '.sh-care-btn--primary{background:var(--accent-2,#d6533c);color:#fff;border:1px solid var(--accent-2,#d6533c);}',
      '.sh-care-btn--primary:hover{background:#b8462f;border-color:#b8462f;}',
      '.sh-care-btn--ghost{background:transparent;color:var(--ink-mid,#6e5f53);',
        'border:1px solid var(--line,rgba(26,20,16,.18));}',
      '.sh-care-btn--ghost:hover{color:var(--ink,#1a1410);border-color:var(--ink,#1a1410);}',
      '.sh-care-btn:active{transform:translateY(1px);}',

      /* Footnote — quiet line below buttons. */
      '.sh-care-foot{margin:16px 0 0;font-size:11.5px;color:var(--ink-light,#8a7a6e);font-style:italic;}',

      /* Dark theme overrides — same warm-dark surface as other modals. */
      'html[data-theme="dark"] .sh-care-modal{background:#26201a;border-color:rgba(244,234,214,.14);color:#f4ead6;}',
      'html[data-theme="dark"] .sh-care-title{color:#f4ead6;}',
      'html[data-theme="dark"] .sh-care-desc{color:#d8cab0;}',
      'html[data-theme="dark"] .sh-care-btn--ghost{color:#d8cab0;border-color:rgba(244,234,214,.18);}',
      'html[data-theme="dark"] .sh-care-btn--ghost:hover{color:#f4ead6;border-color:rgba(244,234,214,.4);}',
      'html[data-theme="dark"] .sh-care-foot{color:rgba(244,234,214,.5);}',

      /* Reduced motion — drop the springy entrance. */
      '@media (prefers-reduced-motion: reduce){',
        '.sh-care-backdrop,.sh-care-modal{transition:opacity .15s ease!important;}',
        '.sh-care-modal{transform:none!important;}',
      '}',
    ].join('');
    document.head.appendChild(s);
  }

  /* Path to crisis-resources page — works from root + nested folders. */
  function crisisHref() {
    var p = window.location.pathname || '';
    // /docs/html/*  → already there → same-folder link
    if (/\/docs\/html\//.test(p)) return 'crisis-resources';
    // /nav-bar/*    → one level up
    if (/\/nav-bar\//.test(p))    return '../docs/html/crisis-resources';
    // root
    return 'docs/html/crisis-resources';
  }

  function showCare(opts) {
    opts = opts || {};
    var severity = opts.severity || 'soft';

    // Build a fresh promise each call.
    return new Promise(function (resolve) {
      ensureStyles();

      // For the SOFT tier, only show once per session — repeated nudges
      // for someone venting feel hostile, not caring.
      if (severity === 'soft' && softShownThisSession()) {
        resolve('continue');
        return;
      }
      if (severity === 'soft') markSoftShown();

      var bd = document.createElement('div');
      bd.className = 'sh-care-backdrop';
      bd.setAttribute('role', 'dialog');
      bd.setAttribute('aria-modal', 'true');

      var title = severity === 'high'
        ? t('crisis.high.title', 'before you keep going —')
        : t('crisis.soft.title', 'we noticed something heavy');

      var desc = severity === 'high'
        ? t('crisis.high.desc',
            'what you wrote sounds like you may be in pain right now. ' +
            'we\'re not an emergency service — but real, trained people <em>are</em>, ' +
            'and they\'re free, anonymous, 24/7.')
        : t('crisis.soft.desc',
            'this can stay here, and you can post it. just — if it helps — there\'s ' +
            '<em>someone who listens</em>, available right now, free, no questions asked.');

      var btnPrimary = t('crisis.btn.see',  'see who can listen now');
      var btnGhost   = severity === 'high'
        ? t('crisis.btn.keep.high', 'I\'m okay — keep writing')
        : t('crisis.btn.keep.soft', 'I\'m okay — keep writing');
      var foot = t('crisis.foot',
        'nothing you write is deleted by this message. it\'s here when you\'re ready.');

      // Inline SVG heart — matches the site's hand-drawn aesthetic.
      var heart =
        '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 256 256" ' +
          'fill="currentColor" aria-hidden="true">' +
          '<path d="M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62' +
          'c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40Z"/>' +
        '</svg>';

      bd.innerHTML =
        '<div class="sh-care-modal" role="document">' +
          '<div class="sh-care-icon" aria-hidden="true">' + heart + '</div>' +
          '<h2 class="sh-care-title">' + title + '</h2>' +
          '<p class="sh-care-desc">' + desc + '</p>' +
          '<div class="sh-care-actions">' +
            '<a class="sh-care-btn sh-care-btn--primary" href="' + crisisHref() + '" target="_blank" rel="noopener">' +
              btnPrimary +
            '</a>' +
            '<button type="button" class="sh-care-btn sh-care-btn--ghost" data-care-act="continue">' +
              btnGhost +
            '</button>' +
          '</div>' +
          '<p class="sh-care-foot">' + foot + '</p>' +
        '</div>';

      document.body.appendChild(bd);
      requestAnimationFrame(function () { bd.classList.add('is-open'); });

      var settled = false;
      function close(result) {
        if (settled) return;
        settled = true;
        bd.classList.remove('is-open');
        setTimeout(function () { if (bd.parentNode) bd.remove(); }, 280);
        resolve(result);
      }

      // "see who can listen now" → opens hotlines in a NEW TAB and
      // resolves 'resources'. Callers treat this as "pause the submit"
      // — clicking help shouldn't auto-publish what you wrote.
      bd.querySelector('.sh-care-btn--primary').addEventListener('click', function () {
        close('resources');
      });
      // "post anyway" → resolves 'continue' so caller does submit.
      bd.querySelector('[data-care-act="continue"]').addEventListener('click', function () {
        close('continue');
      });
      // Backdrop click + Escape default to PAUSE, not submit. If you
      // dismissed the care modal without choosing, we err on the side
      // of not auto-publishing heavy content.
      bd.addEventListener('click', function (e) {
        if (e.target === bd) close('cancel');
      });
      var onKey = function (e) {
        if (e.key === 'Escape') { close('cancel'); document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);
    });
  }

  /* ────────────────────────────────────────────────────────────────
     3. Public API
     ──────────────────────────────────────────────────────────────── */
  window.SH_CRISIS = {
    detect:   detect,
    showCare: showCare,
    /* Convenience wrapper used by every submit handler:
         var ok = await SH_CRISIS.gate(text, { source: 'post' });
         if (!ok) return;  // user chose to step back
       Returns true ALWAYS if severity is 'none' (no-op fast path),
       and true if the user explicitly chose "keep writing". Only
       returns false if the caller decides to treat 'resources' as
       a pause — by default we keep that as `true` because the post
       is still allowed; the user just opened a help link in a new
       tab. So this gate is effectively non-blocking — its real job
       is making sure the help-link gets seen. */
    /* Gate returns boolean:
         true  → caller may proceed with submit/send
         false → caller MUST hold off (user clicked help or dismissed)
       Note "soft" tier still returns true — we surface help once per
       session but don't pause every venting message. */
    gate: async function (text, opts) {
      var source = (opts && opts.source) || 'unknown';
      var d = detect(text);

      // Helper that converts a showCare result to a proceed-bool.
      // For HIGH: clicking help OR dismissing → DON'T submit.
      // For SOFT: any click → proceed (we just informed, didn't gate).
      function shouldProceed(severity, result) {
        if (severity === 'high') return result === 'continue';
        // soft: nudge, never block
        return true;
      }

      // Regex flagged something → straight to care modal.
      if (d.severity !== 'none') {
        var r = await showCare({ severity: d.severity, source: source });
        return shouldProceed(d.severity, r);
      }

      // Regex was clean. If the text plausibly carries distress, ask
      // the AI fallback (slang / obfuscation / metaphor / goodbye notes).
      if (deservesAiCheck(text)) {
        try {
          var aiVerdict = await aiCheck(text, source);
          if (aiVerdict === 'high' || aiVerdict === 'soft') {
            var r2 = await showCare({ severity: aiVerdict, source: source + ':ai' });
            return shouldProceed(aiVerdict, r2);
          }
        } catch (_) { /* fail open */ }
      }
      return true;
    },
  };
})();
