/* ═══════════════════════════════════════════════════════════════════
   i18n.js — minimal client-side internationalization.
   • Two languages: en (default) + ru.
   • Persists choice in localStorage under "sh_lang".
   • Replaces text by looking up data-i18n="key" attributes.
   • Replaces an attribute via data-i18n-attr-<attr>="key" (e.g.
     data-i18n-attr-placeholder="search.placeholder").
   • Injects a "EN | RU" toggle into .top-info nav on every page.
   • Translates strings emitted by SH_I18N.t(key) for JS-built HTML.

   "StillHere" the name is intentionally NOT translated anywhere — it's
   a brand. Everything else is.

   To add another translatable page, just mark up its HTML with
   data-i18n attributes that reference keys in DICT below.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STORAGE_KEY = 'sh_lang';
  var DEFAULT_LANG = 'en';

  /* ── Dictionary ─────────────────────────────────────────────────
     Page-namespaced keys. "StillHere" stays as a brand name and is
     never put into the dictionary.                                  */
  var DICT = {

    /* ── shared nav + footer ─────────────────────────────── */
    'nav.about':           { en: 'about',                 ru: 'о проекте' },
    'nav.contacts':        { en: 'contacts',              ru: 'контакты' },
    'nav.updates':         { en: 'updates',               ru: 'обновления' },
    'nav.start':           { en: 'start',                 ru: 'начать' },
    'nav.login':           { en: 'login',                 ru: 'войти' },
    'nav.signout':         { en: 'Sign out',              ru: 'Выйти' },
    'nav.profile':         { en: 'profile',               ru: 'профиль' },

    'menu.login':          { en: 'Login',                 ru: 'Войти' },
    'menu.feed':           { en: 'Community feed',        ru: 'Лента сообщества' },
    'menu.preferences':    { en: 'Preferences',           ru: 'Настройки' },
    'menu.ai':             { en: 'AI support',            ru: 'AI-поддержка' },
    'menu.private':        { en: 'Private support',       ru: 'Личная поддержка' },
    'menu.session':        { en: 'Book a session',        ru: 'Записаться на сессию' },
    'menu.guidelines':     { en: 'Guidelines',            ru: 'Правила' },
    'menu.statistics':     { en: 'Statistics',            ru: 'Статистика' },
    'menu.signout':        { en: 'Sign out',              ru: 'Выйти' },

    /* Feed action buttons */
    'main.feed.filter':    { en: 'filter',                ru: 'фильтр' },
    'main.feed.refresh':   { en: 'refresh',               ru: 'обновить' },

    /* ─────────── ABOUT PAGE ─────────── */
    'ab.hero.eyebrow':     { en: '<em>—</em> a quiet space, made on purpose',
                             ru: '<em>—</em> тихое место, сделанное намеренно' },
    'ab.hero.title':       { en: 'about <em>StillHere.</em>',
                             ru: 'о <em>StillHere.</em>' },
    'ab.hero.card.eyebrow':{ en: '— our one-line',
                             ru: '— наш девиз' },
    'ab.hero.card.title':  { en: 'presence, not solutions.',
                             ru: 'присутствие, а не решения.' },
    'ab.hero.card.text':   { en: 'you don\'t always need to be fixed. sometimes you just need to be <strong>heard</strong> — and to know someone, somewhere, gets it.',
                             ru: 'тебя не всегда нужно «чинить». иногда тебе просто нужно, чтобы тебя <strong>услышали</strong> — и чтобы кто-то где-то понял.' },
    'ab.hero.lede':        { en: 'we built this for the moments when everything feels heavy and you don\'t know where to put it. not a clinic, not a forum — a <em>small, soft place</em> on the internet where presence matters more than answers.',
                             ru: 'мы сделали это для моментов, когда всё кажется тяжёлым и ты не знаешь куда это девать. не клиника, не форум — <em>маленькое мягкое место</em> в интернете, где присутствие важнее ответов.' },

    'ab.sec.01.title':     { en: 'why this exists',
                             ru: 'зачем это существует' },
    'ab.sec.01.hint':      { en: 'the short version',
                             ru: 'если коротко' },

    'ab.sec.origin.eyebrow':{ en: '— the origin',
                              ru: '— начало' },
    'ab.sec.origin.title': { en: 'it started in a comment section',
                             ru: 'всё началось в комментариях' },
    'ab.sec.origin.hint':  { en: 'not a startup idea',
                             ru: 'это не стартап-идея' },

    'ab.sec.02.title':     { en: 'how it works',
                             ru: 'как это работает' },
    'ab.sec.02.hint':      { en: 'four small things, no more',
                             ru: 'четыре простых вещи, не больше' },

    'ab.sec.03.title':     { en: 'what we believe',
                             ru: 'во что мы верим' },
    'ab.sec.03.hint':      { en: 'our four quiet rules',
                             ru: 'наши четыре тихих правила' },

    'ab.sec.04.title':     { en: 'what we\'re not',
                             ru: 'чем мы не являемся' },
    'ab.sec.04.hint':      { en: 'honest about the edges',
                             ru: 'честно о границах' },

    'ab.sec.05.title':     { en: 'who\'s behind this',
                             ru: 'кто за этим стоит' },
    'ab.sec.05.hint':      { en: 'just one person',
                             ru: 'один человек' },

    'ab.sec.06.title':     { en: 'inspirations &amp; honest credit',
                             ru: 'вдохновение и честные благодарности' },
    'ab.sec.06.hint':      { en: 'we didn\'t invent quiet',
                             ru: 'тишину придумали не мы' },

    'ab.closing.text':     { en: 'wherever you are tonight — <em>we\'re glad you found this.</em>',
                             ru: 'где бы ты ни был сегодня вечером — <em>мы рады, что ты нашёл это место.</em>' },
    'ab.closing.sub':      { en: '— still here, always',
                             ru: '— всё ещё здесь, всегда' },
    'ab.cta.share':        { en: 'start sharing',         ru: 'начать делиться' },
    'ab.cta.ai':           { en: 'talk to ai support',    ru: 'поговорить с AI' },

    /* Premise paragraphs */
    'ab.premise.p1': {
      en: 'most of the internet is loud. it wants your attention, your reaction, your hot take. mental-health spaces aren\'t always better — they push <strong>productivity</strong>, <strong>positivity</strong>, <strong>five-step plans</strong>.',
      ru: 'большая часть интернета — шумная. ему нужно твоё внимание, твоя реакция, твоё мнение. mental health пространства не всегда лучше — там подсовывают <strong>продуктивность</strong>, <strong>позитив</strong>, <strong>планы из пяти шагов</strong>.'
    },
    'ab.premise.p2': {
      en: 'sometimes none of that fits. sometimes you just need somewhere <em>slower</em>. somewhere a stranger can read what you wrote and not try to sell you anything, fix you, or rush you toward "better."',
      ru: 'иногда ничего из этого не подходит. иногда тебе просто нужно место <em>помедленнее</em>. место, где незнакомый человек прочитает то, что ты написал — и не будет тебе ничего продавать, чинить тебя или подгонять к «лучше».'
    },
    'ab.premise.p3': {
      en: 'so we made one. it\'s small on purpose. it\'s anonymous on purpose. and it stays free, because the people who need it most can rarely afford one more subscription.',
      ru: 'поэтому мы сделали такое место. маленькое — намеренно. анонимное — намеренно. и оно бесплатное, потому что те, кому это нужнее всего, редко могут позволить себе ещё одну подписку.'
    },
    'ab.premise.quote': {
      en: 'you don\'t have to be okay. <em>you just have to be here.</em>',
      ru: 'тебе не обязательно быть «в порядке». <em>достаточно просто быть здесь.</em>'
    },
    'ab.premise.quote.attr': { en: '— the only rule', ru: '— единственное правило' },

    /* Origin paragraphs */
    'ab.origin.p1': {
      en: 'people kept writing honest things in places never meant for them — comment sections, random posts, late-night threads. not because they wanted attention. because they needed somewhere to put what they couldn\'t say out loud.',
      ru: 'люди постоянно пишут честные вещи в местах, которые для этого не предназначены — в комментариях, под случайными постами, в ночных тредах. не потому что им нужно внимание. потому что им нужно куда-то деть то, что нельзя сказать вслух.'
    },
    'ab.origin.p2': {
      en: '<em>(i noticed it most on TikTok, but it\'s everywhere.)</em>',
      ru: '<em>(я заметил это больше всего в TikTok, но это везде.)</em>'
    },
    'ab.origin.p3': {
      en: 'the pattern was always the same: someone writing the most honest thing they\'d said in months, sideways, under content that had nothing to do with them — and hoping a single stranger would notice.',
      ru: 'паттерн всегда один: человек пишет самое честное, что говорил за месяцы — сбоку, под контентом, который не имеет к нему отношения — и надеется, что хоть один незнакомец заметит.'
    },
    'ab.origin.p4': {
      en: 'sometimes one did. and the only thing they said back was something like <em>"i read every word."</em> — and that was the only place all week the person who wrote it felt heard. <strong>someone actually stopped and listened.</strong>',
      ru: 'иногда кто-то замечал. и единственное, что отвечал, было что-то вроде <em>«я прочитал каждое слово»</em> — и это было единственное место за всю неделю, где человека услышали. <strong>кто-то реально остановился и послушал.</strong>'
    },
    'ab.origin.p5': {
      en: '<strong>StillHere is that — on purpose.</strong> not buried under a video your friends might see. not borrowed from someone else\'s thread. a quiet feed where you can write what you couldn\'t say out loud, and someone who\'s been there too can sit with you for a minute.',
      ru: '<strong>StillHere — это оно, намеренно.</strong> не спрятано под видео, которое могут увидеть твои друзья. не позаимствовано из чужого треда. тихая лента, где можно написать то, что нельзя сказать вслух — и где кто-то, кто там тоже был, посидит с тобой минуту.'
    },
    'ab.origin.pull': {
      en: 'you shouldn\'t have to look <em>strong</em><br>to be allowed to say <em>something true.</em>',
      ru: 'тебе не обязательно выглядеть <em>сильным</em>,<br>чтобы тебе разрешили сказать <em>что-то настоящее.</em>'
    },

    /* Section 02 — feature cards */
    'ab.feat.01.label': { en: '— feature 01',         ru: '— возможность 01' },
    'ab.feat.01.title': { en: 'community feed',       ru: 'лента сообщества' },
    'ab.feat.01.desc':  {
      en: 'a slow scroll of stories — no likes, no clout. people share what they\'re carrying; others respond gently. tag <strong>"no advice"</strong> if you only want presence.',
      ru: 'медленная лента историй — без лайков, без рейтингов. люди делятся тем, что носят с собой; другие отвечают мягко. ставь тег <strong>«без советов»</strong>, если хочешь только присутствия.'
    },
    'ab.feat.01.link':  { en: 'visit feed',           ru: 'открыть ленту' },

    'ab.feat.02.label': { en: '— feature 02',         ru: '— возможность 02' },
    'ab.feat.02.title': { en: 'ai companion',         ru: 'AI-собеседник' },
    'ab.feat.02.desc':  {
      en: 'a quiet companion for the hours when nobody else is around. <strong>no diagnosis, no scripts, no pressure</strong> to feel better by the end of the conversation — it just stays with you for as long as you want it to.',
      ru: 'тихий собеседник для часов, когда никого больше нет рядом. <strong>без диагнозов, без скриптов, без давления</strong> почувствовать себя лучше к концу разговора — он просто остаётся с тобой столько, сколько тебе нужно.'
    },
    'ab.feat.02.link':  { en: 'open chat',            ru: 'открыть чат' },

    'ab.feat.03.label': { en: '— feature 03',         ru: '— возможность 03' },
    'ab.feat.03.title': { en: 'anonymous by default', ru: 'анонимно по умолчанию' },
    'ab.feat.03.desc':  {
      en: 'no real name, no photo, no profile to maintain. you can post fully anonymously, or pick any name you want. <strong>nothing is sold to anyone, ever.</strong>',
      ru: 'без настоящего имени, без фото, без профиля, который надо поддерживать. можно публиковать полностью анонимно или выбрать любое имя. <strong>ничего никогда никому не продаётся.</strong>'
    },
    'ab.feat.03.link':  { en: 'read privacy',         ru: 'политика конфиденциальности' },

    /* Section 03 — principles */
    'ab.princ.01.title': { en: 'presence over fixing',  ru: 'присутствие важнее «починить»' },
    'ab.princ.01.desc':  { en: 'listening is the work. solutions are optional.',
                           ru: 'слушать — это и есть работа. решения — опциональны.' },
    'ab.princ.02.title': { en: 'slow over viral',       ru: 'медленно важнее вирусно' },
    'ab.princ.02.desc':  { en: 'no streaks, no notifications begging for return.',
                           ru: 'без стриков, без уведомлений, выпрашивающих вернуться.' },
    'ab.princ.03.title': { en: 'private over public',   ru: 'приватно важнее публично' },
    'ab.princ.03.desc':  { en: 'your story is yours. we don\'t sell, profile, or train on it.',
                           ru: 'твоя история — твоя. мы её не продаём, не профилируем, не тренируем на ней модели.' },
    'ab.princ.04.title': { en: 'human over algorithm',  ru: 'человек важнее алгоритма' },
    'ab.princ.04.desc':  { en: 'the feed is chronological. no engagement scoring.',
                           ru: 'лента хронологическая. без скоринга вовлечённости.' },

    /* Section 04 — what we're not */
    'ab.not.title': { en: 'we\'re <em>not</em> a replacement for —',
                      ru: 'мы <em>не</em> замена для —' },
    'ab.not.sub':   { en: 'StillHere is a soft place, but it has limits. please know them, and please don\'t carry serious things alone.',
                      ru: 'StillHere — мягкое место, но у него есть границы. знай их, и пожалуйста, не неси серьёзные вещи в одиночку.' },
    'ab.not.01': {
      en: '<strong>a therapist or psychiatrist.</strong> we can\'t diagnose, prescribe, or treat clinical conditions.',
      ru: '<strong>терапевт или психиатр.</strong> мы не ставим диагнозы, не выписываем рецепты и не лечим клинические состояния.'
    },
    'ab.not.02': {
      en: '<strong>a crisis line.</strong> if you\'re unsafe right now, please call a trained counselor — they\'re 24/7 and free.',
      ru: '<strong>линия экстренной помощи.</strong> если тебе сейчас небезопасно — позвони обученному консультанту. они работают 24/7 и бесплатно.'
    },
    'ab.not.03': {
      en: '<strong>a debate forum.</strong> unkindness and "well actually" replies get removed.',
      ru: '<strong>дискуссионный форум.</strong> грубость и ответы в духе «вообще-то» удаляются.'
    },
    'ab.not.04': {
      en: '<strong>a place for promotion.</strong> no products, no programs, no "DM me my e-book."',
      ru: '<strong>место для продвижения.</strong> никаких товаров, программ, «напиши мне за моей книгой».'
    },

    /* Section 05 — Story */
    'ab.story.eyebrow': { en: '— the person',                  ru: '— человек' },
    'ab.story.heading': { en: 'one person, <em>working quietly.</em>',
                          ru: 'один человек, <em>работающий тихо.</em>' },
    'ab.story.p1': {
      en: 'StillHere is a <strong>solo project</strong>. one developer, building and maintaining the whole thing — the site, the database, the moderation, the writing on these pages, all of it. no team, no investors, no growth deck.',
      ru: 'StillHere — <strong>сольный проект</strong>. один разработчик, который строит и поддерживает всё — сайт, базу, модерацию, тексты на этих страницах. без команды, без инвесторов, без презентации для роста.'
    },
    'ab.story.p2': {
      en: 'the reason it exists is personal. burnout, grief, the kind of nights where the internet only made it worse. nothing felt right — so this place is an attempt to make one that <strong>doesn\'t shout</strong>.',
      ru: 'причина — личная. выгорание, потеря, ночи, когда интернет делал только хуже. ничто не подходило — поэтому это место попытка сделать такое, которое <strong>не кричит</strong>.'
    },
    'ab.story.p3': {
      en: 'everything is open-source. no ads, no data sales, no quarterly numbers to hit. running costs come out of one person\'s pocket; if it ever grows, it\'ll grow slowly and only as much as it needs to.',
      ru: 'весь код открытый. без рекламы, без продажи данных, без квартальных показателей. расходы оплачиваются из одного кармана; если когда-нибудь вырастет — медленно и ровно настолько, насколько нужно.'
    },
    'ab.story.p4': {
      en: 'if you want to help — share your story, send a kind reply, point out a bug, or just exist here quietly — you already are.',
      ru: 'если хочешь помочь — поделись историей, оставь добрый ответ, укажи на баг или просто тихо побудь здесь — ты уже помогаешь.'
    },

    /* Section 06 — Inspirations */
    'ab.insp.p1': {
      en: 'StillHere stands on the shoulders of projects that figured out something tender long before we did. <em>quiet letters</em>, our wall of unsent messages, is openly inspired by <a href="https://theunsentproject.com" target="_blank" rel="noopener" style="color:var(--accent-2); border-bottom:1px dashed rgba(214,83,60,0.45);"><strong>The Unsent Project</strong></a> by <em>Rora Blue</em> — a years-running collection of messages to first loves, sorted by colour. it\'s a quiet, generous piece of internet, and the format clicked into what we were already building.',
      ru: 'StillHere стоит на плечах проектов, которые поняли что-то нежное задолго до нас. <em>тихие письма</em> — наша стена неотправленных сообщений — открыто вдохновлены <a href="https://theunsentproject.com" target="_blank" rel="noopener" style="color:var(--accent-2); border-bottom:1px dashed rgba(214,83,60,0.45);"><strong>The Unsent Project</strong></a> от <em>Rora Blue</em> — многолетней коллекцией сообщений первым любовям, отсортированных по цвету. это тихая, щедрая часть интернета, и формат совпал с тем, что мы уже строили.'
    },
    'ab.insp.p2': {
      en: 'we kept what mattered — no replies, just colour and short honesty — and shaped it toward this place\'s purpose: not only first loves, but the parent who can\'t hear it anymore, the version of you that didn\'t make it through, the dog you forgot to thank. if you\'ve never been there, go. it\'s worth your evening.',
      ru: 'мы оставили главное — без ответов, только цвет и короткая честность — и развернули это под задачи нашего места: не только первые любови, но и родитель, который уже не услышит, версия тебя, которая не дошла, собака, которую забыл поблагодарить. если ты там не был — сходи. это стоит твоего вечера.'
    },

    /* TikTok-style mock thread inside the origin section */
    'ab.mock.label': { en: 'someone else\'s post — comments',
                       ru: 'чужой пост — комментарии' },
    'ab.mock.video': {
      en: 'a video about pretending you\'re fine when you\'re not.<br><span style="font-size:11px;opacity:0.7;">you\'d never repost it. everyone you know would see you\'re not okay.</span>',
      ru: 'видео о том, как притворяться, что всё ок, когда это не так.<br><span style="font-size:11px;opacity:0.7;">ты бы никогда его не репостнул. все, кого ты знаешь, увидели бы, что тебе плохо.</span>'
    },
    'ab.mock.c1': {
      en: 'i don\'t know why i\'m writing this here.<br>i just don\'t have anywhere else to say it.<br>everyone around me thinks i\'m doing fine and i\'m too tired to explain that i\'m not.<br>i don\'t want advice. i think i just needed one place where i didn\'t have to pretend for a minute.',
      ru: 'я не знаю, зачем пишу это здесь.<br>мне просто негде больше это сказать.<br>все вокруг думают, что у меня всё в порядке, а я слишком устал объяснять, что нет.<br>мне не нужны советы. кажется, мне просто нужно было одно место, где не надо притворяться хотя бы минуту.'
    },
    'ab.mock.c2': {
      en: 'i read every word.<br>you don\'t have to be the strong one here.<br>i\'m sitting with you for a minute. that\'s all.',
      ru: 'я прочитал каждое слово.<br>тебе не обязательно быть здесь сильным.<br>я просто посижу с тобой минуту. это всё.'
    },

    'footer.subtitle':     { en: 'A project about presence, not solutions',
                             ru: 'Проект о присутствии, не о решениях' },
    'footer.platform':     { en: 'Platform',              ru: 'Платформа' },
    'footer.browse':       { en: 'Browse Stories',        ru: 'Читать истории' },
    'footer.share':        { en: 'Share Your Story',      ru: 'Поделиться своей историей' },
    'footer.updates':      { en: 'Updates',               ru: 'Обновления' },
    'footer.support':      { en: 'Support',               ru: 'Поддержка' },
    'footer.about':        { en: 'About Us',              ru: 'О нас' },
    'footer.contacts':     { en: 'Contacts',              ru: 'Контакты' },
    'footer.guidelines':   { en: 'Guidelines',            ru: 'Правила' },
    'footer.crisis':       { en: 'Crisis Resources',      ru: 'Кризисные ресурсы' },
    'footer.legal':        { en: 'Legal',                 ru: 'Правовое' },
    'footer.privacy':      { en: 'Privacy Policy',        ru: 'Политика конфиденциальности' },
    'footer.terms':        { en: 'Terms of Service',      ru: 'Условия использования' },
    'footer.consent':      { en: 'by being here, you accept our <a href="docs/html/terms-of-service.html">terms</a> &amp; <a href="docs/html/privacy-policy.html">privacy</a>.',
                             ru: 'находясь здесь, ты принимаешь наши <a href="docs/html/terms-of-service.html">условия</a> и <a href="docs/html/privacy-policy.html">приватность</a>.' },
    'footer.consent.docs': { en: 'by being here, you accept our <a href="terms-of-service.html">terms</a> &amp; <a href="privacy-policy.html">privacy</a>.',
                             ru: 'находясь здесь, ты принимаешь наши <a href="terms-of-service.html">условия</a> и <a href="privacy-policy.html">приватность</a>.' },
    'footer.consent.subdir':{ en: 'by being here, you accept our <a href="../docs/html/terms-of-service.html">terms</a> &amp; <a href="../docs/html/privacy-policy.html">privacy</a>.',
                             ru: 'находясь здесь, ты принимаешь наши <a href="../docs/html/terms-of-service.html">условия</a> и <a href="../docs/html/privacy-policy.html">приватность</a>.' },

    /* ── nav-bar/contacts.html ────────────────────────────── */
    'ct.hero.eyebrow':     { en: '<em>—</em> reach out, anytime',
                             ru: '<em>—</em> напиши нам в любое время' },
    'ct.hero.title':       { en: 'say <em>hello.</em>',
                             ru: 'просто <em>напиши.</em>' },
    'ct.hero.lede':        { en: 'questions, ideas, kind words, partnership requests — we read everything. we\'re a <em>small team</em> running this quietly, so replies may take a day or two. if you\'re in crisis, please scroll down first.',
                             ru: 'вопросы, идеи, добрые слова, предложения о сотрудничестве — мы читаем всё. мы <em>маленькая команда</em>, и ведём это тихо, поэтому ответ может занять день-два. если ты в кризисе — пожалуйста, прокрути вниз сначала.' },
    'ct.hero.card.eyebrow':{ en: '— note from us',                ru: '— заметка от нас' },
    'ct.hero.card.title':  { en: 'we read every message.',         ru: 'мы читаем каждое сообщение.' },
    'ct.hero.card.text':   { en: 'no bots, no support tickets. just one human reading email between coffee. <strong>thank you for taking time to write.</strong>',
                             ru: 'без ботов, без тикетов поддержки. один живой человек читает почту между чашками кофе. <strong>спасибо, что нашёл время написать.</strong>' },

    'ct.crisis.title':     { en: 'in crisis right now?',           ru: 'в кризисе прямо сейчас?' },
    'ct.crisis.hint':      { en: 'please reach a real person',     ru: 'пожалуйста, обратись к живому человеку' },
    'ct.crisis.subtitle':  { en: 'we\'re not an emergency service.', ru: 'мы не служба экстренной помощи.' },
    'ct.crisis.desc':      { en: 'if you\'re feeling unsafe or in immediate distress, please call a trained crisis counselor — they\'re available 24/7, free, in most countries.',
                             ru: 'если тебе небезопасно или ты в остром кризисе — пожалуйста, позвони обученному кризисному консультанту: они доступны 24/7, бесплатно, в большинстве стран.' },
    'ct.crisis.btn':       { en: 'crisis hotlines',                ru: 'телефоны помощи' },

    'ct.email.title':      { en: 'write to us',                    ru: 'напиши нам' },
    'ct.email.hint':       { en: 'usually within 1–2 days',        ru: 'обычно отвечаем за 1–2 дня' },
    'ct.email.general':    { en: 'general',                        ru: 'общие вопросы' },
    'ct.email.general.desc':{ en: 'questions, feedback, kind words, partnerships — anything, really.',
                              ru: 'вопросы, отзывы, добрые слова, партнёрства — что угодно.' },
    'ct.email.support':    { en: 'support',                        ru: 'поддержка' },
    'ct.email.support.desc':{ en: 'account issues, bugs, accessibility concerns, content moderation.',
                              ru: 'проблемы с аккаунтом, баги, доступность, модерация контента.' },
    'ct.email.press':      { en: 'press & media',                  ru: 'пресса и медиа' },
    'ct.email.press.desc': { en: 'interview requests, article features, brand assets.',
                             ru: 'запросы на интервью, материалы для статей, брендовые ассеты.' },

    'ct.social.title':     { en: 'find us elsewhere',              ru: 'найди нас в соцсетях' },
    'ct.social.hint':      { en: 'smaller updates, the same calm tone',
                             ru: 'короткие апдейты, тот же спокойный тон' },
    'ct.social.tg.desc':   { en: 'our quietest channel — gentle reminders, small updates.',
                             ru: 'наш самый тихий канал — мягкие напоминания, маленькие обновления.' },
    'ct.social.ig.desc':   { en: 'paper notes, tiny stories, sometimes a soft poem.',
                             ru: 'бумажные заметки, маленькие истории, иногда тихое стихотворение.' },
    'ct.social.tt.desc':   { en: 'short voice notes, breathing reminders, real people.',
                             ru: 'короткие голосовые, напоминания о дыхании, живые люди.' },
    'ct.social.gh.desc':   { en: 'open-source. file an issue, star us, send a PR — we read those too.',
                             ru: 'open-source. открой issue, поставь звезду, пришли PR — мы и это читаем.' },

    'ct.facts.title':      { en: 'a few quick things',             ru: 'несколько коротких фактов' },
    'ct.facts.hint':       { en: 'the boring but useful bits',     ru: 'скучные, но полезные мелочи' },
    'ct.facts.response':   { en: 'response time',                  ru: 'время ответа' },
    'ct.facts.response.value':{ en: '1–2 business days',           ru: '1–2 рабочих дня' },
    'ct.facts.response.note':{ en: 'we\'re a small team — thanks for patience.',
                                ru: 'мы маленькая команда — спасибо за терпение.' },
    'ct.facts.based':      { en: 'based in',                       ru: 'находимся' },
    'ct.facts.based.value':{ en: 'online · everywhere',            ru: 'онлайн · везде' },
    'ct.facts.based.note': { en: 'no office, no zip code — just the internet.',
                             ru: 'без офиса, без почтового индекса — только интернет.' },
    'ct.facts.lang':       { en: 'languages',                      ru: 'языки' },
    'ct.facts.lang.value': { en: 'english · more coming',          ru: 'english · скоро больше' },
    'ct.facts.lang.note':  { en: 'write in any language — we\'ll translate.',
                             ru: 'пиши на любом языке — мы переведём.' },

    'ct.closing.text':     { en: 'whatever you write — <em>we\'ll read it carefully.</em>',
                             ru: 'что бы ты ни написал — <em>мы прочитаем внимательно.</em>' },
    'ct.closing.sub':      { en: '— still here, always',           ru: '— всегда здесь, всегда' },

    /* ── nav-bar/updates.html ────────────────────────────── */
    'up.hero.eyebrow':     { en: '<em>—</em> changelog &amp; reflections',
                             ru: '<em>—</em> история изменений и заметки' },
    'up.hero.title':       { en: '<em>updates</em>',               ru: '<em>обновления</em>' },
    'up.hero.lede':        { en: 'this page documents how StillHere quietly evolves — small decisions, gentle rewrites, <em>fixes</em> that came from your feedback, and what we\'re working on next.',
                             ru: 'эта страница рассказывает, как StillHere тихо развивается — маленькие решения, аккуратные правки, <em>фиксы</em>, пришедшие из ваших отзывов, и что мы делаем дальше.' },

    'up.stat.version':     { en: 'version',          ru: 'версия' },
    'up.stat.codename':    { en: 'paper',            ru: 'paper' },
    'up.stat.updated':     { en: 'last updated',     ru: 'обновлено' },
    'up.stat.updated.value':{ en: 'may 26, 2026',    ru: '26 мая 2026' },
    'up.stat.commits':     { en: 'commits',          ru: 'коммитов' },
    'up.stat.commits.value':{ en: '42 on main',      ru: '42 в main' },

    'up.timeline.title':   { en: 'timeline',         ru: 'хронология' },
    'up.timeline.hint':    { en: 'newest first',     ru: 'сначала новые' },

    /* Tag labels — reused across entries */
    'up.tag.design':       { en: 'design',           ru: 'дизайн' },
    'up.tag.fix':          { en: 'fix',              ru: 'фикс' },
    'up.tag.new':          { en: 'new',              ru: 'новое' },
    'up.tag.comm':         { en: 'community',        ru: 'сообщество' },
    'up.tag.security':     { en: 'security',         ru: 'безопасность' },
    'up.tag.ai':           { en: 'ai support',       ru: 'AI-поддержка' },
    'up.tag.perf':         { en: 'performance',      ru: 'производительность' },

    /* Entry: May 26, 2026 — performance + edit posts */
    'up.e0526.date':       { en: 'may 26, 2026',     ru: '26 мая 2026' },
    'up.e0526.title':      { en: 'huge speed jump + you can finally edit your posts',
                             ru: 'огромный скачок скорости + теперь посты можно редактировать' },
    'up.e0526.lede':       { en: 'the site got <em>~10× lighter</em> on first load, the home page renders fast even on slow connections, and posts are now editable from the 3-dot menu — title, body, photos, all of it.',
                             ru: 'сайт стал <em>~10× легче</em> на первой загрузке, главная отрисовывается быстро даже на медленных сетях, а посты теперь можно редактировать через меню три-точки — заголовок, текст, фото, всё.' },
    'up.e0526.li1':        { en: '<strong>image assets: 28.6 MB → 2.7 MB</strong> — paper textures were 6900×10000 px for decorative use; aggressively resized + recompressed (−91%)',
                             ru: '<strong>картинки: 28.6 МБ → 2.7 МБ</strong> — текстуры бумаги были 6900×10000 px для декоративных нужд; уменьшены и пересжаты (−91%)' },
    'up.e0526.li2':        { en: 'blocking <code>&lt;script&gt;</code> tags in <code>&lt;head&gt;</code> moved to <code>defer</code>; Google Fonts merged 3→1; preconnect hints; <code>loading="lazy"</code> on below-fold images',
                             ru: 'блокирующие <code>&lt;script&gt;</code> в <code>&lt;head&gt;</code> переведены на <code>defer</code>; Google Fonts объединены 3→1; preconnect-подсказки; <code>loading="lazy"</code> на картинках ниже экрана' },
    'up.e0526.li3':        { en: 'expected FCP in India: ~18s → ~2–3s · LCP: ~18s → ~3–5s · CLS on mobile: 0.38 → ~0.05 (the missing <code>&lt;meta viewport&gt;</code> was found)',
                             ru: 'ожидаемые метрики в Индии: FCP ~18s → ~2–3s · LCP ~18s → ~3–5s · CLS на мобильных 0.38 → ~0.05 (нашли пропущенный <code>&lt;meta viewport&gt;</code>)' },
    'up.e0526.li4':        { en: '<strong>edit your own posts</strong> — 3-dot menu on cards + the post page; loads the existing data into create-post, save → updates in place',
                             ru: '<strong>редактирование своих постов</strong> — меню три-точки на карточках и на странице поста; загружает данные в create-post, сохранение → обновляет на месте' },
    'up.e0526.li5':        { en: 'dark-mode polish: paper-note "not alone" stays cream, doodles invert correctly (cats, clouds, asterisks), tag pills now high-contrast on both themes',
                             ru: 'доработка тёмной темы: записка «not alone» осталась кремовой, дудлы корректно инвертируются (коты, облака, звёздочки), теги-пилюли с высоким контрастом в обеих темах' },
    'up.e0526.li6':        { en: 'native theme detection via <code>prefers-color-scheme</code> — site auto-picks dark / light from the OS on first visit',
                             ru: 'нативная детекция темы через <code>prefers-color-scheme</code> — сайт сам выбирает светлую / тёмную из настроек ОС при первом заходе' },
    'up.e0526.li7':        { en: 'post-menu in Russian shortened so every item fits one line; the Edit / Delete divider moved to its proper place',
                             ru: 'меню поста на русском сокращено, чтобы каждый пункт помещался в одну строку; разделитель Edit / Delete переехал на правильное место' },

    /* Entry: May 23, 2026 — mobile stylesheet */
    'up.e0523.date':       { en: 'may 23, 2026',     ru: '23 мая 2026' },
    'up.e0523.title':      { en: 'mobile-friendly across the board',
                             ru: 'mobile-friendly на всех страницах' },
    'up.e0523.lede':       { en: 'dedicated <code>mobile.css</code> shipped — small-screen layouts for every page, no more horizontal scroll on phones, navbar and footers properly reflow.',
                             ru: 'добавили <code>mobile.css</code> — раскладки под маленькие экраны для каждой страницы, больше нет горизонтального скролла на телефонах, навбар и футеры корректно перестраиваются.' },
    'up.e0523.li1':        { en: 'new <code>mobile.css</code> stylesheet linked from every page',
                             ru: 'новый <code>mobile.css</code> подключён ко всем страницам' },
    'up.e0523.li2':        { en: 'dark-theme spot fixes (filter panel, refresh button, sidebar pills)',
                             ru: 'точечные правки тёмной темы (панель фильтров, кнопка обновления, пилюли в сайдбаре)' },
    'up.e0523.li3':        { en: 'small UI tweaks across about / contacts / updates',
                             ru: 'мелкие правки UI на about / contacts / updates' },

    /* Entry: May 21, 2026 — dark theme overhaul + i18n UI */
    'up.e0521.date':       { en: 'may 21, 2026',     ru: '21 мая 2026' },
    'up.e0521.title':      { en: 'warmer dark, stronger cards, language toggle visible',
                             ru: 'теплее тёмная, заметнее карточки, переключатель языка виден' },
    'up.e0521.lede':       { en: 'another pass on the dark palette — cards now stand noticeably above the background, secondary text is lighter, borders more visible. the language toggle in preferences actually shows up in dark mode now.',
                             ru: 'ещё один проход по тёмной палитре — карточки заметно «выпуклые» над фоном, второстепенный текст светлее, рамки виднее. переключатель языка в настройках теперь видно и в тёмной теме.' },
    'up.e0521.li1':        { en: 'dark-theme.css reworked — card elevation, text contrast, border opacity',
                             ru: 'dark-theme.css переработан — высота карточек, контраст текста, прозрачность рамок' },
    'up.e0521.li2':        { en: 'i18n toggle visible + working in dark mode',
                             ru: 'переключатель i18n виден и работает в тёмной теме' },
    'up.e0521.li3':        { en: 'changelog and about-page copy edited',
                             ru: 'тексты changelog и страницы about отредактированы' },

    /* Entry: May 20, 2026 — dark-theme fixes + session-aware pings */
    'up.e0520.date':       { en: 'may 20, 2026',     ru: '20 мая 2026' },
    'up.e0520.title':      { en: 'dark mode fixes across every page',
                             ru: 'исправления тёмной темы на всех страницах' },
    'up.e0520.lede':       { en: 'fixed theme-breaking inline colors and textures left over from the light design, and rebuilt the live-presence counter so "online right now" reflects <em>actual per-tab sessions</em>, not stale counts.',
                             ru: 'починили inline-цвета и текстуры, ломавшие тему, переписали счётчик «онлайн прямо сейчас» — теперь он отражает <em>реальные сессии по вкладкам</em>, а не устаревшие числа.' },
    'up.e0520.li1':        { en: 'inline color overrides removed — dark theme now applies cleanly everywhere',
                             ru: 'inline-переопределения цветов удалены — тёмная тема применяется везде чисто' },
    'up.e0520.li2':        { en: 'session-aware site_pings — stable per-tab id, no duplicates',
                             ru: 'session-aware site_pings — стабильный id по вкладке, без дублей' },
    'up.e0520.li3':        { en: 'several hardcoded cream/white values replaced with CSS tokens',
                             ru: 'несколько хардкод-значений (кремовые/белые) заменены на CSS-токены' },

    /* Entry: May 19, 2026 — i18n + analytics + index rename */
    'up.e0519.date':       { en: 'may 19, 2026',     ru: '19 мая 2026' },
    'up.e0519.title':      { en: 'two languages, live presence, privacy-only analytics',
                             ru: 'два языка, живой счётчик присутствия, аналитика без слежки' },
    'up.e0519.lede':       { en: 'client-side i18n in english &amp; russian, a quiet on-site visitor counter, and analytics that don\'t track you. <em>nothing about you, only that the page was opened.</em>',
                             ru: 'клиентский i18n на английском и русском, тихий счётчик посетителей и аналитика без отслеживания. <em>ничего о вас — только то, что страница открылась.</em>' },
    'up.e0519.li1':        { en: '<strong>JS/i18n.js</strong> — full EN/RU dictionary + toggle in preferences',
                             ru: '<strong>JS/i18n.js</strong> — полный словарь EN/RU + переключатель в настройках' },
    'up.e0519.li2':        { en: '<strong>site_pings</strong> — supabase table: timestamps + session-id only; powers the "x online now" counter on /statistics',
                             ru: '<strong>site_pings</strong> — таблица supabase: только timestamps + session-id; питает счётчик «сейчас онлайн» на /statistics' },
    'up.e0519.li3':        { en: '<strong>Vercel Speed Insights + Web Analytics</strong> — no cookies, no profiling',
                             ru: '<strong>Vercel Speed Insights + Web Analytics</strong> — без cookies, без профилирования' },
    'up.e0519.li4':        { en: 'shared supabase client — silences duplicate GoTrueClient warnings',
                             ru: 'общий supabase-клиент — убирает предупреждения о дубликатах GoTrueClient' },
    'up.e0519.li5':        { en: 'startup-page.html renamed to <code>index.html</code>, vercel.json simplified',
                             ru: 'startup-page.html переименован в <code>index.html</code>, vercel.json упрощён' },

    /* Entry: May 18, 2026 — dark theme overhaul + moderation system */
    'up.e0518.date':       { en: 'may 18, 2026',     ru: '18 мая 2026' },
    'up.e0518.title':      { en: 'warm dark mode + the moderation backbone',
                             ru: 'тёплая тёмная тема + основа модерации' },
    'up.e0518.lede':       { en: 'biggest update so far. dark theme rewritten from scratch as a warm neutral palette; new consistent styling for all legal/docs pages; and a full moderation system built into supabase — reports, weights, AI escalation, admin queue.',
                             ru: 'самое крупное обновление на сейчас. тёмная тема переписана с нуля как тёплая нейтральная палитра; единый стиль для всех правовых/docs-страниц; полная модерация в supabase — жалобы, веса, AI-эскалация, очередь админа.' },
    'up.e0518.li1':        { en: '<strong>dark-theme.css</strong> — completely rewritten, warm-neutral tokens',
                             ru: '<strong>dark-theme.css</strong> — полностью переписан, тёплые нейтральные токены' },
    'up.e0518.li2':        { en: '<strong>docs.css</strong> — guidelines / privacy / terms / crisis pages styled consistently',
                             ru: '<strong>docs.css</strong> — guidelines / privacy / terms / crisis оформлены единообразно' },
    'up.e0518.li3':        { en: 'SQL migrations: <code>reports</code>, <code>admin_roles</code>, <code>moderation_log</code>, <code>user_blocks</code>',
                             ru: 'SQL-миграции: <code>reports</code>, <code>admin_roles</code>, <code>moderation_log</code>, <code>user_blocks</code>' },
    'up.e0518.li4':        { en: '<strong>strict-review</strong> supabase edge function — re-checks flagged content with stricter AI prompt',
                             ru: '<strong>strict-review</strong> edge-функция supabase — перепроверяет отмеченный контент строгим AI-запросом' },
    'up.e0518.li5':        { en: 'admin queue page: keep / shadow / remove + block-author duration picker',
                             ru: 'страница очереди админа: keep / shadow / remove + выбор длительности блокировки автора' },

    /* Entry: May 16, 2026 — AI chat companion */
    'up.e0516.date':       { en: 'may 16, 2026',     ru: '16 мая 2026' },
    'up.e0516.title':      { en: 'a quiet companion — for the hours when nobody else is around',
                             ru: 'тихий спутник — для часов, когда рядом никого нет' },
    'up.e0516.lede':       { en: 'the AI chat page went in — paper aesthetic, no-advice toggle, mood tags. the API key lives in a supabase edge function; <em>the browser never sees it</em>.',
                             ru: 'добавили страницу AI-чата — бумажная эстетика, переключатель no-advice, теги настроения. API-ключ живёт в edge-функции supabase; <em>браузер его никогда не видит</em>.' },
    'up.e0516.li1':        { en: 'full AI chat UI: navbar, sidebar, messages, doodle assets, transitions',
                             ru: 'полный UI AI-чата: навбар, сайдбар, сообщения, дудлы, переходы' },
    'up.e0516.li2':        { en: '<strong>no-advice mode</strong> + mood tags (sad / anxious / lonely / tired / …)',
                             ru: '<strong>режим no-advice</strong> + теги настроения (грустно / тревожно / одиноко / устал / …)' },
    'up.e0516.li3':        { en: 'chat history kept on your device only — never uploaded',
                             ru: 'история чата хранится только у вас на устройстве — никогда не загружается' },
    'up.e0516.li4':        { en: '<strong>supabase/functions/ai-chat</strong> — server proxy holding the OpenRouter key',
                             ru: '<strong>supabase/functions/ai-chat</strong> — серверный прокси, хранящий ключ OpenRouter' },
    'up.e0516.li5':        { en: '<code>statistics.html</code> added — transparent project numbers',
                             ru: 'добавлена <code>statistics.html</code> — открытые цифры проекта' },

    /* Entry: May 5-9, 2026 — supabase integration */
    'up.e0509.date':       { en: 'may 5–9, 2026',    ru: '5–9 мая 2026' },
    'up.e0509.title':      { en: 'supabase wired into everything',
                             ru: 'supabase подключён ко всему' },
    'up.e0509.lede':       { en: 'the static prototype became a real app — auth, posts, comments, filters and counters all running on supabase. first dark-theme draft shipped alongside AI moderation.',
                             ru: 'статический прототип стал настоящим приложением — авторизация, посты, комментарии, фильтры и счётчики работают на supabase. первая черновая тёмная тема пошла вместе с AI-модерацией.' },
    'up.e0509.li1':        { en: 'supabase auth + profiles connected',
                             ru: 'supabase auth + профили подключены' },
    'up.e0509.li2':        { en: 'comments persist server-side; like/save counters work correctly',
                             ru: 'комментарии хранятся на сервере; счётчики лайков/сохранений работают правильно' },
    'up.e0509.li3':        { en: 'language &amp; support-type filters actually filter the feed',
                             ru: 'фильтры по языку и типу поддержки реально фильтруют ленту' },
    'up.e0509.li4':        { en: '<strong>AI moderation</strong> — checks every post on submit',
                             ru: '<strong>AI-модерация</strong> — проверяет каждый пост при отправке' },
    'up.e0509.li5':        { en: 'vercel.json routing added; startup page returned to previous design',
                             ru: 'добавлен роутинг в vercel.json; стартовая страница вернулась к прежнему дизайну' },

    /* Entry: May 2-3, 2026 — nav-bar pages + design */
    'up.e0503.date':       { en: 'may 2–3, 2026',    ru: '2–3 мая 2026' },
    'up.e0503.title':      { en: 'about, contacts, updates, profile — all built',
                             ru: 'about, contacts, updates, profile — всё собрано' },
    'up.e0503.lede':       { en: 'the supporting pages came together. first sketch of the AI support chat UI. comments section rebuilt, post menus polished.',
                             ru: 'вспомогательные страницы сложились. первый набросок UI чата AI-поддержки. секция комментариев пересобрана, меню постов отполированы.' },
    'up.e0503.li1':        { en: 'about / contacts / updates / profile / edit-profile pages',
                             ru: 'страницы about / contacts / updates / profile / edit-profile' },
    'up.e0503.li2':        { en: 'first AI chat UI mock (design only, no backend yet)',
                             ru: 'первый макет UI AI-чата (только дизайн, без бэкенда)' },
    'up.e0503.li3':        { en: 'comments section reworked with better layout',
                             ru: 'секция комментариев переделана с лучшей раскладкой' },
    'up.e0503.li4':        { en: 'small fixes across post menus and headers',
                             ru: 'мелкие правки в меню постов и заголовках' },

    /* Entry: April 2026 — create-post v2 + docs scaffold */
    'up.eApr.date':        { en: 'april 2026',       ru: 'апрель 2026' },
    'up.eApr.title':       { en: 'create-post redesigned, docs scaffolded',
                             ru: 'create-post переделан, docs-страницы намечены' },
    'up.eApr.lede':        { en: 'full redesign of the post creation flow — rich-text editor, media upload, topic chips, mode picker, anonymous toggle. project docs pages scaffolded.',
                             ru: 'полный редизайн потока создания поста — rich-text редактор, загрузка медиа, чипы тем, выбор режима, переключатель анонимности. намечены docs-страницы.' },
    'up.eApr.li1':         { en: 'Quill rich-text editor for the post body',
                             ru: 'Quill rich-text редактор для тела поста' },
    'up.eApr.li2':         { en: 'media upload — up to 6 attachments, drag &amp; drop',
                             ru: 'загрузка медиа — до 6 вложений, drag &amp; drop' },
    'up.eApr.li3':         { en: 'topic chips + open-to-support / no-advice mode selection',
                             ru: 'чипы тем + выбор режима open-to-support / no-advice' },
    'up.eApr.li4':         { en: 'docs pages (guidelines, privacy, terms) — example content added',
                             ru: 'docs-страницы (guidelines, privacy, terms) — добавлен пример контента' },

    /* Entry: Feb-Mar 2026 — visual identity */
    'up.eFM.date':         { en: 'feb–mar 2026',     ru: 'фев–мар 2026' },
    'up.eFM.title':        { en: 'finding the paper aesthetic',
                             ru: 'поиски бумажной эстетики' },
    'up.eFM.lede':         { en: 'several weeks of iteration to land the right visual tone — warm cream, ink doodles, Caveat cursive as an accent. swapped the icon set completely.',
                             ru: 'несколько недель итераций, чтобы нащупать правильный визуальный тон — тёплый крем, чернильные дудлы, курсив Caveat в качестве акцента. полностью заменили набор иконок.' },
    'up.eFM.li1':          { en: 'new background, text animations on the startup page',
                             ru: 'новый фон, текстовые анимации на стартовой странице' },
    'up.eFM.li2':          { en: 'Phosphor icons replaced Heroicons across the site',
                             ru: 'иконки Phosphor заменили Heroicons по всему сайту' },
    'up.eFM.li3':          { en: 'main feed: left + right sidebars, filters, footer',
                             ru: 'главная лента: левый и правый сайдбары, фильтры, футер' },
    'up.eFM.li4':          { en: 'CSS reorganised into a <code>CSS/</code> folder',
                             ru: 'CSS реорганизован в папку <code>CSS/</code>' },
    'up.eFM.li5':          { en: 'create panel and post menu rebuilt from scratch',
                             ru: 'панель создания и меню поста пересобраны с нуля' },

    /* Entry: January 2026 — the very beginning */
    'up.eJan.date':        { en: 'january 2026',     ru: 'январь 2026' },
    'up.eJan.title':       { en: 'the first lines of code',
                             ru: 'первые строки кода' },
    'up.eJan.lede':        { en: 'first commits — a basic structure taking shape locally. main page, icons, a profile page, the create-post draft, and a rough idea of <em>presence, not solutions</em>. nothing deployed yet, just figuring it out.',
                             ru: 'первые коммиты — базовая структура локально обретает форму. главная страница, иконки, страница профиля, черновик create-post и грубая идея <em>присутствия, не решений</em>. ничего не задеплоено пока, просто нащупываем.' },
    'up.eJan.li1':         { en: 'main page + basic navigation',
                             ru: 'главная страница + базовая навигация' },
    'up.eJan.li2':         { en: 'profile page + contacts page',
                             ru: 'страница профиля + страница контактов' },
    'up.eJan.li3':         { en: 'create-post first draft + post menu',
                             ru: 'первый черновик create-post + меню поста' },
    'up.eJan.li4':         { en: 'register page with user-agreement checkbox',
                             ru: 'страница регистрации с чекбоксом пользовательского соглашения' },

    'up.sub.title':        { en: 'want quiet updates <em>in your pocket?</em>',
                             ru: 'хочешь тихие обновления <em>в кармане?</em>' },
    'up.sub.desc':         { en: 'we post the same notes on telegram — no algorithm, no pressure, just a soft ping when something new lands.',
                             ru: 'мы публикуем те же заметки в telegram — без алгоритма, без давления, просто мягкий пинг, когда выходит что-то новое.' },
    'up.sub.btn':          { en: 'follow on telegram',             ru: 'подписаться в telegram' },

    /* ── nav-bar/profile.html ────────────────────────────── */
    'pf.hero.eyebrow':     { en: '<em>—</em> your quiet corner',     ru: '<em>—</em> твой тихий уголок' },
    'pf.hero.welcome':     { en: 'welcome,',                          ru: 'добро пожаловать,' },
    'pf.hero.stranger':    { en: 'stranger.',                         ru: 'незнакомец.' },
    'pf.hero.lede':        { en: 'no name needed, no backstory required. just <em>show up</em> however you are right now — your space, your pace.',
                             ru: 'не нужно имени, не нужно истории. просто <em>появись</em> таким, какой ты сейчас — твоё пространство, твой темп.' },

    'pf.card.someone':     { en: 'Someone here',                      ru: 'Кто-то здесь' },
    'pf.card.joined':      { en: 'Joined recently',                   ru: 'Присоединился(-ась) недавно' },
    /* Prefix used by the dynamically rendered "Joined <Month Year>"
       line — kept short to read naturally before a locale-formatted date. */
    'pf.card.joined.prefix':{ en: 'Joined',                            ru: 'С нами с' },
    'pf.card.anon':        { en: 'Anonymous',                         ru: 'Анонимно' },
    'pf.btn.edit':         { en: 'Edit profile',                      ru: 'Редактировать профиль' },
    'pf.btn.signout':      { en: 'Sign out',                          ru: 'Выйти' },
    'pf.btn.signin':       { en: 'Sign in',                           ru: 'Войти' },

    'pf.stats.title':      { en: 'so far',                            ru: 'на данный момент' },
    'pf.stats.hint':       { en: 'honest counts, not vanity metrics', ru: 'честные числа, без метрик-показухи' },
    'pf.stats.shared':     { en: 'stories shared',                    ru: 'историй опубликовано' },
    'pf.stats.reactions':  { en: 'reactions received',                ru: 'реакций получено' },
    'pf.stats.days':       { en: 'days on StillHere',                 ru: 'дней на StillHere' },

    'pf.next.title':       { en: 'where to next',                     ru: 'куда дальше' },
    'pf.next.hint':        { en: 'small doors, gently',               ru: 'маленькие двери, без давления' },
    'pf.act.browse':       { en: 'browse stories',                    ru: 'читать истории' },
    'pf.act.browse.desc':  { en: 'see what people are carrying today.', ru: 'посмотреть, что люди несут сегодня.' },
    'pf.act.share':        { en: 'share something',                   ru: 'поделиться чем-то' },
    'pf.act.share.desc':   { en: 'something on your mind? put it somewhere.', ru: 'что-то на душе? положи это куда-нибудь.' },
    'pf.act.ai':           { en: 'ai companion',                      ru: 'AI-спутник' },
    'pf.act.ai.desc':      { en: 'not a therapist — but it listens carefully.', ru: 'не терапевт — но он слушает внимательно.' },
    'pf.act.edit':         { en: 'edit profile',                      ru: 'редактировать профиль' },
    'pf.act.edit.desc':    { en: 'tweak how you show up — or don\'t.', ru: 'настрой, как ты выглядишь — или нет.' },

    'pf.anon.title':       { en: 'on staying invisible',              ru: 'о том, как остаться невидимым' },
    'pf.anon.hint':        { en: 'anonymity is the default',          ru: 'анонимность по умолчанию' },
    'pf.anon.tag':         { en: 'anonymity first',                   ru: 'сначала анонимность' },
    'pf.anon.h':           { en: 'you don\'t owe anyone <em>your name.</em>', ru: 'ты никому не должен <em>своё имя.</em>' },
    'pf.anon.text':        { en: 'StillHere doesn\'t need it. what you share is yours — no real identity attached, no profile photo, nothing public unless you choose it. your handle is just so you can find your own posts. that\'s genuinely all it is.',
                             ru: 'StillHere в этом не нуждается. что ты публикуешь — твоё: без привязки к реальной личности, без фото, ничего публичного, пока сам не выберешь. твой ник нужен только чтобы ты сам нашёл свои посты. это правда всё, что он делает.' },
    'pf.anon.link':        { en: 'read privacy policy',               ru: 'читать политику конфиденциальности' },
    'pf.anon.s1':          { en: 'data sold, ever',                   ru: 'данных продано — никогда' },
    'pf.anon.s2':          { en: 'ways to be yourself',               ru: 'способов быть собой' },
    'pf.anon.s3':          { en: 'rule — be human',                   ru: 'правило — быть человеком' },

    'pf.docs.title':       { en: 'read more',                         ru: 'почитать ещё' },
    'pf.docs.hint':        { en: 'the small print, gently',           ru: 'мелкий шрифт, без давления' },
    'pf.docs.guidelines':  { en: 'community guidelines',              ru: 'правила сообщества' },
    'pf.docs.guidelines.sub':{ en: 'how we treat each other here',    ru: 'как мы относимся друг к другу здесь' },
    'pf.docs.privacy':     { en: 'privacy policy',                    ru: 'политика конфиденциальности' },
    'pf.docs.privacy.sub': { en: 'what we collect and why',           ru: 'что мы собираем и зачем' },
    'pf.docs.crisis':      { en: 'crisis resources',                  ru: 'кризисные ресурсы' },
    'pf.docs.crisis.sub':  { en: 'if you need immediate support',     ru: 'если нужна срочная поддержка' },
    'pf.docs.terms':       { en: 'terms of service',                  ru: 'условия использования' },
    'pf.docs.terms.sub':   { en: 'rules of the platform',             ru: 'правила платформы' },

    'pf.closing.text':     { en: 'you\'re <em>here.</em> that\'s enough.', ru: 'ты <em>здесь.</em> этого достаточно.' },
    'pf.closing.sub':      { en: '— still, always',                   ru: '— всегда, тихо' },

    /* ── edit-profile.html ────────────────────────────────── */
    'ep.hero.eyebrow':     { en: '<em>—</em> settings, gently',       ru: '<em>—</em> настройки, без спешки' },
    'ep.hero.title':       { en: 'your <em>profile.</em>',            ru: 'твой <em>профиль.</em>' },
    'ep.hero.sub':         { en: 'change what others see — or <em>don\'t.</em> none of it is required, and none of it has to be real.',
                             ru: 'измени, что видят другие — или <em>нет.</em> ничего из этого не обязательно, и ничему не нужно быть настоящим.' },

    'ep.avatar.label':     { en: 'how you show up',                   ru: 'как ты выглядишь' },
    'ep.avatar.title':     { en: 'your face here',                    ru: 'твоё лицо здесь' },
    'ep.avatar.upload':    { en: 'Upload photo',                      ru: 'Загрузить фото' },
    'ep.avatar.remove':    { en: 'Remove photo',                      ru: 'Удалить фото' },

    'ep.about.label':      { en: '— 01 about you',                    ru: '— 01 о тебе' },
    'ep.about.title':      { en: 'how others see you',                ru: 'как тебя видят другие' },
    'ep.about.desc':       { en: 'none of it has to be real. you can leave any of it blank.',
                             ru: 'ничему не нужно быть настоящим. можно оставить что угодно пустым.' },
    'ep.about.first':      { en: 'First name or nickname',            ru: 'Имя или ник' },
    'ep.about.first.ph':   { en: 'e.g. Alex',                         ru: 'например, Алекс' },
    'ep.about.last':       { en: 'Last name',                         ru: 'Фамилия' },
    'ep.about.last.ph':    { en: 'e.g. K.',                           ru: 'например, К.' },
    'ep.about.optional':   { en: 'optional',                          ru: 'необязательно' },
    'ep.about.username':   { en: 'Username',                          ru: 'Имя пользователя' },
    'ep.about.username.ph':{ en: 'yourhandle',                        ru: 'ваш-ник' },
    'ep.about.username.hint':{ en: 'letters, numbers, and _ only — this is how you find your own posts.',
                               ru: 'только буквы, цифры и _ — по нему ты найдёшь свои посты.' },

    'ep.pass.label':       { en: '— 02 password',                     ru: '— 02 пароль' },
    'ep.pass.title':       { en: 'change it, or leave it',            ru: 'поменяй или оставь' },
    'ep.pass.desc':        { en: 'leave blank to keep your current password.',
                             ru: 'оставь пустым, чтобы сохранить текущий пароль.' },
    'ep.pass.new':         { en: 'New password',                      ru: 'Новый пароль' },
    'ep.pass.confirm':     { en: 'Confirm',                           ru: 'Подтверждение' },

    'ep.actions.save':     { en: 'Save changes',                      ru: 'Сохранить изменения' },
    'ep.actions.cancel':   { en: 'Cancel',                            ru: 'Отмена' },

    'ep.danger.label':     { en: '— 03 danger zone',                  ru: '— 03 опасная зона' },
    'ep.danger.title':     { en: 'careful — these can\'t be undone',  ru: 'осторожно — это нельзя отменить' },
    'ep.danger.desc':      { en: 'delete all your posts at once, or close your account. closing keeps your posts up (shown as "deleted account") so the conversations they started stay intact.',
                             ru: 'удали все свои посты сразу или закрой аккаунт. при закрытии посты останутся (показаны как «удалённый аккаунт»), чтобы беседы, которые они начали, не оборвались.' },
    'ep.danger.delete':    { en: 'Delete all my posts',               ru: 'Удалить все мои посты' },
    'ep.danger.close':     { en: 'Close my account',                  ru: 'Закрыть мой аккаунт' },

    'ep.delmod.title':     { en: 'close your account?',               ru: 'закрыть аккаунт?' },
    'ep.delmod.desc':      { en: 'your account will be closed and your name removed. the posts and comments you wrote will stay on the platform, shown as posted by "deleted account" — this keeps the conversations they started intact for everyone who replied.',
                             ru: 'твой аккаунт будет закрыт и имя удалено. посты и комментарии останутся на сайте, помеченные как «удалённый аккаунт» — так беседы, которые ты начал, останутся целыми для всех, кто отвечал.' },
    'ep.delmod.cancel':    { en: 'cancel',                            ru: 'отмена' },
    'ep.delmod.confirm':   { en: 'yes, close account',                ru: 'да, закрыть аккаунт' },

    /* ── letters.html ────────────────────────────────────── */
    'ql.hero.eyebrow':     { en: '<em>—</em> things you couldn\'t say',
                             ru: '<em>—</em> то, что не сказал(а)' },
    'ql.hero.title':       { en: 'quiet <em>letters.</em>',           ru: 'тихие <em>письма.</em>' },
    'ql.hero.lede':        { en: 'short notes to people who\'ll never read them. an ex, a parent, the version of you that didn\'t make it through. write what you couldn\'t send, choose a colour for the weight of it, and <em>leave it here</em>.',
                             ru: 'короткие записки тем, кто их никогда не прочитает. бывшему, родителю, той версии тебя, что не дошла. напиши то, что не смог(ла) отправить, выбери цвет под вес этого, и <em>оставь здесь</em>.' },
    'ql.hero.card.eyebrow':{ en: '— how this works',                   ru: '— как это работает' },
    'ql.hero.card.text':   { en: 'no replies. no support count. no responses. just somewhere to put it down.',
                             ru: 'без ответов. без счётчика поддержек. без реакций. просто куда-то это положить.' },
    'ql.hero.card.r1':     { en: 'name or word, not a full name',     ru: 'имя или слово, не полное имя' },
    'ql.hero.card.r2':     { en: 'kept anonymous, like everything else here', ru: 'анонимно, как и всё здесь' },
    'ql.hero.card.r3':     { en: 'read others when you need to feel less alone', ru: 'читай чужие, когда нужно почувствовать себя менее одиноко' },
    'ql.hero.card.inspire':{ en: 'inspired by <a href="https://theunsentproject.com" target="_blank" rel="noopener">The Unsent Project</a> by Rora Blue — a project we love and learned from.',
                             ru: 'вдохновлено проектом <a href="https://theunsentproject.com" target="_blank" rel="noopener">The Unsent Project</a> от Rora Blue — мы его любим и многому из него научились.' },

    'ql.controls.all':     { en: 'all colours',                        ru: 'все цвета' },
    'ql.count.suffix':     { en: 'letters &middot; <em>shuffle on reload</em>',
                             ru: 'писем &middot; <em>перемешать при перезагрузке</em>' },

    'ql.empty.title':      { en: 'no letters yet.',                    ru: 'пока нет писем.' },
    'ql.empty.sub':        { en: 'be the first to put something down. tap <em>+</em> in the corner.',
                             ru: 'будь первым(ой), кто что-то положит. жми <em>+</em> в углу.' },

    'ql.fab':              { en: 'write a letter',                     ru: 'написать письмо' },

    'ql.composer.title':   { en: 'a letter to&hellip;',                ru: 'письмо…' },
    'ql.composer.sub':     { en: 'short. honest. nobody will reply. that\'s the point.',
                             ru: 'коротко. честно. никто не ответит. в этом весь смысл.' },
    'ql.composer.to':      { en: '— to',                               ru: '— кому' },
    'ql.composer.to.ph':   { en: 'a name, an initial, or just a word', ru: 'имя, инициал или просто слово' },
    'ql.composer.body.label':{ en: '— what you couldn\'t say',         ru: '— то, что не смог(ла) сказать' },
    'ql.composer.body.ph': { en: 'just write it.',                     ru: 'просто напиши.' },
    'ql.composer.color':   { en: '— a colour for it',                  ru: '— цвет для этого' },
    'ql.composer.cancel':  { en: 'cancel',                             ru: 'отмена' },
    'ql.composer.send':    { en: 'let it go',                          ru: 'отпустить' },
    'ql.composer.sending': { en: 'sending',                            ru: 'отправляем' },

    'ql.toast.sent':       { en: 'your letter is on the wall.',        ru: 'твоё письмо на стене.' },

    'ql.card.to':          { en: '— to',                               ru: '— кому' },
    'ql.time.now':         { en: 'just now',                           ru: 'только что' },
    'ql.time.m':           { en: 'm ago',                              ru: ' мин назад' },
    'ql.time.h':           { en: 'h ago',                              ru: ' ч назад' },
    'ql.time.d':           { en: 'd ago',                              ru: ' дн назад' },
    'ql.time.mo':          { en: 'mo ago',                             ru: ' мес назад' },

    /* ── preferences.html ────────────────────────────────── */
    'pref.hero.eyebrow':   { en: '<em>—</em> a quiet space, your way',
                             ru: '<em>—</em> тихое место, по-твоему' },
    'pref.hero.title':     { en: '<em>preferences</em>',              ru: '<em>настройки</em>' },
    'pref.hero.sub':       { en: 'small choices that shape how StillHere feels — pick a tone for your eyes, and a language that feels like home.',
                             ru: 'небольшие выборы, которые задают, каким будет StillHere — выбери тон для глаз и язык, который ощущается родным.' },

    'pref.appearance.title':{ en: 'appearance',                       ru: 'оформление' },
    'pref.appearance.hint':{ en: 'choose your light',                 ru: 'выбери свой свет' },
    'pref.theme.light.name':{ en: 'paper, light',                     ru: 'бумага, светлая' },
    'pref.theme.light.desc':{ en: 'warm cream, ink on paper',         ru: 'тёплый крем, чернила на бумаге' },
    'pref.theme.dark.name':{ en: 'ink, dark',                         ru: 'чернила, тёмная' },
    'pref.theme.dark.desc':{ en: 'easy on tired eyes',                ru: 'мягко для уставших глаз' },

    'pref.lang.title':     { en: 'language',                          ru: 'язык' },
    'pref.lang.hint':      { en: 'choose how the site speaks to you', ru: 'выбери, на каком языке сайт говорит с тобой' },
    'pref.lang.note':      { en: 'Your choice is remembered on this device. Other places — the names you see in posts, comments and AI replies — stay in whichever language people wrote them in.',
                             ru: 'Твой выбор запоминается на этом устройстве. В других местах — имена в постах, комментариях и ответах AI — текст остаётся на том языке, на котором его написали.' },

    'pref.back':           { en: 'go back',                           ru: 'назад' },

    /* ── therapists.html ─────────────────────────────────── */
    'th.title':            { en: 'Talk to a real person — StillHere',
                             ru: 'Поговорить с настоящим — StillHere' },

    'th.hero.eyebrow':     { en: '<em>—</em> talk to a real person',
                             ru: '<em>—</em> поговорить с настоящим' },
    'th.hero.title':       { en: 'find someone <em>to listen.</em>',
                             ru: 'найди того, кто <em>выслушает.</em>' },
    'th.hero.lede':        { en: 'a handful of <em>trusted partners</em> who do this for a living — counselors, psychologists, peer listeners. book directly with them, on their schedule, in their tone. StillHere doesn\'t sit in the middle: no fees, no booking system to fight, no data handled by us.',
                             ru: 'несколько <em>проверенных партнёров</em>, для которых это работа — консультанты, психологи, peer-слушатели. бронируешь напрямую у них, в их расписание, в их тоне. StillHere не стоит посередине: без комиссий, без своей системы бронирования, ваших данных мы не видим.' },
    'th.hero.card.eyebrow':{ en: '— what this is',                     ru: '— что это' },
    'th.hero.card.title':  { en: 'a referral, not a marketplace.',     ru: 'направление, не маркетплейс.' },
    'th.hero.card.text':   { en: '<strong>we don\'t process payments, run video calls, or store sessions.</strong> each partner has their own scheduling and policies — clicking «book» opens their calendar in a new tab.',
                             ru: '<strong>мы не принимаем платежи, не ведём видеосвязь и не храним сессии.</strong> у каждого партнёра — своё расписание и свои правила: кнопка «забронировать» открывает их календарь в новой вкладке.' },

    'th.crisis.title':     { en: 'in crisis right now? please don\'t wait.',
                             ru: 'в кризисе прямо сейчас? пожалуйста, не жди.' },
    'th.crisis.desc':      { en: 'partner therapists schedule days in advance. if it feels urgent — please call a hotline that can talk to you in the next few minutes, free, 24/7.',
                             ru: 'у партнёров расписание на дни вперёд. если кажется срочным — пожалуйста, позвони на горячую линию, где с тобой поговорят в ближайшие минуты, бесплатно, 24/7.' },
    'th.crisis.btn':       { en: 'crisis hotlines',                    ru: 'телефоны помощи' },

    'th.how.title':        { en: 'how it works',                       ru: 'как это работает' },
    'th.how.hint':         { en: 'three steps, no account needed',     ru: 'три шага, аккаунт не нужен' },
    'th.how.s1.title':     { en: 'pick someone',                       ru: 'выбери кого-то' },
    'th.how.s1.desc':      { en: 'read the short bios below. look at the languages they speak and what they help with most. trust your first instinct — you can always try a different partner.',
                             ru: 'прочитай короткие био ниже. посмотри, на каких языках они говорят и с чем работают чаще всего. доверься первому ощущению — всегда можно попробовать другого.' },
    'th.how.s2.title':     { en: 'book on their site',                 ru: 'забронируй у них на сайте' },
    'th.how.s2.desc':      { en: 'their «book» button opens their own scheduling page (Calendly, Doxy.me, or similar). you pick a slot, pay them directly, and they confirm via email.',
                             ru: 'их кнопка «забронировать» откроет их страницу расписания (Calendly, Doxy.me или похожую). выбираешь слот, оплачиваешь напрямую им, и они подтверждают по email.' },
    'th.how.s3.title':     { en: 'meet them, calmly',                  ru: 'встреть их, спокойно' },
    'th.how.s3.desc':      { en: 'video, voice, or text — whatever they offer. no recording, no notes shared with us. it\'s between you and them.',
                             ru: 'видео, голос или текст — что они предлагают. без записи, без передачи нам каких-либо заметок. это между вами двумя.' },

    'th.list.title':       { en: 'trusted partners',                   ru: 'проверенные партнёры' },
    'th.list.hint':        { en: 'verified by us, paid directly to them',
                             ru: 'проверены нами, оплата напрямую им' },
    'th.verified':         { en: 'verified',                           ru: 'проверен' },
    'th.book':             { en: 'book',                               ru: 'забронировать' },
    'th.price.from':       { en: 'from',                               ru: 'от' },
    'th.price.scale':      { en: 'sliding scale',                      ru: 'гибкая цена' },

    /* Specialty tags (also reusable on future profile pages) */
    'th.tag.anxiety':      { en: 'anxiety',                            ru: 'тревога' },
    'th.tag.depression':   { en: 'depression',                         ru: 'депрессия' },
    'th.tag.burnout':      { en: 'burnout',                            ru: 'выгорание' },
    'th.tag.relationships':{ en: 'relationships',                      ru: 'отношения' },
    'th.tag.grief':        { en: 'grief',                              ru: 'горе' },
    'th.tag.trauma':       { en: 'trauma',                             ru: 'травма' },
    'th.tag.lgbtq':        { en: 'LGBTQ+',                             ru: 'ЛГБТК+' },
    'th.tag.ocd':          { en: 'OCD',                                ru: 'ОКР' },
    'th.tag.loneliness':   { en: 'loneliness',                         ru: 'одиночество' },
    'th.tag.couples':      { en: 'couples',                            ru: 'пары' },
    'th.tag.family':       { en: 'family',                             ru: 'семья' },
    'th.tag.teens':        { en: 'teens',                              ru: 'подростки' },
    'th.tag.identity':     { en: 'identity',                           ru: 'идентичность' },

    /* Partner profiles — PLACEHOLDERS. Replace name / role / bio
       below when real partners are onboarded. */
    'th.p1.name':          { en: 'Anna K.',                            ru: 'Анна К.' },
    'th.p1.role':          { en: 'licensed psychologist · gestalt',    ru: 'лицензированный психолог · гештальт' },
    'th.p1.bio':           { en: 'seven years of practice. soft, curious, doesn\'t lecture. works best with people who feel stuck in their own head and want to slowly unstick.',
                             ru: 'семь лет практики. мягкая, любопытная, не читает нотаций. лучше всего работает с теми, кто застрял в собственной голове и хочет потихоньку разобраться.' },

    'th.p2.name':          { en: 'Mikhail S.',                         ru: 'Михаил С.' },
    'th.p2.role':          { en: 'psychotherapist · CBT',              ru: 'психотерапевт · КПТ' },
    'th.p2.bio':           { en: 'structured, evidence-based, but not clinical. comfortable with intrusive thoughts and the kinds of fears that make less sense the more you think about them.',
                             ru: 'структурный, доказательный, но не клинически-сухой. умеет работать с навязчивыми мыслями и страхами, которые становятся всё менее логичными, чем больше о них думаешь.' },

    'th.p3.name':          { en: 'Sofia R.',                           ru: 'София Р.' },
    'th.p3.role':          { en: 'clinical psychologist · trauma-informed',
                             ru: 'клинический психолог · trauma-informed' },
    'th.p3.bio':           { en: 'slow-paced, body-aware sessions. specializes in displacement, war-related trauma, and identity. has a quiet voice and a lot of patience.',
                             ru: 'неспешные, телесно-ориентированные сессии. специализируется на вынужденном перемещении, военной травме и идентичности. тихий голос и много терпения.' },

    'th.p4.name':          { en: 'Daniel T.',                          ru: 'Даниэль Т.' },
    'th.p4.role':          { en: 'counselor · somatic experiencing',   ru: 'консультант · соматическое переживание' },
    'th.p4.bio':           { en: 'works mostly with adults navigating loss — death, breakups, the slow kind that doesn\'t have a name. focuses on what the body is holding, not just the story.',
                             ru: 'работает в основном со взрослыми, переживающими потерю — смерть, расставания, медленные потери без имени. смотрит на то, что держит тело, а не только на саму историю.' },

    'th.p5.name':          { en: 'Olha M.',                            ru: 'Ольга М.' },
    'th.p5.role':          { en: 'family psychologist · systems',      ru: 'семейный психолог · системный подход' },
    'th.p5.bio':           { en: 'works with couples and families. fluent in the kind of silence that fills a kitchen. helps people name what\'s been unnamed for years — gently, never as a verdict.',
                             ru: 'работает с парами и семьями. понимает ту тишину, что повисает на кухне. помогает назвать то, что годами оставалось безымянным — мягко, никогда не как приговор.' },

    'th.p6.name':          { en: 'Lukas B.',                           ru: 'Лукас Б.' },
    'th.p6.role':          { en: 'psychotherapist · teens & young adults',
                             ru: 'психотерапевт · подростки и молодые взрослые' },
    'th.p6.bio':           { en: 'specializes in 15–25 year olds. doesn\'t talk down. doesn\'t assume. helps you say the thing that everyone around you keeps brushing off as a phase.',
                             ru: 'специализируется на 15–25 годах. не говорит свысока. не делает поспешных выводов. помогает сказать то, что все вокруг отмахиваются как «у тебя это просто такой период».' },

    'th.trust.title':      { en: 'how we choose them',                 ru: 'как мы их выбираем' },
    'th.trust.hint':       { en: 'small list, on purpose',             ru: 'короткий список — намеренно' },
    'th.trust.t1.label':   { en: 'credentials',                        ru: 'квалификация' },
    'th.trust.t1.title':   { en: 'verified license',                   ru: 'проверенная лицензия' },
    'th.trust.t1.text':    { en: 'we check certificates, registry numbers, and references before listing anyone. no «life coaches», no unsupervised practice.',
                             ru: 'мы проверяем дипломы, реестровые номера и рекомендации до того, как добавить кого-либо. никаких «лайф-коучей», никакой практики без супервизии.' },
    'th.trust.t2.label':   { en: 'privacy',                            ru: 'приватность' },
    'th.trust.t2.title':   { en: 'we don\'t see your session',         ru: 'мы не видим вашу сессию' },
    'th.trust.t2.text':    { en: 'booking, payment, and the conversation itself happen on their side. StillHere doesn\'t store, log, or sit in the middle.',
                             ru: 'бронирование, оплата и сам разговор происходят на их стороне. StillHere ничего не хранит, не логирует и не стоит посередине.' },
    'th.trust.t3.label':   { en: 'pricing',                            ru: 'цены' },
    'th.trust.t3.title':   { en: 'no platform fee',                    ru: 'без платформенного сбора' },
    'th.trust.t3.text':    { en: 'you pay them directly. we take nothing. most partners offer a sliding scale — ask if cost is a concern.',
                             ru: 'оплата идёт напрямую им. мы не берём ничего. большинство партнёров предлагают гибкую цену — спроси, если цена смущает.' },

    'th.closing.text':     { en: 'a real person can listen <em>differently.</em><br>that\'s the whole point.',
                             ru: 'живой человек слушает <em>по-другому.</em><br>в этом весь смысл.' },
    'th.closing.sub':      { en: '— still here, while you find them.', ru: '— мы здесь, пока ты ищешь.' },

    /* ── ai-chat.html ────────────────────────────────────── */
    'ac.title':            { en: 'AI support — StillHere',           ru: 'AI-поддержка — StillHere' },

    'ac.side.eyebrow':     { en: '— a quiet space',                   ru: '— тихое место' },
    'ac.side.title':       { en: 'your conversations',                ru: 'твои разговоры' },
    'ac.side.new':         { en: 'start a new conversation',          ru: 'начать новый разговор' },
    'ac.side.search':      { en: 'search past chats…',                ru: 'найти в прошлых чатах…' },
    'ac.side.empty':       { en: 'no conversations yet.<br>start one above.',
                             ru: 'пока нет разговоров.<br>начни первый выше.' },
    'ac.side.priv':        { en: 'private &amp; anonymous',           ru: 'приватно и анонимно' },

    'ac.welcome.eyebrow':  { en: '— a place to slow down',            ru: '— место, чтобы замедлиться' },
    'ac.welcome.title':    { en: 'hi, <em>we\'re listening.</em>',    ru: 'привет, <em>мы слушаем.</em>' },
    'ac.welcome.lede':     { en: 'not a therapist. not a script. <br>a quiet companion that listens, gently — at your pace, in your words, for as long as you need.',
                             ru: 'не терапевт. не скрипт. <br>тихий спутник, который слушает мягко — в твоём темпе, твоими словами, столько, сколько нужно.' },

    'ac.input.ph':         { en: 'say anything — even just a feeling, half a thought, a word…',
                             ru: 'скажи что угодно — даже просто чувство, полмысли, одно слово…' },

    'ac.tool.noadvice':    { en: 'no-advice mode',                    ru: 'режим без советов' },
    'ac.tool.noadvice.title':{ en: 'no-advice mode — i\'ll just listen, no suggestions',
                                ru: 'режим без советов — я просто слушаю, никаких рекомендаций' },
    'ac.tool.mood':        { en: 'mood',                              ru: 'настроение' },
    'ac.tool.mood.title':  { en: 'how are you feeling?',              ru: 'как ты себя чувствуешь?' },

    'ac.mood.none':        { en: 'none',                              ru: 'нет' },
    'ac.mood.sad':         { en: 'sad',                               ru: 'грустно' },
    'ac.mood.anxious':     { en: 'anxious',                           ru: 'тревожно' },
    'ac.mood.angry':       { en: 'angry',                             ru: 'злюсь' },
    'ac.mood.numb':        { en: 'numb',                              ru: 'оцепенение' },
    'ac.mood.tired':       { en: 'tired',                             ru: 'устал(а)' },
    'ac.mood.lonely':      { en: 'lonely',                            ru: 'одиноко' },
    'ac.mood.ok':          { en: 'ok',                                ru: 'нормально' },
    'ac.mood.hopeful':     { en: 'hopeful',                           ru: 'есть надежда' },

    'ac.send':             { en: 'send',                              ru: 'отправить' },
    'ac.foot':             { en: 'for support, not medical advice. in crisis, please reach a <a href="docs/html/crisis-resources.html">real person</a>.',
                             ru: 'для поддержки, не для медицинских советов. в кризисе, пожалуйста, обратись к <a href="docs/html/crisis-resources.html">живому человеку</a>.' },

    'ac.delmod.title':     { en: 'delete this conversation?',         ru: 'удалить этот разговор?' },
    'ac.delmod.desc':      { en: 'this can\'t be undone.',            ru: 'это нельзя отменить.' },
    'ac.delmod.cancel':    { en: 'cancel',                            ru: 'отмена' },
    'ac.delmod.confirm':   { en: 'yes, delete',                       ru: 'да, удалить' },

    /* Dynamic strings rendered by JS/ai-chat.js */
    'ac.chat.new':         { en: 'new conversation',                  ru: 'новый разговор' },
    'ac.chat.untitled':    { en: 'untitled',                          ru: 'без названия' },
    'ac.bucket.today':     { en: 'today',                             ru: 'сегодня' },
    'ac.bucket.thisweek':  { en: 'this week',                         ru: 'на этой неделе' },
    'ac.bucket.earlier':   { en: 'earlier',                           ru: 'раньше' },

    /* ── index.html (landing) ────────────────────────────── */
    'idx.hero.eyebrow':    { en: '<em>—</em> 01 / Presence, not solutions',
                             ru: '<em>—</em> 01 / Присутствие, не решения' },
    'idx.hero.location':   { en: 'Global · Anonymous · Free',
                             ru: 'Глобально · Анонимно · Бесплатно' },
    'idx.hero.subtitle':   { en: 'a space for <em>presence</em>,<br>not solutions.',
                             ru: 'место для <em>присутствия</em>,<br>а не решений.' },
    'idx.hero.subtitle2':  { en: 'when everything feels heavy — slow down,<br>breathe, and find a quiet place that <em>feels like yours.</em>',
                             ru: 'когда всё кажется тяжёлым — притормози,<br>дыши, и найди тихое место, которое <em>покажется твоим.</em>' },
    'idx.btn.share':       { en: 'start sharing',         ru: 'начать делиться' },
    'idx.btn.explore':     { en: 'explore stories',       ru: 'читать истории' },
    'idx.btn.scroll':      { en: 'scroll',                ru: 'листай' },

    'idx.why.eyebrow':     { en: '02 / why stillhere',    ru: '02 / зачем stillhere' },
    'idx.why.title':       { en: 'built for <em>quiet</em>,<br>not for noise.',
                             ru: 'для <em>тишины</em>,<br>а не для шума.' },

    'idx.c1.num':          { en: '01 — privacy',          ru: '01 — приватность' },
    'idx.c1.title':        { en: 'anonymous &amp; safe',  ru: 'анонимно и безопасно' },
    'idx.c1.desc':         { en: 'share without showing your face or your name. your presence is enough.',
                             ru: 'делись, не показывая лица или имени. твоего присутствия достаточно.' },

    'idx.c2.num':          { en: '02 — care',             ru: '02 — забота' },
    'idx.c2.title':        { en: 'no-advice mode',        ru: 'режим без советов' },
    'idx.c2.desc':         { en: 'a toggle that protects your story from unsolicited advice — only listening, only company.',
                             ru: 'переключатель, который защищает твою историю от непрошенных советов — только слушают, только рядом.' },

    'idx.c3.num':          { en: '03 — together',         ru: '03 — вместе' },
    'idx.c3.title':        { en: 'a quiet community',     ru: 'тихое сообщество' },
    'idx.c3.desc':         { en: '1,000+ people already showed up here, in their own languages, at their own pace.',
                             ru: '1 000+ людей уже пришли сюда, на своих языках, в своём ритме.' },

    'idx.c4.num':          { en: '04 — trust',            ru: '04 — доверие' },
    'idx.c4.title':        { en: 'moderated, with care',  ru: 'модерация с заботой' },
    'idx.c4.desc':         { en: 'sensitive content can be flagged. humans review every report — slowly, gently.',
                             ru: 'чувствительный контент можно пометить. люди разбирают каждый репорт — медленно, бережно.' },

    'idx.c5.num':          { en: '05 — human',            ru: '05 — человеческое' },
    'idx.c5.title':        { en: 'real people, real words',
                             ru: 'настоящие люди, настоящие слова' },
    'idx.c5.desc':         { en: 'no bots, no performance — mindful, honest conversation, in any language.',
                             ru: 'никаких ботов, никакого позёрства — внимательный, честный разговор, на любом языке.' },

    'idx.quote.text':      { en: '"you don\'t always need to be <em>fixed.</em><br>sometimes you just need to be <em>witnessed.</em>"',
                             ru: '«тебя не всегда нужно <em>чинить.</em><br>иногда тебе нужно, чтобы тебя просто <em>увидели.</em>»' },
    'idx.quote.cite':      { en: '— a stillhere note',    ru: '— заметка stillhere' },

    'idx.join.eyebrow':    { en: '03 / invitation',       ru: '03 / приглашение' },
    'idx.join.note':       { en: 'not&nbsp;alone',        ru: 'не&nbsp;один' },
    'idx.join.title':      { en: 'you don\'t have<br>to carry it <em>alone</em>.',
                             ru: 'ты не должен нести<br>это <em>один</em>.' },
    'idx.join.desc':       { en: 'your story matters.<br>your feelings are valid.',
                             ru: 'твоя история важна.<br>твои чувства настоящие.' },

    /* ── shared a11y / aria-labels (only used as attr) ───── */
    'aria.toggleTheme':    { en: 'Toggle dark / light theme',
                             ru: 'Переключить тёмную / светлую тему' },
    'aria.openMenu':       { en: 'Open menu',             ru: 'Открыть меню' },
    'aria.primaryNav':     { en: 'Primary navigation',    ru: 'Основная навигация' },

    /* ── language toggle button ──────────────────────────── */
    'i18n.toggleAria':     { en: 'Switch language',       ru: 'Сменить язык' },

    /* ── coming-soon.html ──────────────────────────────── */
    'cs.eyebrow':          { en: '<em>—</em> still in the making',
                             ru: '<em>—</em> ещё в работе' },
    'cs.title':            { en: 'coming <em>soon.</em><img src="assets/letters/_Special Characters/Asterisk_01.png" class="cs-title-star" alt="" aria-hidden="true">',
                             ru: 'скоро <em>будет.</em><img src="assets/letters/_Special Characters/Asterisk_01.png" class="cs-title-star" alt="" aria-hidden="true">' },
    'cs.lede':             { en: 'this corner of StillHere isn\'t quite ready yet — we\'re <em>still here</em>, making it carefully. nothing rushed, nothing filler. when it lands, it\'ll feel like the rest of the place.',
                             ru: 'этот уголок StillHere ещё не готов — мы <em>всё ещё здесь</em>, делаем его аккуратно. без спешки, без воды. когда он появится, он будет в одном духе с остальным местом.' },
    'cs.note.eyebrow':     { en: '— a note',              ru: '— заметка' },
    'cs.note.title':       { en: 'slow over <em>shiny.</em>',
                             ru: 'медленно вместо <em>броского.</em>' },
    'cs.note.text':        { en: 'we\'d rather make one thing right than ship five things to seem busy. thanks for waiting.',
                             ru: 'мы лучше сделаем одно хорошо, чем пять, чтобы казаться занятыми. спасибо, что ждёшь.' },
    'cs.building.title':   { en: 'what we\'re building', ru: 'над чем работаем' },
    'cs.building.hint':    { en: 'small, gentle, on purpose',
                             ru: 'маленькое, бережное, с намерением' },
    'cs.card1.num':        { en: '01 — language',         ru: '01 — язык' },
    'cs.card1.title':      { en: 'more languages',        ru: 'больше языков' },
    'cs.card1.desc':       { en: 'right now the site speaks english and russian. ukrainian, spanish, french, german are next — translated by humans, not machines.',
                             ru: 'сейчас у нас английский и русский. дальше украинский, испанский, французский, немецкий — переводят люди, не машины.' },
    'cs.card2.num':        { en: '02 — private chats',    ru: '02 — личные чаты' },
    'cs.card2.title':      { en: 'one-to-one private chats',
                             ru: 'личные чаты один-на-один' },
    'cs.card2.desc':       { en: 'tiny rooms where two people can talk away from the public feed. fully encrypted on this side, nothing logged, nothing replayable.',
                             ru: 'маленькие комнаты, где двое могут поговорить вне общей ленты. полностью зашифровано на нашей стороне, ничего не пишется в логи, ничего не воспроизводится.' },
    'cs.card3.num':        { en: '03 — sessions',         ru: '03 — сессии' },
    'cs.card3.title':      { en: 'book a session',        ru: 'забронировать сессию' },
    'cs.card3.desc':       { en: 'a way to schedule a quiet, private conversation with a real psychologist — affordable, opt-in, and never the only way to use the site.',
                             ru: 'возможность записаться на тихий, личный разговор с настоящим психологом — доступно по цене, по желанию, и никогда не единственный способ пользоваться сайтом.' },
    'cs.next.title':       { en: 'in the meantime',       ru: 'а пока' },
    'cs.btn.back':         { en: 'go back',               ru: 'назад' },
    'cs.btn.feed':         { en: 'browse stories instead', ru: 'почитать истории' },

    /* ── main.html (community feed) — UI chrome only ─────
       Post content itself is user-generated and never translated.
       Decorative elements (doodles, multilingual stamp band) are
       also left alone — they're visual, not informational.        */
    'main.feed.eyebrow':   { en: '— STORIES SHARED HERE', ru: '— ИСТОРИИ, КОТОРЫМИ ЗДЕСЬ ДЕЛЯТСЯ' },
    'main.feed.title':     { en: 'community feed', ru: 'лента сообщества' },
    'main.feed.filter':    { en: 'filter',                ru: 'фильтр' },
    'main.feed.refresh':   { en: 'refresh',               ru: 'обновить' },

    'main.search.placeholder':
                           { en: 'Search by topic, mood, or keywords...',
                             ru: 'Поиск по теме, настроению или словам...' },
    'main.filter.language':{ en: 'LANGUAGE',              ru: 'ЯЗЫК' },
    'main.filter.all':     { en: 'All',                   ru: 'Все' },
    'main.filter.morelang':{ en: 'More languages...',     ru: 'Ещё языки...' },
    'main.filter.support': { en: 'SUPPORT TYPE',          ru: 'ТИП ПОДДЕРЖКИ' },
    'main.filter.need':    { en: 'Need Support',          ru: 'Нужна поддержка' },
    'main.filter.noadvice':{ en: 'No Advice',             ru: 'Без советов' },
    'main.filter.sort':    { en: 'SORT BY',               ru: 'СОРТИРОВКА' },
    'main.filter.recent':  { en: 'Most Recent',           ru: 'Сначала новые' },
    'main.filter.oldest':  { en: 'Oldest',                ru: 'Сначала старые' },
    'main.filter.popular': { en: 'Most Supported',        ru: 'Самые поддержанные' },

    'main.side.home':      { en: 'Home',                  ru: 'Главная' },
    'main.side.saved':     { en: 'Saved',                 ru: 'Сохранённые' },
    'main.side.topics':    { en: 'Topics',                ru: 'Темы' },
    'main.side.topic.anxiety':       { en: 'Anxiety',          ru: 'Тревога' },
    'main.side.topic.depression':    { en: 'Depression',       ru: 'Депрессия' },
    'main.side.topic.relationships': { en: 'Relationships',    ru: 'Отношения' },
    'main.side.topic.grief':         { en: 'Grief & Loss',     ru: 'Горе и потеря' },
    'main.side.topic.burnout':       { en: 'Burnout',          ru: 'Выгорание' },
    'main.side.topic.loneliness':    { en: 'Loneliness',       ru: 'Одиночество' },
    'main.side.topic.trauma':        { en: 'Trauma',           ru: 'Травма' },
    'main.side.topic.other':         { en: 'Other',            ru: 'Другое' },
    'main.side.more':      { en: 'Show more topics',      ru: 'Показать больше тем' },
    'main.side.fewer':     { en: 'Show fewer topics',     ru: 'Свернуть темы' },
    'main.side.share':     { en: 'Share Your Story',      ru: 'Поделиться историей' },

    'main.widget.crisis.title':  { en: 'Need Immediate Help?',   ru: 'Нужна срочная помощь?' },
    'main.widget.crisis.sub':    { en: 'If you\'re in crisis, please call out:',
                                   ru: 'Если ты в кризисе — позвони на горячую линию:' },
    'main.widget.crisis.btn':    { en: 'Crisis Hotlines',        ru: 'Кризисные линии' },
    'main.widget.ai.title':      { en: 'Need support right now?', ru: 'Нужна поддержка прямо сейчас?' },
    'main.widget.ai.sub':        { en: 'If you\'re going through something difficult, you can talk to our AI support:',
                                   ru: 'Если переживаешь что-то трудное — можно поговорить с нашим AI:' },
    'main.widget.ai.btn':        { en: 'Talk to AI support',     ru: 'Поговорить с AI' },
    'main.widget.guidelines.title': { en: 'Community Guidelines', ru: 'Правила сообщества' },
    'main.widget.guidelines.1':  { en: 'Be kind and respectful', ru: 'Будь добрым и уважительным' },
    'main.widget.guidelines.2':  { en: 'Respect "No Advice" tags', ru: 'Уважай метки «Без советов»' },
    'main.widget.guidelines.3':  { en: 'No medical advice',      ru: 'Никаких медицинских советов' },
    'main.widget.guidelines.4':  { en: 'Protect anonymity',      ru: 'Береги анонимность' },
    'main.widget.guidelines.link':{en: 'Read full guidelines →', ru: 'Читать правила полностью →' },
    'main.widget.week.title':    { en: 'This Week',              ru: 'На этой неделе' },
    'main.widget.week.stories':  { en: 'Stories shared',         ru: 'Историй опубликовано' },
    'main.widget.week.support':  { en: 'Support given',          ru: 'Поддержки оказано' },
    'main.widget.week.members':  { en: 'Active members',         ru: 'Активных участников' },

    /* Quiet letters preview widget (right sidebar on main feed) */
    'main.widget.letters.title': { en: 'From the quiet letters wall',
                                   ru: 'Со стены тихих писем' },
    'main.widget.letters.sub':   { en: 'Short notes nobody will reply to. Read when you need to feel less alone.',
                                   ru: 'Короткие записки, на которые никто не ответит. Читай, когда нужно почувствовать что ты не один.' },
    'main.widget.letters.link':  { en: 'more quiet letters',     ru: 'больше тихих писем' },

    /* Burger menu — Quiet letters page link */
    'menu.letters':              { en: 'Quiet letters',          ru: 'Тихие письма' },

    'main.post.support':         { en: 'Support',                ru: 'Поддержать' },
    'main.post.responses':       { en: 'Responses',              ru: 'Ответов' },
    'main.post.share':           { en: 'Share',                  ru: 'Поделиться' },
    'main.post.menu.save':       { en: 'Save Post',              ru: 'Сохранить' },
    'main.post.menu.unsave':     { en: 'Unsave',                 ru: 'Убрать' },
    'main.post.menu.copy':       { en: 'Copy Link',              ru: 'Копировать ссылку' },
    'main.post.menu.edit':       { en: 'Edit post',              ru: 'Редактировать' },
    'main.post.menu.delete':     { en: 'Delete',                 ru: 'Удалить' },
    'main.post.menu.report':     { en: 'Report',                 ru: 'Пожаловаться' },
    'main.loadmore':             { en: 'Show more stories',      ru: 'Показать ещё истории' },
    'main.empty.title':          { en: 'No stories yet',         ru: 'Пока нет историй' },
    'main.empty.text':           { en: 'be the first to share — your story matters.',
                                   ru: 'будь первым — твоя история важна.' },
    'main.toast.linkcopied':     { en: 'Link copied',            ru: 'Ссылка скопирована' },
    'main.toast.saved':          { en: 'Saved',                  ru: 'Сохранено' },
    'main.toast.unsaved':        { en: 'Removed from saved',     ru: 'Убрано из сохранённых' },

    /* ── login.html ────────────────────────────────────── */
    'login.nav.join':            { en: 'join',                   ru: 'регистрация' },

    'login.intro.eyebrow':       { en: '<em>—</em> welcome back',
                                   ru: '<em>—</em> с возвращением' },
    'login.intro.title':         { en: 'you\'re still <em>here.</em><img src="assets/letters/_Special Characters/Asterisk_01.png" class="auth-title-star" alt="" aria-hidden="true">',
                                   ru: 'ты всё ещё <em>здесь.</em><img src="assets/letters/_Special Characters/Asterisk_01.png" class="auth-title-star" alt="" aria-hidden="true">' },
    'login.intro.lede':          { en: 'your space hasn\'t gone anywhere. no notifications were missed — there are none. just <em>quiet</em>, waiting for you to come back when you wanted to.',
                                   ru: 'твоё место никуда не делось. никаких пропущенных уведомлений — их просто нет. только <em>тишина</em>, которая ждала, когда ты захочешь вернуться.' },
    'login.intro.b1':            { en: 'no real name, <strong>no profile to maintain</strong>',
                                   ru: 'никаких настоящих имён, <strong>никакого профиля для поддержки</strong>' },
    'login.intro.b2':            { en: 'your stories &amp; saves are still where you left them',
                                   ru: 'твои истории и сохранённые на месте, где ты их оставил' },
    'login.intro.b3':            { en: 'nothing was sold, profiled, or shared while you were away',
                                   ru: 'ничего не продано, не профилировано и не передано, пока тебя не было' },

    'login.card.eyebrow':        { en: '— sign in',               ru: '— вход' },
    'login.card.title':          { en: 'Welcome back',            ru: 'С возвращением' },
    'login.card.sub':            { en: 'use the handle &amp; password you picked when you joined.',
                                   ru: 'введи ник и пароль, которые ты задал при регистрации.' },

    'login.field.username':      { en: 'username',                ru: 'ник' },
    'login.field.username.ph':   { en: 'yourhandle',              ru: 'твойник' },
    'login.field.password':      { en: 'password',                ru: 'пароль' },
    'login.pw.show':             { en: 'show',                    ru: 'показать' },
    'login.pw.hide':             { en: 'hide',                    ru: 'скрыть' },
    'login.pw.aria':             { en: 'Show password',           ru: 'Показать пароль' },

    'login.submit':              { en: 'sign in',                 ru: 'войти' },
    'login.switch':              { en: 'no account yet? <a href="register.html">start here</a>',
                                   ru: 'нет аккаунта? <a href="register.html">начни здесь</a>' },

    /* Common error messages (used by auth.js) — optional, won't break
       if some are missing; auth.js falls back to English literals. */
    'login.err.both':            { en: 'please enter your username and password.',
                                   ru: 'пожалуйста, введи ник и пароль.' },
    'login.err.bad':             { en: 'wrong username or password.',
                                   ru: 'неверный ник или пароль.' },
    'login.err.network':         { en: 'network error — try again in a moment.',
                                   ru: 'ошибка сети — попробуй через минуту.' },

    /* ── register.html ─────────────────────────────────── */
    'reg.nav.login':             { en: 'login',                  ru: 'вход' },

    'reg.intro.eyebrow':         { en: '<em>—</em> new here',    ru: '<em>—</em> впервые здесь' },
    'reg.intro.title':           { en: 'no intro <em>required.</em><img src="assets/letters/_Special Characters/Asterisk_01.png" class="auth-title-star" alt="" aria-hidden="true">',
                                   ru: 'без <em>знакомств.</em><img src="assets/letters/_Special Characters/Asterisk_01.png" class="auth-title-star" alt="" aria-hidden="true">' },
    'reg.intro.lede':            { en: 'a handle and a password — that\'s <em>genuinely all we need</em>. your real name stays yours. no email verification, no profile photo, no nothing.',
                                   ru: 'ник и пароль — это <em>правда всё, что нам нужно</em>. твоё настоящее имя остаётся твоим. никакой почты, никакого фото профиля, ничего лишнего.' },
    'reg.intro.b1':              { en: '<strong>anonymous by default</strong> — handle is just so you can find your own posts',
                                   ru: '<strong>анонимно по умолчанию</strong> — ник нужен только чтобы ты сам мог найти свои посты' },
    'reg.intro.b2':              { en: 'no email, no phone, no social-sign-in tracking',
                                   ru: 'никакой почты, телефона, входов через соцсети — никаких трекеров' },
    'reg.intro.b3':              { en: 'your data is <strong>never sold, profiled, or trained on</strong>',
                                   ru: 'твои данные <strong>никогда не продаются, не профилируются и не идут в обучение AI</strong>' },
    'reg.intro.b4':              { en: 'delete your account anytime — really, the button works',
                                   ru: 'удалить аккаунт можно в любой момент — правда, кнопка работает' },

    'reg.card.eyebrow':          { en: '— create account',       ru: '— регистрация' },
    'reg.card.title':            { en: 'Create your account',    ru: 'Создай аккаунт' },

    'reg.field.firstname':       { en: 'first name',             ru: 'имя' },
    'reg.field.lastname':        { en: 'last name',              ru: 'фамилия' },
    'reg.field.optional':        { en: 'optional',               ru: 'необязательно' },
    'reg.field.username':        { en: 'username',               ru: 'ник' },
    'reg.field.username.ph':     { en: 'yourhandle',             ru: 'твойник' },
    'reg.field.username.hint':   { en: 'letters, numbers, _ and - only. 3–30 characters.',
                                   ru: 'только буквы, цифры, _ и -. от 3 до 30 символов.' },
    'reg.field.password':        { en: 'password',               ru: 'пароль' },

    'reg.terms':                 { en: 'i agree to the <a href="docs/html/terms-of-service.html">terms of service</a> and <a href="docs/html/privacy-policy.html">privacy policy</a>',
                                   ru: 'я согласен с <a href="docs/html/terms-of-service.html">условиями использования</a> и <a href="docs/html/privacy-policy.html">политикой конфиденциальности</a>' },

    'reg.submit':                { en: 'create account',         ru: 'создать аккаунт' },
    'reg.switch':                { en: 'already have an account? <a href="login.html">sign in</a>',
                                   ru: 'уже есть аккаунт? <a href="login.html">войти</a>' },

    /* Password strength meter labels (referenced by JS) */
    'reg.pw.weak':               { en: 'weak',                   ru: 'слабый' },
    'reg.pw.medium':             { en: 'okay',                   ru: 'средний' },
    'reg.pw.strong':             { en: 'strong',                 ru: 'надёжный' },
    'reg.pw.tooshort':           { en: 'too short',              ru: 'слишком короткий' }
  };


  /* ── Public API on window.SH_I18N ───────────────────────────── */
  var SH_I18N = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    apply: applyToRoot
  };
  window.SH_I18N = SH_I18N;


  function getLang() {
    try {
      var l = localStorage.getItem(STORAGE_KEY);
      if (l === 'en' || l === 'ru') return l;
    } catch (_) {}
    return DEFAULT_LANG;
  }

  function setLang(lang) {
    if (lang !== 'en' && lang !== 'ru') return;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    document.documentElement.setAttribute('lang', lang);
    applyToRoot(document);
    updateToggleUI();
    /* Notify the rest of the app — other scripts can re-render
       their JS-built UI on this event. */
    document.dispatchEvent(new CustomEvent('sh:langchange', { detail: lang }));
  }

  function t(key) {
    var entry = DICT[key];
    if (!entry) return key; // fallback — show the key so missing strings are obvious
    return entry[getLang()] || entry.en || key;
  }

  /* Walk the subtree and apply translations for every data-i18n* attr. */
  function applyToRoot(root) {
    if (!root) return;
    /* innerHTML by data-i18n="key" */
    var els = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el  = els[i];
      var key = el.getAttribute('data-i18n');
      if (!key) continue;
      var val = t(key);
      if (val === undefined) continue;
      el.innerHTML = val;
    }
    /* Attribute translations: data-i18n-attr-<name>="key" */
    var attrEls = root.querySelectorAll('*');
    for (var j = 0; j < attrEls.length; j++) {
      var node = attrEls[j];
      var attrs = node.attributes;
      for (var k = 0; k < attrs.length; k++) {
        var name = attrs[k].name;
        if (name.indexOf('data-i18n-attr-') === 0) {
          var target = name.slice('data-i18n-attr-'.length);
          var v = t(attrs[k].value);
          if (v !== undefined) node.setAttribute(target, v);
        }
      }
    }
  }


  /* ── Toggle UI ─────────────────────────────────────────────────
     Renders into the element with id="sh-lang-mount" if present
     (only on /preferences.html). On every other page no toggle is
     drawn — language is controlled exclusively from the Preferences
     screen.

     Visual: two pretty cards side-by-side, matching the theme-cards
     pattern from the same page (flag bubble + name + native name +
     accent ring on active). Hover gives a lift + slight rotation. */
  function injectToggle() {
    var mount = document.getElementById('sh-lang-mount');
    if (!mount) return;
    if (mount.querySelector('.sh-lang-cards')) return;

    /* Available + planned languages. Adding a new one is just adding
       an entry — the grid auto-fits. */
    var LANGS = [
      { code: 'en', name: 'English',    native: 'english',    available: true  },
      { code: 'ru', name: 'Russian',    native: 'русский',    available: true  },
      { code: 'uk', name: 'Ukrainian',  native: 'українська', available: false },
      { code: 'es', name: 'Spanish',    native: 'español',    available: false },
      { code: 'fr', name: 'French',     native: 'français',   available: false },
      { code: 'de', name: 'German',     native: 'deutsch',    available: false }
    ];
    var CHECK_SVG = '<svg class="sh-lang-check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/></svg>';

    var html = '<div class="sh-lang-cards" role="radiogroup" aria-label="Site language">';
    LANGS.forEach(function (L) {
      var dis = L.available ? '' : ' is-disabled" aria-disabled="true';
      html +=
        '<button type="button" class="sh-lang-card' + dis + '" data-lang="' + L.code + '" data-available="' + (L.available ? '1' : '0') + '" role="radio" aria-checked="false">' +
          '<span class="sh-lang-flag" aria-hidden="true">' + L.code.toUpperCase() + '</span>' +
          '<span class="sh-lang-text">' +
            '<span class="sh-lang-name">' + L.name + (L.available ? '' : '<span class="sh-lang-soon">soon</span>') + '</span>' +
            '<span class="sh-lang-native">' + L.native + '</span>' +
          '</span>' +
          CHECK_SVG +
        '</button>';
    });
    html += '</div>';
    mount.insertAdjacentHTML('beforeend', html);
    mount.querySelectorAll('.sh-lang-card').forEach(function (card) {
      card.addEventListener('click', function () {
        if (card.getAttribute('data-available') !== '1') {
          /* Tiny shake — feedback that the language isn't ready yet */
          card.animate(
            [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' },
             { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
            { duration: 220, easing: 'ease-in-out' }
          );
          return;
        }
        setLang(card.getAttribute('data-lang'));
      });
    });

    if (!document.getElementById('sh-lang-toggle-style')) {
      var style = document.createElement('style');
      style.id = 'sh-lang-toggle-style';
      style.textContent =
        '.sh-lang-cards{' +
          'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;' +
        '}' +
        '.sh-lang-card{' +
          'display:flex;align-items:center;gap:14px;' +
          'padding:14px 16px;' +
          'background:var(--paper-soft,#fffaf0);' +
          'border:1.5px solid var(--line-soft,#d0c4a4);' +
          'border-radius:10px;' +
          'cursor:pointer;font:inherit;text-align:left;color:var(--ink,#1a1410);' +
          'position:relative;' +
          'transition:border-color .25s ease,background .25s ease,transform .3s cubic-bezier(0.34,1.56,0.64,1);' +
        '}' +
        '.sh-lang-card:hover{' +
          'transform:translateY(-2px) rotate(-0.3deg);' +
          'border-color:var(--line,#c5b791);' +
          'background:var(--paper,#f4ead6);' +
        '}' +
        '.sh-lang-card.is-active{' +
          'border-color:var(--accent-2,#d6533c);' +
          'background:rgba(214,83,60,0.06);' +
          'box-shadow:0 0 0 3px rgba(214,83,60,0.10);' +
        '}' +
        '.sh-lang-card.is-disabled{' +
          'opacity:0.55;cursor:not-allowed;' +
        '}' +
        '.sh-lang-card.is-disabled:hover{' +
          'transform:none;border-color:var(--line-soft,#d0c4a4);background:var(--paper-soft,#fffaf0);' +
        '}' +
        '.sh-lang-flag{' +
          'width:36px;height:36px;border-radius:50%;' +
          'background:var(--paper-3,#e6d2ad);' +
          'display:inline-flex;align-items:center;justify-content:center;' +
          'font-family:"Ubuntu",sans-serif;font-weight:700;font-size:12px;' +
          'letter-spacing:0.05em;color:var(--ink,#1a1410);flex-shrink:0;' +
        '}' +
        '.sh-lang-card.is-active .sh-lang-flag{' +
          'background:var(--accent-2,#d6533c);color:#fff;' +
        '}' +
        '.sh-lang-text{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0;}' +
        '.sh-lang-name{' +
          'font-size:14.5px;font-weight:600;color:var(--ink,#1a1410);letter-spacing:0.01em;' +
          'display:inline-flex;align-items:center;gap:6px;' +
        '}' +
        '.sh-lang-soon{' +
          'display:inline-block;font-size:9.5px;font-weight:700;letter-spacing:0.10em;' +
          'text-transform:uppercase;padding:2px 6px;border-radius:99px;' +
          'background:rgba(214,83,60,0.12);color:var(--accent-2,#d6533c);' +
        '}' +
        '.sh-lang-native{font-size:12px;color:var(--ink-light,#a89e8c);font-style:italic;}' +
        '.sh-lang-check{' +
          'width:18px;height:18px;color:var(--accent-2,#d6533c);' +
          'opacity:0;transform:scale(0.6);' +
          'transition:opacity .25s ease,transform .35s cubic-bezier(0.34,1.56,0.64,1);' +
          'flex-shrink:0;' +
        '}' +
        '.sh-lang-card.is-active .sh-lang-check{opacity:1;transform:scale(1);}';
      document.head.appendChild(style);
    }
    updateToggleUI();
  }

  function updateToggleUI() {
    var cur = getLang();
    document.querySelectorAll('.sh-lang-card').forEach(function (c) {
      var active = c.getAttribute('data-lang') === cur;
      c.classList.toggle('is-active', active);
      c.setAttribute('aria-checked', String(active));
    });
  }


  /* ── Bootstrap ──────────────────────────────────────────────── */
  function init() {
    var lang = getLang();
    document.documentElement.setAttribute('lang', lang);
    applyToRoot(document);
    injectToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
