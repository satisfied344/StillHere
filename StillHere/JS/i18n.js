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
    'menu.ai':             { en: 'AI support',            ru: 'AI-спутник' },
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
                             ru: 'быть рядом, а не давать решения.' },
    'ab.hero.card.text':   { en: 'you don\'t always need to be fixed. sometimes you just need to be <strong>heard</strong> — and to know someone, somewhere, gets it.',
                             ru: 'тебя не всегда нужно «чинить». иногда тебе просто нужно, чтобы тебя <strong>услышали</strong> — и чтобы кто-то где-то понял.' },
    'ab.hero.lede':        { en: 'we built this for the moments when everything feels heavy and you don\'t know where to put it. not a clinic, not a forum — a <em>small, soft place</em> on the internet where presence matters more than answers.',
                             ru: 'это место сделано для моментов, когда всё кажется тяжёлым и ты не знаешь, куда это деть. не клиника, не форум — <em>маленькое и тихое место</em> в интернете, где просто <em>"побыть рядом"</em> важнее ответов.' },

    'ab.sec.01.title':     { en: 'why this exists',
                             ru: 'зачем платформа существует' },
    'ab.sec.01.hint':      { en: 'the short version',
                             ru: 'если совсем коротко' },

    'ab.sec.origin.eyebrow':{ en: '— the origin',
                              ru: '— начало' },
    'ab.sec.origin.title': { en: 'it started in a comment section',
                             ru: 'всё началось в комментариях' },
    'ab.sec.origin.hint':  { en: 'not a startup idea',
                             ru: 'это не идея стартапа' },

    'ab.sec.02.title':     { en: 'how it works',
                             ru: 'как это работает' },
    'ab.sec.02.hint':      { en: 'four small things, no more',
                             ru: 'четыре маленьких вещи, не больше' },

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
                             ru: 'где бы ты ни был сегодня вечером — <em>мы рады, что ты нашёл это.</em>' },
    'ab.closing.sub':      { en: '— still here, always',
                             ru: '— всё ещё здесь, всегда' },
    'ab.cta.share':        { en: 'start sharing',         ru: 'начать делиться' },
    'ab.cta.ai':           { en: 'talk to ai support',    ru: 'поговорить с AI' },

    /* Premise paragraphs */
    'ab.premise.p1': {
      en: 'most of the internet is loud. it wants your attention, your reaction, your hot take. mental-health spaces aren\'t always better — they push <strong>productivity</strong>, <strong>positivity</strong>, <strong>five-step plans</strong>.',
      ru: 'большая часть интернета — шумная. ему нужно твоё внимание, твоя реакция, твоё мнение. платформы про ментальное здоровье? <br>- там навязывают <strong>продуктивность</strong>, <strong>позитив</strong>, <strong>планы из пяти шагов</strong>.'
    },
    'ab.premise.p2': {
      en: 'sometimes none of that fits. sometimes you just need somewhere <em>slower</em>. somewhere a stranger can read what you wrote and not try to sell you anything, fix you, or rush you toward "better."',
      ru: 'иногда ничего из этого не подходит. иногда тебе просто нужно место <em>помедленнее</em>. место, где незнакомый человек может прочитать твою историю — и не будет тебе ничего продавать, чинить тебя или подталкивать к «лучше».'
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
      ru: '<em>(чаще всего я замечал это в TikTok, но это происходит везде.)</em>'
    },
    'ab.origin.p3': {
      en: 'the pattern was always the same: someone writing the most honest thing they\'d said in months, sideways, under content that had nothing to do with them — and hoping a single stranger would notice.',
      ru: 'всё всегда выглядело одинаково: человек пишет самое честное, что говорил за месяцы — где-то далеко, под чужим контентом, который не имеет к нему отношения — и надеется, что хоть один незнакомец заметит.'
    },
    'ab.origin.p4': {
      en: 'sometimes one did. and the only thing they said back was something like <em>"i read every word."</em> — and that was the only place all week the person who wrote it felt heard. <strong>someone actually stopped and listened.</strong>',
      ru: 'иногда кто-то замечал. и единственное, что отвечал, было что-то вроде <em>«я прочитал каждое слово»</em> — и где человек, который это написал, почувствовал, что его услышали <strong>кто-то реально остановился и послушал.</strong>'
    },
    'ab.origin.p5': {
      en: '<strong>StillHere is that — on purpose.</strong> not buried under a video your friends might see. not borrowed from someone else\'s thread. a quiet feed where you can write what you couldn\'t say out loud, and someone who\'s been there too can sit with you for a minute.',
      ru: '<strong>StillHere — это то же, и это сделано намеренно.</strong> не спрятано под видео, которое могут увидеть твои друзья. не позаимствовано из чужого треда. тихая лента, где можно написать то, что нельзя сказать вслух — и где кто-то, кто там тоже был, побудет с тобой минуту.'
    },
    'ab.origin.pull': {
      en: 'you shouldn\'t have to look <em>strong</em><br>to be allowed to say <em>something true.</em>',
      ru: 'тебе не должно приходиться выглядеть <em>сильным</em>,<br>чтобы тебе разрешили сказать <em>что-то настоящее.</em>'
    },

    /* Section 02 — feature cards */
    'ab.feat.01.label': { en: '— feature 01',         ru: '— возможность 01' },
    'ab.feat.01.title': { en: 'community feed',       ru: 'лента сообщества' },
    'ab.feat.01.desc':  {
      en: 'a slow scroll of stories — no likes, no clout. people share what they\'re carrying; others respond gently. tag <strong>"no advice"</strong> if you only want presence.',
      ru: 'медленная лента историй — без лайков, без погони за вниманием. люди делятся тем, что у них внутри; другие отвечают мягко. ставь тег <strong>«без советов»</strong>, если хочешь, чтобы кто-то просто побыл рядом.'
    },
    'ab.feat.01.link':  { en: 'visit feed',           ru: 'открыть ленту' },

    'ab.feat.02.label': { en: '— feature 02',         ru: '— возможность 02' },
    'ab.feat.02.title': { en: 'ai companion',         ru: 'AI-спутник' },
    'ab.feat.02.desc':  {
      en: 'a quiet companion for the hours when nobody else is around. <strong>no diagnosis, no scripts, no pressure</strong> to feel better by the end of the conversation — it just stays with you for as long as you want it to.',
      ru: 'тихий спутник для часов, когда никого больше нет рядом. <strong>без диагнозов, без скриптов, без давления</strong> почувствовать себя лучше к концу диалога — он просто остаётся рядом столько, сколько тебе нужно.'
    },
    'ab.feat.02.link':  { en: 'open chat',            ru: 'открыть чат' },

    'ab.feat.03.label': { en: '— feature 03',         ru: '— возможность 03' },
    'ab.feat.03.title': { en: 'anonymous by default', ru: 'анонимно по умолчанию' },
    'ab.feat.03.desc':  {
      en: 'no real name, no photo, no profile to maintain. you can post fully anonymously, or pick any name you want. <strong>nothing is sold to anyone, ever.</strong>',
      ru: 'без настоящего имени, без фото, без профиля, который нужно «вести». можно публиковать полностью анонимно или выбрать любое имя. <strong>мы ничего никому не продаём.</strong>'
    },
    'ab.feat.03.link':  { en: 'read privacy',         ru: 'политика конфиденциальности' },

    /* Section 03 — principles */
    'ab.princ.01.title': { en: 'presence over fixing',  ru: 'быть рядом важнее, чем пытаться «починить»' },
    'ab.princ.01.desc':  { en: 'listening is the work. solutions are optional.',
                           ru: 'слушать — это и есть работа. решения — опциональны.' },
    'ab.princ.02.title': { en: 'slow over viral',       ru: 'медленно важнее вирусно' },
    'ab.princ.02.desc':  { en: 'no streaks, no notifications begging for return.',
                           ru: 'без стриков, без уведомлений, выпрашивающих вернуться.' },
    'ab.princ.03.title': { en: 'private over public',   ru: 'приватно важнее публично' },
    'ab.princ.03.desc':  { en: 'your story is yours. we don\'t sell, profile, or train on it.',
                           ru: 'твоя история — твоя. мы её не продаём и не используем для обучения моделей с нашей стороны.' },
    'ab.princ.04.title': { en: 'human over algorithm',  ru: 'человек важнее алгоритма' },
    'ab.princ.04.desc':  { en: 'the feed is chronological. no engagement scoring.',
                           ru: 'лента хронологическая. без скоринга вовлечённости.' },

    /* Section 04 — what we're not */
    'ab.not.title': { en: 'we\'re <em>not</em> a replacement for —',
                      ru: 'мы <em>не</em> замена для —' },
    'ab.not.sub':   { en: 'StillHere is a soft place, but it has limits. please know them, and please don\'t carry serious things alone.',
                      ru: 'StillHere — тихое место, но у него есть границы. знай их, и пожалуйста, не неси серьёзные вещи в одиночку.' },
    'ab.not.01': {
      en: '<strong>a therapist or psychiatrist.</strong> we can\'t diagnose, prescribe, or treat clinical conditions.',
      ru: '<strong>терапевт или психиатр.</strong> мы не ставим диагнозы, не выписываем рецепты и не лечим клинические состояния.'
    },
    'ab.not.02': {
      en: '<strong>a crisis line.</strong> if you\'re unsafe right now, please call a trained counselor — they\'re 24/7 and free.',
      ru: '<strong>линия экстренной помощи.</strong> если тебе сейчас небезопасно — позвони обученному консультанту. они работают 24/7 и это бесплатно.'
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
                          ru: 'один человек, <em>работающий неспеша.</em>' },
    'ab.story.p1': {
      en: 'StillHere is a <strong>solo project</strong>. one developer, building and maintaining the whole thing — the site, the database, the moderation, the writing on these pages, all of it. no team, no investors, no growth deck.',
      ru: 'StillHere — <strong>сольный проект</strong>. один разработчик, который строит и поддерживает всё — сайт, базу, модерацию, тексты на этих страницах. без команды, без инвесторов, без презентации для роста.'
    },
    'ab.story.p2': {
      en: 'the reason it exists is personal. burnout, grief, the kind of nights where the internet only made it worse. nothing felt right — so this place is an attempt to make one that <strong>doesn\'t shout</strong>.',
      ru: 'причина — личная. выгорание, потеря, ночи, когда интернет делал только хуже. ничто не подходило — поэтому это место — это попытка сделать такое, которое <strong>не кричит</strong>.'
    },
    'ab.story.p3': {
      en: 'everything is open-source. no ads, no data sales, no quarterly numbers to hit. running costs come out of one person\'s pocket; if it ever grows, it\'ll grow slowly and only as much as it needs to.',
      ru: 'весь код открытый. без рекламы, без продажи данных, без квартальных показателей. расходы оплачиваются из одного кармана; если когда-нибудь вырастет — медленно и ровно настолько, насколько нужно.'
    },
    'ab.story.p4': {
      en: 'if you want to help — share your story, send a kind reply, point out a bug, or just exist here quietly — you already are.',
      ru: 'если хочешь помочь — поделись историей, оставь добрый ответ, укажи на баг или просто тихо побудь здесь — ты уже это делаешь.'
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
                             ru: 'Проект о том, чтобы быть рядом, а не искать решения' },
    'footer.platform':     { en: 'Platform',              ru: 'Платформа' },
    'footer.browse':       { en: 'Browse Stories',        ru: 'Читать истории' },
    'footer.share':        { en: 'Share Your Story',      ru: 'Поделиться своей историей' },
    'footer.updates':      { en: 'Updates',               ru: 'Обновления' },
    'footer.support':      { en: 'Support',               ru: 'Поддержка' },
    'footer.about':        { en: 'About Us',              ru: 'О нас' },
    'footer.contacts':     { en: 'Contacts',              ru: 'Контакты' },
    'footer.guidelines':   { en: 'Guidelines',            ru: 'Правила' },
    'footer.crisis':       { en: 'Crisis Resources',      ru: 'Где найти помощь' },
    'footer.legal':        { en: 'Legal',                 ru: 'Правовое' },
    'footer.privacy':      { en: 'Privacy Policy',        ru: 'Политика конфиденциальности' },
    'footer.terms':        { en: 'Terms of Service',      ru: 'Условия использования' },
    'footer.consent':      { en: 'by being here, you accept our <a href="docs/html/terms-of-service.html">terms</a> &amp; <a href="docs/html/privacy-policy.html">privacy</a>.',
                             ru: 'находясь здесь, ты принимаешь наши <a href="docs/html/terms-of-service.html">условия пользования</a> и <a href="docs/html/privacy-policy.html">политику конфиденциальности</a>.' },
    'footer.consent.docs': { en: 'by being here, you accept our <a href="terms-of-service.html">terms</a> &amp; <a href="privacy-policy.html">privacy</a>.',
                             ru: 'находясь здесь, ты принимаешь наши <a href="terms-of-service.html">условия пользования</a> и <a href="privacy-policy.html">политику конфиденциальности</a>.' },
    'footer.consent.subdir':{ en: 'by being here, you accept our <a href="../docs/html/terms-of-service.html">terms</a> &amp; <a href="../docs/html/privacy-policy.html">privacy</a>.',
                             ru: 'находясь здесь, ты принимаешь наши <a href="../docs/html/terms-of-service.html">условия пользования</a> и <a href="../docs/html/privacy-policy.html">политику конфиденциальности</a>.' },

    /* ── nav-bar/contacts.html ────────────────────────────── */
    'ct.hero.eyebrow':     { en: '<em>—</em> reach out, anytime',
                             ru: '<em>—</em> напиши нам в любое время' },
    'ct.hero.title':       { en: 'say <em>hello.</em>',
                             ru: 'просто <em>напиши.</em>' },
    'ct.hero.lede':        { en: 'questions, ideas, kind words, partnership requests — we read everything. we\'re a <em>small team</em> running this quietly, so replies may take a day or two. if you\'re in crisis, please scroll down first.',
                             ru: 'вопросы, идеи, добрые слова, предложения о сотрудничестве — мы читаем всё. мы <em>небольшой проект</em>, поэтому можем ответить не сразу. если ты в очень тяжелой ситуации — пожалуйста, прокрути вниз сначала.' },
    'ct.hero.card.eyebrow':{ en: '— note from us',                ru: '— заметка от нас' },
    'ct.hero.card.title':  { en: 'we read every message.',         ru: 'мы читаем каждое сообщение.' },
    'ct.hero.card.text':   { en: 'no bots, no support tickets. just one human reading email between coffee. <strong>thank you for taking time to write.</strong>',
                             ru: 'без ботов, без тикетов поддержки. один живой человек читает почту между чашками кофе. <strong>спасибо, что нашёл время написать.</strong>' },

    'ct.crisis.title':     { en: 'in crisis right now?',           ru: 'в кризисе прямо сейчас?' },
    'ct.crisis.hint':      { en: 'please reach a real person',     ru: 'пожалуйста, обратись к живому человеку' },
    'ct.crisis.subtitle':  { en: 'we\'re not an emergency service.', ru: 'мы не служба экстренной помощи.' },
    'ct.crisis.desc':      { en: 'if you\'re feeling unsafe or in immediate distress, please call a trained crisis counselor — they\'re available 24/7, free, in most countries.',
                             ru: 'если тебе небезопасно или ты в особенно сложной ситуации — пожалуйста, позвони обученному консультанту кризисной поддержки: они доступны 24/7, бесплатно, в большинстве стран.' },
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
                                ru: 'мы небольшой проект — спасибо за терпение.' },
    'ct.facts.based':      { en: 'based in',                       ru: 'находимся' },
    'ct.facts.based.value':{ en: 'online · everywhere',            ru: 'онлайн · отовсюду' },
    'ct.facts.based.note': { en: 'no office, no zip code — just the internet.',
                             ru: 'без офиса, без почтового индекса — только интернет.' },
    'ct.facts.lang':       { en: 'languages',                      ru: 'языки' },
    'ct.facts.lang.value': { en: 'english · more coming',          ru: 'english · скоро появятся другие' },
    'ct.facts.lang.note':  { en: 'write in any language — we\'ll translate.',
                             ru: 'пиши на любом языке — мы переведём.' },

    'ct.closing.text':     { en: 'whatever you write — <em>we\'ll read it carefully.</em>',
                             ru: 'что бы ты ни написал — <em>мы прочитаем внимательно.</em>' },
    'ct.closing.sub':      { en: '— still here, always',           ru: '— здесь, всегда' },

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
    'up.stat.commits':     { en: 'commits',          ru: 'изменений' },
    'up.stat.commits.value':{ en: '42 on main',      ru: '42 в main' },

    'up.timeline.title':   { en: 'timeline',         ru: 'хронология' },
    'up.timeline.hint':    { en: 'newest first',     ru: 'сначала новые' },

    /* Tag labels — reused across entries */
    'up.tag.design':       { en: 'design',           ru: 'дизайн' },
    'up.tag.fix':          { en: 'fix',              ru: 'исправление' },
    'up.tag.new':          { en: 'new',              ru: 'новое' },
    'up.tag.comm':         { en: 'community',        ru: 'сообщество' },
    'up.tag.security':     { en: 'security',         ru: 'безопасность' },
    'up.tag.ai':           { en: 'ai support',       ru: 'AI-спутник' },
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
                             ru: 'доработка тёмной темы: записка «not alone» осталась кремовой, рисунки корректно инвертируются (коты, облака, звёздочки), теги-пилюли с высоким контрастом в обеих темах' },
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
                             ru: 'клиентский i18n на английском и русском, тихий счётчик посетителей и аналитика без отслеживания. <em>ничего о вас — только факт открытия страницы</em>' },
    'up.e0519.li1':        { en: '<strong>JS/i18n.js</strong> — full EN/RU dictionary + toggle in preferences',
                             ru: '<strong>JS/i18n.js</strong> — полный словарь EN/RU + переключатель в настройках' },
    'up.e0519.li2':        { en: '<strong>site_pings</strong> — supabase table: timestamps + session-id only; powers the "x online now" counter on /statistics',
                             ru: '<strong>site_pings</strong> — таблица supabase: только timestamps + session-id; используется для счётчика «сейчас онлайн» на /statistics' },
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
                             ru: 'добавили страницу AI-чата — бумажная эстетика, переключатель no-advice, теги настроения. API-ключ живёт в edge-функции supabase; <em>он не попадает в браузер</em>.' },
    'up.e0516.li1':        { en: 'full AI chat UI: navbar, sidebar, messages, doodle assets, transitions',
                             ru: 'полный UI AI-чата: навбар, сайдбар, сообщения, рисунки, переходы' },
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
                             ru: 'вспомогательные страницы сложились. первый набросок UI чата AI-спутника. секция комментариев пересобрана, меню постов отполированы.' },
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
                             ru: 'несколько недель итераций, чтобы нащупать правильный визуальный тон — тёплый крем, чернильные рисунки, курсив Caveat в качестве акцента. полностью заменили набор иконок.' },
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
                             ru: 'первые коммиты — базовая структура локально обретает форму. главная страница, иконки, страница профиля, черновик create-post и грубая идея <em>"быть рядом", а не решений</em>. ничего не задеплоено пока, просто нащупываем.' },
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
                             ru: 'не нужно ни имени, ни истории. просто <em>оставайся</em> таким, какой ты сейчас — твоё пространство, твой темп.' },

    'pf.card.someone':     { en: 'Someone here',                      ru: 'Незнакомец' },
    'pf.card.joined':      { en: 'Joined recently',                   ru: 'Присоединился(-ась) недавно' },
    /* Prefix used by the dynamically rendered "Joined <Month Year>"
       line — kept short to read naturally before a locale-formatted date. */
    'pf.card.joined.prefix':{ en: 'Joined',                            ru: 'С нами с' },
    'pf.card.anon':        { en: 'Anonymous',                         ru: 'Анонимно' },
    'pf.btn.edit':         { en: 'Edit profile',                      ru: 'Редактировать профиль' },
    'pf.btn.signout':      { en: 'Sign out',                          ru: 'Выйти' },
    'pf.btn.signin':       { en: 'Sign in',                           ru: 'Войти' },

    'pf.stats.title':      { en: 'so far',                            ru: 'на данный момент' },
    'pf.stats.hint':       { en: 'honest counts, not vanity metrics', ru: 'честные числа, не ради показухи' },
    'pf.stats.shared':     { en: 'stories shared',                    ru: 'историй опубликовано' },
    'pf.stats.reactions':  { en: 'reactions received',                ru: 'реакций получено' },
    'pf.stats.days':       { en: 'days on StillHere',                 ru: 'дней на StillHere' },

    'pf.next.title':       { en: 'where to next',                     ru: 'куда дальше' },
    'pf.next.hint':        { en: 'small doors, gently',               ru: 'маленькие двери, без давления' },
    'pf.act.browse':       { en: 'browse stories',                    ru: 'читать истории' },
    'pf.act.browse.desc':  { en: 'see what people are carrying today.', ru: 'посмотреть, что люди пишут сегодня.' },
    'pf.act.share':        { en: 'share something',                   ru: 'поделиться чем-то' },
    'pf.act.share.desc':   { en: 'something on your mind? put it somewhere.', ru: 'что-то на душе? можно просто рассказать это здесь.' },
    'pf.act.ai':           { en: 'ai companion',                      ru: 'AI-спутник' },
    'pf.act.ai.desc':      { en: 'not a therapist — but it listens carefully.', ru: 'не терапевт — но он слушает внимательно.' },
    'pf.act.edit':         { en: 'edit profile',                      ru: 'редактировать профиль' },
    'pf.act.edit.desc':    { en: 'tweak how you show up — or don\'t.', ru: 'настрой, как ты этого хочешь — или нет, решение за тобой.' },

    'pf.anon.title':       { en: 'on staying invisible',              ru: 'о том, как остаться невидимым' },
    'pf.anon.hint':        { en: 'anonymity is the default',          ru: 'анонимность по умолчанию' },
    'pf.anon.tag':         { en: 'anonymity first',                   ru: 'сначала анонимность' },
    'pf.anon.h':           { en: 'you don\'t owe anyone <em>your name.</em>', ru: 'ты никому не должен <em>своё имя.</em>' },
    'pf.anon.text':        { en: 'StillHere doesn\'t need it. what you share is yours — no real identity attached, no profile photo, nothing public unless you choose it. your handle is just so you can find your own posts. that\'s genuinely all it is.',
                             ru: 'StillHere в этом не нуждается. что ты публикуешь — твоё: без привязки к реальной личности, без фото, ничего публичного, пока сам не выберешь. твой ник нужен только чтобы ты сам нашёл свои посты. и это правда всё.' },
    'pf.anon.link':        { en: 'read privacy policy',               ru: 'читать политику конфиденциальности' },
    'pf.anon.s1':          { en: 'data sold, ever',                   ru: 'данных продано — никогда' },
    'pf.anon.s2':          { en: 'ways to be yourself',               ru: 'способы быть собой' },
    'pf.anon.s3':          { en: 'rule — be human',                   ru: 'правило — оставаться человеком' },

    'pf.docs.title':       { en: 'read more',                         ru: 'почитать ещё' },
    'pf.docs.hint':        { en: 'the small print, gently',           ru: 'мелкий шрифт, без давления' },
    'pf.docs.guidelines':  { en: 'community guidelines',              ru: 'правила сообщества' },
    'pf.docs.guidelines.sub':{ en: 'how we treat each other here',    ru: 'как мы относимся друг к другу здесь' },
    'pf.docs.privacy':     { en: 'privacy policy',                    ru: 'политика конфиденциальности' },
    'pf.docs.privacy.sub': { en: 'what we collect and why',           ru: 'что мы собираем и зачем' },
    'pf.docs.crisis':      { en: 'crisis resources',                  ru: 'где найти помощь' },
    'pf.docs.crisis.sub':  { en: 'if you need immediate support',     ru: 'если нужна срочная поддержка' },
    'pf.docs.terms':       { en: 'terms of service',                  ru: 'условия использования' },
    'pf.docs.terms.sub':   { en: 'rules of the platform',             ru: 'правила платформы' },

    'pf.closing.text':     { en: 'you\'re <em>here.</em> that\'s enough.', ru: 'ты <em>здесь.</em> этого достаточно.' },
    'pf.closing.sub':      { en: '— still, always',                   ru: '— всегда, тихо' },

    /* ── GDPR / data control section on profile.html ───────── */
    'pf.data.title':       { en: 'your data, your call',              ru: 'твои данные — тебе и решать' },
    'pf.data.hint':        { en: 'GDPR — yours to take with you',     ru: 'GDPR — всё твоё, забери' },
    'pf.data.text':        { en: 'everything you\'ve shared with StillHere belongs to you. download it any time as a single JSON file — profile, posts, comments, saved items. we don\'t gate-keep your own words.',
                             ru: 'всё, чем ты делился на StillHere — принадлежит тебе. скачай это одним JSON-файлом в любой момент: профиль, посты, комментарии, сохранённое. мы не запираем твои слова.' },
    'pf.data.export':      { en: 'download my data (JSON)',           ru: 'скачать мои данные (JSON)' },
    'pf.data.preparing':   { en: 'preparing your data…',              ru: 'готовлю твои данные…' },
    'pf.data.ok':          { en: 'downloaded.',                       ru: 'готово, скачано.' },
    'pf.data.error':       { en: 'something went wrong — try again.', ru: 'что-то пошло не так — попробуй ещё раз.' },

    /* ── Document <title> tags for every top-level page ──────
       Kept in their own block so adding a new page is a single
       key add. Sentence case in both languages — matches what
       browsers display in the tab strip. */
    'doc.title.admin':       { en: 'Moderation queue — StillHere',         ru: 'Очередь модерации — StillHere' },
    'doc.title.aichat':      { en: 'AI companion — StillHere',             ru: 'AI-спутник — StillHere' },
    'doc.title.comingsoon':  { en: 'Coming soon — StillHere',              ru: 'Скоро — StillHere' },
    'doc.title.createpost':  { en: 'Share your story — StillHere',         ru: 'Поделиться историей — StillHere' },
    'doc.title.crisis':      { en: 'Where to find help — StillHere',       ru: 'Где найти помощь — StillHere' },
    'doc.title.guidelines':  { en: 'Community guidelines — StillHere',     ru: 'Правила сообщества — StillHere' },
    'doc.title.privacy':     { en: 'Privacy policy — StillHere',           ru: 'Политика конфиденциальности — StillHere' },
    'doc.title.terms':       { en: 'Terms of service — StillHere',         ru: 'Условия использования — StillHere' },
    'doc.title.editprofile': { en: 'Edit profile — StillHere',             ru: 'Изменить профиль — StillHere' },
    'doc.title.index':       { en: 'StillHere — a space for presence, not solutions',
                               ru: 'StillHere — пространство, чтобы «быть рядом» с кем-то, а не искать решения' },
    'doc.title.letters':     { en: 'Quiet letters — StillHere',            ru: 'Тихие письма — StillHere' },
    'doc.title.login':       { en: 'Sign in — StillHere',                  ru: 'Войти — StillHere' },
    'doc.title.main':        { en: 'Community feed — StillHere',           ru: 'Лента сообщества — StillHere' },
    'doc.title.about':       { en: 'About — StillHere',                    ru: 'О проекте — StillHere' },
    'doc.title.contacts':    { en: 'Contacts — StillHere',                 ru: 'Контакты — StillHere' },
    'doc.title.profile':     { en: 'Your profile — StillHere',             ru: 'Твой профиль — StillHere' },
    'doc.title.updates':     { en: 'Updates — StillHere',                  ru: 'Обновления — StillHere' },
    'doc.title.post':        { en: 'A story on StillHere',                 ru: 'История на StillHere' },
    'doc.title.preferences': { en: 'Preferences — StillHere',              ru: 'Настройки — StillHere' },
    'doc.title.register':    { en: 'Join StillHere — anonymous, free',     ru: 'Присоединиться к StillHere — анонимно, бесплатно' },
    'doc.title.stats':       { en: 'By the numbers — StillHere',           ru: 'В цифрах — StillHere' },
    'doc.title.therapists':  { en: 'Therapists & support — StillHere',     ru: 'Терапевты и поддержка — StillHere' },

    /* ── 404.html ─────────────────────────────────────────── */
    /* Tab title uses sentence case to match every other page in
       the site (Preferences / Updates / About / …). The body
       heading "page not found" stays lowercase — it's the inline
       eyebrow style, not a tab. */
    'nf.doc.title':        { en: 'Not here — StillHere',              ru: 'Нет страницы — StillHere' },
    'nf.doc.desc':         { en: 'This page drifted off — but you\'re still here.',
                             ru: 'эта страница куда-то ускользнула — но ты всё ещё здесь.' },
    'nf.eyebrow':          { en: 'page not found',                    ru: 'страница не найдена' },
    'nf.title':            { en: 'this page drifted <em>off</em>.',
                             ru: 'эта страница куда-то <em>ускользнула</em>.' },
    'nf.lede':             { en: 'maybe the link was old, maybe a typo —<br>either way, <em>you\'re still here</em>, and that\'s enough.',
                             ru: 'может, ссылка устарела, может, опечатка —<br>так или иначе, <em>ты — здесь</em>, этого достаточно.' },
    'nf.btn.feed':         { en: 'back to the feed',                  ru: 'обратно в ленту' },
    'nf.btn.home':         { en: 'or go home',                        ru: 'или на главную' },

    /* ── offline.html ─────────────────────────────────────── */
    'off.doc.title':       { en: 'Offline — StillHere',               ru: 'Нет сети — StillHere' },
    'off.eyebrow':         { en: 'offline',                           ru: 'нет сети' },
    'off.title':           { en: 'no <em>signal</em>, still <em>here</em>.',
                             ru: 'нет <em>сигнала</em>, но ты всё ещё <em>здесь</em>.' },
    'off.lede':            { en: 'we couldn\'t reach the network — that\'s okay. take a breath. when you\'re back online, the page will load.',
                             ru: 'мы не смогли дотянуться до сети — это нормально. сделай вдох. как только связь вернётся — страница откроется.' },
    'off.btn':             { en: 'try again',                         ru: 'попробовать снова' },

    /* ── u.html (public profile) ────────────────────────── */
    'u.doc.title.loading': { en: 'Loading profile — StillHere',        ru: 'Загружаем профиль — StillHere' },
    'u.doc.desc':          { en: 'A quiet voice on StillHere.',        ru: 'Тихий голос на StillHere.' },
    'u.hero.eyebrow':      { en: 'a quiet voice on stillhere',         ru: 'тихий голос на stillhere' },
    'u.hero.lede':         { en: 'stories shared <em>anonymously</em> here. read what they wrote, sit with it, leave nothing if nothing feels right.',
                             ru: 'истории, рассказанные здесь <em>анонимно</em>. почитай, побудь рядом, можно ничего не оставлять.' },
    'u.card.anon':         { en: 'Anonymous',                          ru: 'Анонимно' },
    'u.card.joined':       { en: 'here since',                         ru: 'здесь с' },
    'u.stats.title':       { en: 'their footprint',                    ru: 'их след' },
    'u.stats.hint':        { en: 'presence, not metrics',              ru: '"быть рядом", а не гнаться за показателями' },
    'u.stats.shared':      { en: 'stories shared',                     ru: 'историй рассказано' },
    'u.stats.support':     { en: 'i\'m-here received',                 ru: '«я рядом» получено' },
    'u.stats.days':        { en: 'days on stillhere',                  ru: 'дней на stillhere' },
    'u.stories.title':     { en: 'their stories',                      ru: 'их истории' },
    'u.stories.hint':      { en: 'newest first',                       ru: 'сначала новые' },
    'u.empty.tag':         { en: 'quiet here',                         ru: 'тихо здесь' },
    'u.empty.text':        { en: 'no stories yet — they\'re just listening.',
                             ru: 'пока ни одной истории — они просто слушают.' },
    'u.closing.text':      { en: 'they\'re <em>still here.</em>',      ru: 'они <em>всё ещё здесь.</em>' },
    'u.closing.sub':       { en: 'and so are you.',                    ru: 'и ты тоже.' },
    'u.err.notfound':      { en: 'not here',                           ru: 'нет такого' },
    'u.err.service':       { en: 'Service unavailable.',               ru: 'Сервис недоступен.' },

    /* ── post.html ─────────────────────────────────────────── */
    'post.state.loading':  { en: 'Loading…',                           ru: 'Загружаем…' },
    'post.back':           { en: 'back to feed',                       ru: 'назад в ленту' },
    'post.author.anon':    { en: 'Anonymous',                          ru: 'Анонимно' },
    'post.options':        { en: 'Post options',                       ru: 'Действия' },
    'post.menu.save':      { en: 'Save Post',                          ru: 'Сохранить пост' },
    'post.menu.unsave':    { en: 'Unsave Post',                        ru: 'Убрать из сохранённого' },
    'post.menu.copylink':  { en: 'Copy Link',                          ru: 'Скопировать ссылку' },
    'post.menu.edit':      { en: 'Edit post',                          ru: 'Изменить пост' },
    'post.menu.delete':    { en: 'Delete post',                        ru: 'Удалить пост' },
    'post.menu.report':    { en: 'Report',                             ru: 'Пожаловаться' },
    'post.support.aria':   { en: 'Support this post',                  ru: 'Поддержать пост' },
    'post.copylink':       { en: 'Copy link',                          ru: 'Скопировать ссылку' },
    'post.copylink.ok':    { en: 'Link copied',                        ru: 'Ссылка скопирована' },
    'post.compose.label':  { en: 'say something.',                     ru: 'скажи что-нибудь.' },
    'post.compose.note':   { en: 'Anonymous · no account needed',      ru: 'Анонимно · аккаунт не нужен' },
    'post.compose.reply':  { en: 'Reply',                              ru: 'Ответить' },
    'post.replies':        { en: 'replies',                            ru: 'ответов' },
    'post.sidebar.label':  { en: 'this post',                          ru: 'этот пост' },
    'post.sidebar.posted': { en: 'Posted',                             ru: 'Опубликовано' },
    'post.sidebar.support':{ en: 'Support given',                      ru: 'Поддержки получено' },
    'post.widget.crisis.t':{ en: 'Need Immediate Help?',               ru: 'Нужна срочная помощь?' },
    'post.widget.crisis.s':{ en: 'If you\'re in crisis, please call out:',
                             ru: 'Если тебе сейчас очень тяжело — позвони, не молчи:' },
    'post.widget.crisis.l':{ en: 'Crisis Hotlines',                    ru: 'Кризисные линии' },
    'post.widget.ai.t':    { en: 'Need support right now?',            ru: 'Нужна поддержка прямо сейчас?' },
    'post.widget.ai.s':    { en: 'If you\'re going through something difficult, you can talk to our AI support:',
                             ru: 'Если тебе сейчас тяжело — можешь поговорить с нашим AI-спутником:' },
    'post.widget.ai.l':    { en: 'Talk to AI support',                 ru: 'Открыть AI-спутника' },
    'post.err.notfound':   { en: 'Post not found. It may have been deleted.',
                             ru: 'Пост не найден. Возможно, его удалили.' },
    'post.err.dbcfg':      { en: 'Database not configured.',           ru: 'База данных не настроена.' },
    'post.err.noid':       { en: 'No post ID in URL.',                 ru: 'В адресе нет ID поста.' },
    'post.err.generic':    { en: 'Something went wrong. Please try again.',
                             ru: 'Что-то пошло не так. Попробуй ещё раз.' },
    'post.toast.deleted':  { en: 'Post deleted',                       ru: 'Пост удалён' },
    'post.toast.saved':    { en: 'Saved',                              ru: 'Сохранено' },
    'post.toast.unsaved':  { en: 'Removed from saved',                 ru: 'Убрано из сохранённого' },
    'post.toast.reported': { en: 'Report sent. Thanks for looking out.',
                             ru: 'Жалоба отправлена. Спасибо.' },

    /* ── auth.js — validators + form errors shared by login + register
       ───────────────────────────────────────────────────────────── */
    'auth.username.required':  { en: 'Username is required.',                ru: 'Укажи имя пользователя.' },
    'auth.username.min':       { en: 'Must be at least 3 characters.',       ru: 'Минимум 3 символа.' },
    'auth.username.max':       { en: 'Must be 30 characters or less.',       ru: 'Не больше 30 символов.' },
    'auth.username.chars':     { en: 'Only letters, numbers, _ and - are allowed.',
                                 ru: 'Только латинские буквы, цифры, _ и -.' },
    'auth.username.startend':  { en: 'Cannot start with _ or -.',            ru: 'Нельзя начинать с _ или -.' },
    'auth.username.endwith':   { en: 'Cannot end with _ or -.',              ru: 'Нельзя заканчивать на _ или -.' },
    'auth.username.consec':    { en: 'No consecutive _ or - characters.',    ru: 'Нельзя ставить _ или - подряд.' },
    'auth.name.max':           { en: 'Max 30 characters.',                   ru: 'Максимум 30 символов.' },
    'auth.name.oneword':       { en: 'One word per field — put the rest in Last name.',
                                 ru: 'Одно слово в поле — остальное в Фамилию.' },
    'auth.name.chars':         { en: 'Letters, hyphens and apostrophes only.',
                                 ru: 'Только буквы, дефисы и апострофы.' },
    'auth.pw.required':        { en: 'Password is required.',                ru: 'Укажи пароль.' },
    'auth.pw.min':             { en: 'Must be at least 8 characters.',       ru: 'Минимум 8 символов.' },
    'auth.pw.letter':          { en: 'Must contain at least one letter.',    ru: 'Должна быть хотя бы одна буква.' },
    'auth.pw.digit':           { en: 'Must contain at least one number.',    ru: 'Должна быть хотя бы одна цифра.' },
    'auth.pw.nospace':         { en: 'No spaces allowed.',                   ru: 'Пробелы запрещены.' },
    'auth.pw.ascii':           { en: 'Latin letters, digits and common symbols only.',
                                 ru: 'Только латинские буквы, цифры и обычные символы.' },
    'auth.pw.max':             { en: 'Must be 128 characters or less.',      ru: 'Не больше 128 символов.' },
    'auth.pw.mismatch':        { en: 'Passwords do not match.',              ru: 'Пароли не совпадают.' },
    'ep.pass.hint':            { en: 'min 8 characters, at least 1 letter & 1 number, no spaces, Latin only.',
                                 ru: 'минимум 8 символов, хотя бы 1 буква и 1 цифра, без пробелов, только латиница.' },

    /* ── edit-profile.html — inline button labels + toasts ─────── */
    'ep.btn.save':         { en: 'Save changes',                       ru: 'Сохранить' },
    'ep.btn.checking':     { en: 'Checking…',                          ru: 'Проверяем…' },
    'ep.btn.saving':       { en: 'Saving…',                            ru: 'Сохраняем…' },
    'ep.btn.checkphoto':   { en: 'Checking photo…',                    ru: 'Проверяем фото…' },
    'ep.toast.photorm':    { en: 'Photo will be removed on save.',     ru: 'Фото удалится после сохранения.' },
    'ep.toast.avblock':    { en: 'Avatar blocked:',                    ru: 'Аватар не принят:' },
    'ep.toast.errpfx':     { en: 'Error:',                             ru: 'Ошибка:' },
    'ep.toast.savednophoto':{ en: 'Saved (no photo — run SQL to enable avatars)',
                              ru: 'Сохранено (без фото — для аватаров нужен SQL)' },
    'ep.toast.pwerr':      { en: 'Password error:',                    ru: 'Ошибка пароля:' },
    'ep.toast.saved':      { en: '✓ Saved!',                           ru: '✓ Сохранено!' },
    'ep.toast.closefail':  { en: 'Could not close account:',           ru: 'Не получилось удалить аккаунт:' },
    'ep.toast.noposts':    { en: 'You have no posts to delete.',       ru: 'У тебя нет постов для удаления.' },
    'ep.toast.delfail':    { en: 'Delete failed:',                     ru: 'Не получилось удалить:' },
    'ep.toast.deleted.one':{ en: 'Deleted {n} post.',                  ru: 'Удалён {n} пост.' },
    'ep.toast.deleted.many':{ en: 'Deleted {n} posts.',                ru: 'Удалено {n} постов.' },
    'reg.field.password.hint': { en: 'min 8 characters, at least 1 letter & 1 number, no spaces, Latin only.',
                                 ru: 'минимум 8 символов, хотя бы 1 буква и 1 цифра, без пробелов, только латиница.' },
    'auth.strength.weak':      { en: 'Weak',                                 ru: 'Слабый' },
    'auth.strength.fair':      { en: 'Fair',                                 ru: 'Так себе' },
    'auth.strength.good':      { en: 'Good',                                 ru: 'Хороший' },
    'auth.strength.strong':    { en: 'Strong',                               ru: 'Сильный' },
    'auth.form.agree':         { en: 'Please agree to the Terms of Service to continue.',
                                 ru: 'Подтверди согласие с Условиями использования, чтобы продолжить.' },
    'auth.form.captcha':       { en: 'Please complete the "I\'m human" check below.',
                                 ru: 'Пройди проверку «я человек» ниже.' },
    'auth.form.generic':       { en: 'Something went wrong. Please try again.',
                                 ru: 'Что-то пошло не так. Попробуй ещё раз.' },
    'auth.form.taken':         { en: 'This username is already taken.',      ru: 'Это имя уже занято.' },
    'auth.form.uname.blocked': { en: 'This username is not allowed.',        ru: 'Это имя нельзя использовать.' },
    'auth.form.name.blocked':  { en: 'This name is not allowed.',            ru: 'Это имя нельзя использовать.' },
    'auth.form.regfail':       { en: 'Registration failed. Please try again.',
                                 ru: 'Регистрация не удалась. Попробуй ещё раз.' },
    'auth.form.confirm':       { en: 'Almost there — but email confirmation is enabled in your Supabase project. Disable it under Authentication → Settings → Email confirmations.',
                                 ru: 'Почти готово — но в проекте Supabase включено подтверждение почты. Отключи его в Authentication → Settings → Email confirmations.' },
    'auth.form.bad':           { en: 'Incorrect username or password. Please try again.',
                                 ru: 'Неверное имя пользователя или пароль. Попробуй ещё раз.' },
    'auth.form.captchafail':   { en: 'Captcha check failed — please tick the box below again and retry.',
                                 ru: 'Капча не прошла — отметь окошко ниже и попробуй ещё раз.' },
    'auth.reset.fillall':      { en: 'Please fill in all fields.',           ru: 'Заполни все поля.' },
    'auth.reset.ok':           { en: 'Password updated — you can sign in now.',
                                 ru: 'Пароль обновлён — можешь войти.' },
    'auth.reset.fail':         { en: 'Could not reset password.',            ru: 'Не получилось сбросить пароль.' },
    'auth.reset.network':      { en: 'Network error — try again.',           ru: 'Сетевая ошибка — попробуй ещё раз.' },
    'auth.reset.title':        { en: 'reset your password',                  ru: 'сбросить пароль' },
    'auth.reset.desc':         { en: 'enter your username and the recovery key you saved when you joined, then choose a new password.',
                                 ru: 'введи своё имя пользователя и recovery key, который ты сохранил при регистрации, и выбери новый пароль.' },
    'auth.reset.ph.user':      { en: 'username',                             ru: 'имя пользователя' },
    'auth.reset.ph.newpw':     { en: 'new password',                         ru: 'новый пароль' },
    'auth.reset.hint':         { en: 'min 8 characters, at least 1 letter & 1 number, no spaces, Latin only',
                                 ru: 'минимум 8 символов, хотя бы 1 буква и 1 цифра, без пробелов, только латиница' },
    'auth.reset.cancel':       { en: 'cancel',                               ru: 'отмена' },
    'auth.reset.submit':       { en: 'reset password',                       ru: 'сбросить пароль' },
    'auth.reset.busy':         { en: 'resetting…',                           ru: 'сбрасываем…' },
    'auth.reset.done':         { en: 'done ✓',                               ru: 'готово ✓' },

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
    'ep.about.username.ph':{ en: 'yourhandle',                        ru: 'твой ник' },
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

    'ep.delposts.title':   { en: 'delete all your posts?',            ru: 'удалить все ваши посты?' },
    'ep.delposts.desc':    { en: 'every story you wrote will be removed for good. replies that other people left under them will go with them. this cannot be undone.',
                             ru: 'все ваши истории будут удалены навсегда. ответы, которые другие люди оставили под ними, тоже исчезнут. отменить нельзя.' },
    'ep.delposts.cancel':  { en: 'keep them',                         ru: 'оставить' },
    'ep.delposts.confirm': { en: 'yes, delete all',                   ru: 'да, удалить все' },

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
                             ru: 'короткие записки тем, кто их никогда не прочитает. бывшему, родителю, той версии тебя, что не дошла. напиши то, что не смог отправить, выбери цвет под вес этого, и <em>оставь здесь</em>.' },
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
    'ql.err.send':         { en: 'couldn’t send the letter. try again in a moment.',
                             ru: 'не получилось отправить письмо. попробуй ещё раз через минуту.' },

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
    'pref.theme.light.name':{ en: 'paper, light',                     ru: 'бумажное, светлое' },
    'pref.theme.light.desc':{ en: 'warm cream, ink on paper',         ru: 'тёплый кремовый цвет, чернила на бумаге' },
    'pref.theme.dark.name':{ en: 'ink, dark',                         ru: 'чернильное, тёмное' },
    'pref.theme.dark.desc':{ en: 'easy on tired eyes',                ru: 'мягко, для уставших глаз' },

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
                             ru: 'несколько <em>проверенных партнёров</em>, для которых это работа — консультанты, психологи, peer-слушатели. бронируешь напрямую у них, в их расписание, в их тоне. StillHere не стоит посередине: без комиссий, без своей системы бронирования, мы не обрабатываем ваши данные.' },
    'th.hero.card.eyebrow':{ en: '— what this is',                     ru: '— что это' },
    'th.hero.card.title':  { en: 'a referral, not a marketplace.',     ru: 'направление, не маркетплейс.' },
    'th.hero.card.text':   { en: '<strong>we don\'t process payments, run video calls, or store sessions.</strong> each partner has their own scheduling and policies — clicking «book» opens their calendar in a new tab.',
                             ru: '<strong>мы не принимаем платежи, не ведём видеосвязь и не храним сессии.</strong> у каждого партнёра — своё расписание и свои правила: кнопка «забронировать» открывает их календарь в новой вкладке.' },

    'th.crisis.title':     { en: 'in crisis right now? please don\'t wait.',
                             ru: 'Тебе сейчас очень тяжело? пожалуйста, не жди.' },
    'th.crisis.desc':      { en: 'partner therapists schedule days in advance. if it feels urgent — please call a hotline that can talk to you in the next few minutes, free, 24/7.',
                             ru: 'у партнёров расписание на дни вперёд. если кажется срочным — пожалуйста, позвони на горячую линию, где с тобой поговорят в ближайшие минуты, бесплатно, 24/7.' },
    'th.crisis.btn':       { en: 'crisis hotlines',                    ru: 'линии помощи' },

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
                             ru: 'бронирование, оплата и сам даилог происходят на их стороне. StillHere ничего не хранит, не логирует и не стоит посередине.' },
    'th.trust.t3.label':   { en: 'pricing',                            ru: 'цены' },
    'th.trust.t3.title':   { en: 'no platform fee',                    ru: 'без платформенного сбора' },
    'th.trust.t3.text':    { en: 'you pay them directly. we take nothing. most partners offer a sliding scale — ask if cost is a concern.',
                             ru: 'оплата идёт напрямую им. мы не берём ничего. большинство партнёров предлагают гибкую цену — спроси, если цена смущает.' },

    'th.closing.text':     { en: 'a real person can listen <em>differently.</em><br>that\'s the whole point.',
                             ru: 'живой человек слушает <em>по-другому.</em><br>в этом весь смысл.' },
    'th.closing.sub':      { en: '— still here, while you find them.', ru: '— мы здесь, пока ты ищешь.' },

    /* ── create-post.html ────────────────────────────────── */
    'cp.hero.eyebrow':     { en: '<em>—</em> share, anonymously',     ru: '<em>—</em> поделись, анонимно' },
    'cp.hero.title':       { en: 'say it, <em>gently.</em>',          ru: 'скажи это, <em>мягко.</em>' },
    'cp.hero.lede':        { en: 'no perfect words, no need to wrap it up neatly. somebody out there is going through something almost <em>just like this</em> — and seeing yours might be the reason they finally write theirs too.',
                             ru: 'не нужно идеальных слов, не надо писать красиво. кто-то прямо сейчас проходит через что-то <em>почти такое же</em> — и твоя история может стать причиной, по которой он наконец напишет свою.' },

    'cp.optional':         { en: 'optional',                          ru: 'необязательно' },

    /* ── create-post.js runtime — alerts, editor placeholder, upload feedback */
    'cp.editor.placeholder': { en: 'Write freely…',                    ru: 'Пиши свободно…' },
    'cp.editor.uploading':   { en: 'Uploading image…',                 ru: 'Загружаем картинку…' },
    'cp.media.remove':       { en: 'Remove',                           ru: 'Удалить' },
    'cp.err.sbcfg':          { en: 'Supabase not configured.',         ru: 'Supabase не настроен.' },
    'cp.err.upload':         { en: 'Upload failed:',                   ru: 'Загрузка не удалась:' },
    'cp.err.sdk':            { en: 'Supabase SDK not loaded. Check your internet connection.',
                               ru: 'SDK Supabase не загрузился. Проверь интернет-соединение.' },
    'cp.err.creds':          { en: 'Please fill in JS/supabase-config.js with your project credentials.',
                               ru: 'Пожалуйста, укажи в JS/supabase-config.js данные твоего проекта.' },
    'cp.err.blocked':        { en: 'You are temporarily blocked from posting. Please try again later.',
                               ru: 'Ты временно не можешь публиковать посты. Попробуй позже.' },
    'cp.err.savefail':       { en: 'Could not save changes:',          ru: 'Не получилось сохранить изменения:' },
    'cp.err.publishfail':    { en: 'Could not publish:',               ru: 'Не получилось опубликовать:' },
    'cp.err.notfound':       { en: 'Post not found — it may have been deleted.',
                               ru: 'Пост не найден — возможно, его удалили.' },
    'cp.err.notowner':       { en: 'You can only edit your own posts.',
                               ru: 'Редактировать можно только свои посты.' },
    'cp.doc.title.edit':     { en: 'Edit post · StillHere',            ru: 'Изменить пост · StillHere' },
    'cp.lang.more':          { en: '+ more…',                          ru: '+ ещё…' },
    'cp.lang.morelangs':     { en: 'More languages',                   ru: 'Ещё языки' },

    /* ── Shared timeAgo strings (feed cards, post header, comments) */
    'time.now':              { en: 'just now',                         ru: 'только что' },
    'time.m':                { en: ' min ago',                         ru: ' мин назад' },
    'time.h':                { en: 'h ago',                            ru: ' ч назад' },
    'time.d':                { en: 'd ago',                            ru: ' д назад' },

    'cp.c1.title':         { en: 'language',                          ru: 'язык' },
    'cp.c1.hint':          { en: 'write in whatever feels native',    ru: 'пиши на том языке, который тебе родной' },

    'cp.c2.title':         { en: 'a title, if it helps',              ru: 'заголовок, если поможет' },
    'cp.c2.sub':           { en: 'a few words, like a margin note. you can skip this.',
                             ru: 'пара слов, как заметка на полях. можно пропустить.' },
    'cp.c2.ph':            { en: 'what\'s on your mind…',             ru: 'что у тебя на душе…' },
    'cp.c2.meta':          { en: 'max 120 characters',                ru: 'максимум 120 символов' },

    'cp.c3.title':         { en: 'your story',                        ru: 'твоя история' },
    'cp.c3.hint':          { en: 'brief or long — both are okay',     ru: 'коротко или подробно — и так и так нормально' },
    'cp.c3.sub':           { en: 'there\'s no wrong way to say what you\'re feeling. write like nobody\'s grading it.',
                             ru: 'нет неправильного способа сказать о том, что чувствуешь. пиши так, будто никто не оценивает.' },

    'cp.c4.title':         { en: 'images or video',                   ru: 'фото или видео' },
    'cp.c4.sub':           { en: 'add up to 6 things — drawings, photos, a song clip. up to 50MB each.',
                             ru: 'до 6 файлов — рисунки, фото, отрывок песни. до 50МБ каждый.' },
    'cp.c4.upload':        { en: 'click to upload, or drag &amp; drop',ru: 'нажми чтобы загрузить, или перетащи' },
    'cp.c4.uphint':        { en: 'images or video · up to 50MB each · max 6',
                             ru: 'фото или видео · до 50МБ каждое · максимум 6' },

    'cp.c5.title':         { en: 'what does it touch on?',            ru: 'о чём это?' },
    'cp.c5.hint':          { en: 'pick what fits — or skip',          ru: 'выбери что подходит — или пропусти' },
    'cp.topic.anxiety':    { en: 'anxiety',                           ru: 'тревога' },
    'cp.topic.depression': { en: 'depression',                        ru: 'депрессия' },
    'cp.topic.relationships':{ en: 'relationships',                   ru: 'отношения' },
    'cp.topic.grief':      { en: 'grief &amp; loss',                  ru: 'горе и утрата' },
    'cp.topic.burnout':    { en: 'burnout',                           ru: 'выгорание' },
    'cp.topic.loneliness': { en: 'loneliness',                        ru: 'одиночество' },
    'cp.topic.trauma':     { en: 'trauma',                            ru: 'травма' },
    'cp.topic.other':      { en: 'other',                             ru: 'другое' },

    'cp.c6.title':         { en: 'what kind of response feels okay?', ru: 'какой ответ тебе подойдёт?' },
    'cp.c6.hint':          { en: 'tell people in advance',            ru: 'предупреди заранее' },
    'cp.mode.support':     { en: 'open to support',                   ru: 'открыт(а) к поддержке' },
    'cp.mode.support.desc':{ en: 'warm words, perspective, a "me too" — all welcome.',
                             ru: 'тёплые слова, взгляд со стороны, «я тоже» — всё подойдёт.' },
    'cp.mode.noadvice':    { en: 'no advice',                         ru: 'без советов' },
    'cp.mode.noadvice.desc':{ en: 'just presence. no fixes, no tips, no "have you tried…"',
                              ru: 'просто быть рядом. без попыток «починить», без подсказок, без «а ты пробовал…»' },

    'cp.c7.title':         { en: 'agreement',                         ru: 'соглашение' },
    'cp.c7.hint':          { en: 'since you\'re posting without an account', ru: 'раз ты публикуешь без аккаунта' },
    'cp.c7.sub':           { en: 'you don\'t need an account to share a story — but we still need to know you\'ve read the small print. it\'s short and human.',
                             ru: 'не нужно аккаунта, чтобы поделиться историей — но нам всё же важно знать, что ты прочитал(а) мелкий шрифт. он короткий и человеческий.' },
    'cp.c7.agree':         { en: 'i\'ve read and i agree to the <a href="docs/html/terms-of-service.html" target="_blank">terms of service</a> and the <a href="docs/html/privacy-policy.html" target="_blank">privacy policy</a>.',
                             ru: 'я прочитал(а) и согласен(а) с <a href="docs/html/terms-of-service.html" target="_blank">условиями использования</a> и <a href="docs/html/privacy-policy.html" target="_blank">политикой конфиденциальности</a>.' },
    'cp.c7.error':         { en: 'please tick the box above to confirm — then your story will publish.',
                             ru: 'пожалуйста, поставь галочку выше — и твоя история опубликуется.' },

    'cp.submit.hint':      { en: 'everything goes through a gentle moderation pass before it\'s published — this keeps the space soft for everyone.',
                             ru: 'всё проходит через мягкую модерацию перед публикацией — это сохраняет пространство добрым для всех.' },
    'cp.submit.cancel':    { en: 'cancel',                            ru: 'отмена' },
    'cp.submit.draft':     { en: 'delete draft',                      ru: 'удалить черновик' },
    'cp.draftdel.title':   { en: 'delete saved draft?',                ru: 'удалить черновик?' },
    'cp.draftdel.desc':    { en: 'your saved text, language, topics and mode will be cleared. this cannot be undone.',
                             ru: 'сохранённый текст, язык, темы и режим будут сброшены. отменить нельзя.' },
    'cp.draftdel.cancel':  { en: 'keep it',                            ru: 'оставить' },
    'cp.draftdel.confirm': { en: 'delete',                             ru: 'удалить' },
    'cp.submit.publish':   { en: 'publish story',                     ru: 'опубликовать историю' },

    /* Sidebar widgets */
    'cp.w.crisis.title':   { en: 'Need Immediate Help?',              ru: 'Нужна срочная помощь?' },
    'cp.w.crisis.text':    { en: 'If you\'re in crisis, please call out:',
                             ru: 'Если тебе сейчас очень тяжело, пожалуйста, обратись:' },
    'cp.w.crisis.btn':     { en: 'Crisis Hotlines',                   ru: 'Линии помощи' },

    'cp.w.ai.title':       { en: 'Need support right now?',           ru: 'Нужна поддержка прямо сейчас?' },
    'cp.w.ai.text':        { en: 'If you\'re going through something difficult, you can talk to our AI support:',
                             ru: 'Если переживаешь что-то трудное, можно поговорить с нашим AI-спутником:' },
    'cp.w.ai.btn':         { en: 'Talk to AI support',                ru: 'Открыть нашего AI-спутника' },

    'cp.w.guide.title':    { en: 'Community Guidelines',              ru: 'Правила сообщества' },
    'cp.w.guide.l1':       { en: 'Be kind and respectful',            ru: 'Будь добрым и уважительным' },
    'cp.w.guide.l2':       { en: 'Respect "No Advice" tags',          ru: 'Уважай тег «без советов»' },
    'cp.w.guide.l3':       { en: 'No medical advice',                 ru: 'Без медицинских советов' },
    'cp.w.guide.l4':       { en: 'Protect anonymity',                 ru: 'Береги анонимность' },
    'cp.w.guide.btn':      { en: 'read full guidelines',              ru: 'читать полные правила' },

    'cp.w.tips.title':     { en: 'Sharing Tips',                      ru: 'Советы по публикации' },
    'cp.w.tips.l1':        { en: 'There\'s no wrong way to share your feelings',
                             ru: 'Нет неправильного способа поделиться чувствами' },
    'cp.w.tips.l2':        { en: 'You can stay completely anonymous', ru: 'Можно остаться полностью анонимным' },
    'cp.w.tips.l3':        { en: 'Use "No Advice" if you just need to vent',
                             ru: 'Используй «без советов», если просто хочется выговориться' },
    'cp.w.tips.l4':        { en: 'Be as brief or detailed as you need',
                             ru: 'Будь настолько коротким или подробным, насколько нужно' },

    'cp.closing.text':     { en: 'whatever you write, <em>it counts.</em>',
                             ru: 'что бы ты ни написал, <em>это важно.</em>' },
    'cp.closing.sub':      { en: '— take your time',                  ru: '— не торопись' },

    /* Dynamic strings from JS/create-post.js — submit button states */
    'cp.btn.checking':     { en: 'Checking…',                         ru: 'Проверяем…' },
    'cp.btn.uploading':    { en: 'Uploading…',                        ru: 'Загружаем…' },
    'cp.btn.publishing':   { en: 'Publishing…',                       ru: 'Публикуем…' },
    'cp.btn.saving':       { en: 'Saving…',                           ru: 'Сохраняем…' },

    /* ── statistics.html ────────────────────────────────── */
    'st.hero.eyebrow':     { en: '<em>—</em> the platform, transparently',
                             ru: '<em>—</em> платформа, прозрачно' },
    'st.hero.title':       { en: 'by the <em>numbers.</em>',           ru: 'в <em>цифрах.</em>' },
    'st.hero.lede':        { en: 'a transparent look at what\'s happening on StillHere — stories shared, support given, languages spoken, topics carried. <em>nothing personal</em>, just totals.',
                             ru: 'прозрачный взгляд на то, что происходит на StillHere — истории, поддержка, языки, темы. <em>ничего личного</em>, только общие числа.' },
    'st.live':             { en: 'live',                              ru: 'в реальном времени' },
    'st.live.label':       { en: 'last refreshed',                    ru: 'обновлено' },

    'st.pres.now':         { en: 'right now',                         ru: 'прямо сейчас' },
    'st.pres.now.label':   { en: 'people on the site',                ru: 'человек на сайте' },
    'st.pres.now.desc':    { en: 'anyone with the site open in the last 5 minutes. counted by anonymous timestamp pings — no IPs, no identifiers stored.',
                             ru: 'все, у кого сайт открыт за последние 5 минут. считаем по анонимным timestamp-пингам — никаких IP, никаких идентификаторов.' },
    'st.pres.total':       { en: 'all-time',                          ru: 'за всё время' },
    'st.pres.total.label': { en: 'total visits',                      ru: 'всего визитов' },
    'st.pres.total.desc':  { en: 'every page open since the counter started. one number, nothing else attached to it.',
                             ru: 'каждое открытие страницы с момента запуска счётчика. одно число, без привязки к чему-либо.' },

    'st.kpi.title':        { en: 'at a glance',                       ru: 'в общем виде' },
    'st.kpi.hint':         { en: 'all-time totals',                   ru: 'за всё время' },
    'st.kpi.members':      { en: 'community members',                 ru: 'участников сообщества' },
    'st.kpi.members.desc': { en: 'people who joined, plus anonymous contributors',
                             ru: 'кто зарегистрировался, плюс анонимные авторы' },
    'st.kpi.stories':      { en: 'stories shared',                    ru: 'историй опубликовано' },
    'st.kpi.stories.desc': { en: 'posts published since launch — each one heard',
                             ru: 'постов с момента запуска — каждый услышан' },
    'st.kpi.responses':    { en: 'support responses',                 ru: 'ответов поддержки' },
    'st.kpi.responses.desc':{ en: 'replies, "me too"s, gentle words back',
                              ru: 'ответы, «я тоже», мягкие слова в ответ' },
    'st.kpi.ai':           { en: 'ai companion sessions',             ru: 'сессий с AI-спутником' },
    'st.kpi.ai.desc':      { en: 'private chats kept on each device — counted here from yours',
                             ru: 'приватные чаты хранятся на каждом устройстве — здесь считаем с твоего' },

    'st.week.title':       { en: 'this week\'s activity',             ru: 'активность за неделю' },
    'st.week.hint':        { en: 'last 7 days',                       ru: 'последние 7 дней' },
    'st.week.posts':       { en: 'new stories',                       ru: 'новых историй' },
    'st.week.comments':    { en: 'new responses',                     ru: 'новых ответов' },
    'st.week.people':      { en: 'new members',                       ru: 'новых участников' },
    'st.week.active':      { en: 'active contributors',               ru: 'активных авторов' },

    'st.growth.title':     { en: 'community growth',                  ru: 'рост сообщества' },
    'st.growth.hint':      { en: 'stories &amp; responses, last 30 days',
                             ru: 'истории и ответы, последние 30 дней' },
    'st.growth.card.title':{ en: 'daily rhythm',                      ru: 'дневной ритм' },
    'st.growth.card.desc': { en: 'when people show up to share &amp; respond',
                             ru: 'когда люди приходят делиться и отвечать' },

    'st.share.title':      { en: 'what people share',                 ru: 'чем делятся люди' },
    'st.share.hint':       { en: 'last 30 days',                      ru: 'последние 30 дней' },
    'st.share.langs':      { en: 'languages',                         ru: 'языки' },
    'st.share.langs.desc': { en: 'people write in whatever feels native',
                             ru: 'каждый пишет на языке, который ему ближе' },
    'st.share.topics':     { en: 'topics',                            ru: 'темы' },
    'st.share.topics.desc':{ en: 'what people most often carry',      ru: 'что люди чаще всего оставляют здесь' },
    'st.loading':          { en: 'loading…',                          ru: 'загрузка…' },

    'st.who.title':        { en: 'who\'s posting',                    ru: 'кто публикует' },
    'st.who.hint':         { en: 'registered &amp; anonymous',        ru: 'зарегистрированные и анонимные' },
    'st.who.split.title':  { en: 'registered vs anonymous',           ru: 'зарегистрированные vs анонимные' },
    'st.who.split.desc':   { en: 'posts by signed-in members vs anonymous contributions',
                             ru: 'посты от зарегистрированных участников vs анонимные публикации' },
    'st.who.registered':   { en: 'registered',                        ru: 'зарегистрированные' },
    'st.who.anonymous':    { en: 'anonymous',                         ru: 'анонимные' },
    'st.who.note':         { en: 'both paths are first-class — you can post without ever creating an account. this split shows how the community actually uses StillHere.',
                             ru: 'оба пути равноценны — можно публиковать вообще не создавая аккаунт. это показывает, как люди на самом деле пользуются StillHere.' },

    'st.ai.eyebrow':       { en: '— ai companion',                    ru: '— AI-спутник' },
    'st.ai.label':         { en: 'conversations on this device',      ru: 'диалогов на этом устройстве' },
    'st.ai.note':          { en: 'ai conversations are stored privately on each device, not on our servers — a deliberate privacy choice. this number is what\'s stored locally where you\'re reading this.',
                             ru: 'AI-диалоги хранятся приватно на каждом устройстве, не на наших серверах — осознанный выбор в пользу приватности. это число — то, что хранится локально на устройстве, с которого ты это читаешь.' },

    'st.engage.title':     { en: 'how the community responds',        ru: 'как сообщество отвечает' },
    'st.engage.hint':      { en: 'engagement signals',                ru: 'сигналы вовлечённости' },
    'st.engage.avg':       { en: 'avg. responses per story',          ru: 'в среднем ответов на историю' },
    'st.engage.avg.desc':  { en: 'how often someone replies when you share',
                             ru: 'как часто кто-то отвечает, когда ты делишься' },
    'st.engage.rate':      { en: 'stories that got a response',       ru: 'историй с ответом' },
    'st.engage.rate.desc': { en: 'share of posts with at least one reply',
                             ru: 'доля постов хотя бы с одним ответом' },
    'st.engage.langs':     { en: 'languages spoken',                  ru: 'языков в использовании' },
    'st.engage.langs.desc':{ en: 'distinct languages used in the last 30 days',
                             ru: 'разных языков за последние 30 дней' },

    'st.closing.text':     { en: 'every number here is <em>someone</em>.',
                             ru: 'каждое число здесь — это <em>кто-то</em>.' },
    'st.closing.sub':      { en: '— that\'s the only thing we count',
                             ru: '— это единственное, что мы считаем' },

    /* Dynamic strings from JS/stats.js */
    'st.updated.prefix':   { en: 'Updated',                           ru: 'Обновлено' },
    'st.empty.data':       { en: 'No data yet',                       ru: 'Пока нет данных' },
    'st.empty.stories':    { en: 'No stories yet',                    ru: 'Пока нет историй' },
    'st.bar.empty':        { en: 'no data yet',                       ru: 'пока нет данных' },
    'st.trend.week':       { en: 'this week',                         ru: 'за эту неделю' },
    'st.author.anon':      { en: 'Anonymous',                         ru: 'Анонимно' },
    'st.post.untitled':    { en: '(untitled)',                        ru: '(без названия)' },
    'st.chart.stories':    { en: 'Stories',                           ru: 'Истории' },
    'st.chart.responses':  { en: 'Responses',                         ru: 'Ответы' },
    'st.time.now':         { en: 'just now',                          ru: 'только что' },
    'st.time.m':           { en: 'm ago',                             ru: ' мин назад' },
    'st.time.h':           { en: 'h ago',                             ru: ' ч назад' },
    'st.time.d':           { en: 'd ago',                             ru: ' д назад' },

    /* ── docs/html — shared chrome ──────────────────────── */
    'dc.meta.version':     { en: 'version',                           ru: 'версия' },
    'dc.meta.revised':     { en: 'revised',                           ru: 'обновлено' },
    'dc.meta.read':        { en: 'read time',                         ru: 'время чтения' },
    'dc.meta.may2026':     { en: 'may 2026',                          ru: 'май 2026' },
    'dc.toc.head':         { en: '— contents',                        ru: '— содержание' },
    'dc.closing.feed':     { en: 'back to feed',                      ru: 'к ленте' },
    'dc.closing.contact':  { en: 'contact us',                        ru: 'связаться с нами' },
    /* Cross-link buttons that appear in closing sections (lowercase
       to match the doc tone — distinct from sentence-cased footer keys). */
    'dc.btn.guidelines':   { en: 'community guidelines',              ru: 'правила сообщества' },
    'dc.btn.privacy':      { en: 'privacy policy',                    ru: 'политика конфиденциальности' },
    'dc.btn.terms':        { en: 'terms of service',                  ru: 'условия использования' },

    /* ── docs/html/guidelines.html ──────────────────────── */
    'dc.gl.eyebrow':       { en: '<em>—</em> community guidelines',   ru: '<em>—</em> правила сообщества' },
    'dc.gl.title':         { en: 'the rules, <span class="doc-title-tail"><em>gently.</em></span>',
                             ru: 'правила, <span class="doc-title-tail"><em>мягко.</em></span>' },
    'dc.gl.lede':          { en: 'a few small things that keep this space <em>kind</em>. mostly common sense — but written down so we can agree on what "kind" looks like here.',
                             ru: 'несколько маленьких вещей, которые делают это место <em>добрым</em>. в основном здравый смысл — но записано, чтобы мы все понимали, что «доброе» означает здесь.' },
    'dc.gl.read.value':    { en: '~5 min',                            ru: '~5 мин' },
    'dc.gl.s1.title':      { en: 'be kind &amp; respectful',          ru: 'будь добрым и уважительным' },
    'dc.gl.s1.hint':       { en: 'the only real rule',                ru: 'единственное настоящее правило' },
    'dc.gl.s2.title':      { en: 'respect "no advice"',               ru: 'уважай «без советов»' },
    'dc.gl.s3.title':      { en: 'protect anonymity',                 ru: 'оберегай анонимность' },
    'dc.gl.s3.hint':       { en: 'yours and others\'',                ru: 'свою и чужую' },
    'dc.gl.s4.title':      { en: 'no medical advice',                 ru: 'без медицинских советов' },
    'dc.gl.s5.title':      { en: 'prohibited content',                ru: 'запрещённый контент' },
    'dc.gl.s6.title':      { en: 'self-harm &amp; crisis',            ru: 'самоповреждение и тяжелое состояние' },
    'dc.gl.s7.title':      { en: 'how to respond well',               ru: 'как хорошо отвечать' },
    'dc.gl.s7.hint':       { en: 'a quick guide',                     ru: 'краткое руководство' },
    'dc.gl.s8.title':      { en: 'reporting &amp; consequences',      ru: 'жалобы и последствия' },

    /* ── Guidelines — full prose bodies. Each value contains the
       complete content of that section's `.doc-prose` block (rich HTML
       allowed via innerHTML). EN values mirror the original; RU is
       the translation. ───────────────────────────────────────────── */
    'dc.gl.s1.body':       {
      en: '<p>people come here when something hard is happening. treat every story like it\'s the most courageous thing that person did this week — because often, <strong>it is</strong>.</p>' +
          '<p>that means:</p>' +
          '<ul>' +
            '<li><strong>no insults, mocking, or "well actually"-ing</strong> someone\'s pain.</li>' +
            '<li><strong>no minimizing</strong> ("it could be worse", "be grateful", "others have it harder") — even if true, it isn\'t useful.</li>' +
            '<li><strong>no debating</strong> someone\'s experience. you can disagree with an idea without invalidating a feeling.</li>' +
          '</ul>' +
          '<p>if you\'re not sure whether something would land well — <em>it probably won\'t</em>. ask yourself: would i say this to a friend at their kitchen table at 2am?</p>',
      ru: '<p>люди приходят сюда, когда происходит что-то тяжёлое. относись к каждой истории как к самому смелому, что этот человек сделал за неделю — потому что часто <strong>так и есть</strong>.</p>' +
          '<p>это значит:</p>' +
          '<ul>' +
            '<li><strong>никаких оскорблений, насмешек или «вообще-то…»</strong> по поводу чужой боли.</li>' +
            '<li><strong>никаких «могло быть хуже»</strong> («скажи спасибо», «у других тяжелее») — даже если это правда, это не помогает.</li>' +
            '<li><strong>никаких споров</strong> о чужом опыте. можно не соглашаться с мыслью, не обесценивая чувство.</li>' +
          '</ul>' +
          '<p>если не уверен, зайдёт ли — <em>скорее всего нет</em>. спроси себя: сказал бы я это другу за кухонным столом в 2 ночи?</p>'
    },
    'dc.gl.s2.body':       {
      en: '<p>when someone tags their post <strong>"no advice"</strong>, that\'s a request to <em>be witnessed, not fixed</em>. respect it.</p>' +
          '<h3>what counts as advice on a "no advice" post?</h3>' +
          '<ul>' +
            '<li>suggesting therapy, meditation, exercise, a book, a podcast.</li>' +
            '<li>recommending products, apps, supplements, breathing techniques.</li>' +
            '<li>"have you tried …" or "you should …"</li>' +
            '<li>silver-lining reframes ("at least you have …")</li>' +
          '</ul>' +
          '<h3>what\'s still okay</h3>' +
          '<ul>' +
            '<li>simply acknowledging: <em>"i hear you"</em>, <em>"that sounds really hard"</em>, <em>"thank you for sharing this"</em>.</li>' +
            '<li>sharing your own related experience without making it a lesson.</li>' +
            '<li>the heart / support button — always.</li>' +
          '</ul>' +
          '<div class="doc-note"><strong>tip —</strong> if you have advice to give and someone didn\'t ask, you can write your own post about your strategies. people looking for tips will find them there.</div>',
      ru: '<p>когда кто-то ставит на пост тег <strong>«без советов»</strong>, это просьба <em>быть услышанным, а не починенным</em>. уважай её.</p>' +
          '<h3>что считается советом на посте «без советов»?</h3>' +
          '<ul>' +
            '<li>предлагать терапию, медитацию, спорт, книгу, подкаст.</li>' +
            '<li>рекомендовать товары, приложения, добавки, дыхательные техники.</li>' +
            '<li>«а ты пробовал…» или «тебе стоит…»</li>' +
            '<li>сводить к “зато…” («у тебя хотя бы есть…»)</li>' +
          '</ul>' +
          '<h3>что всё ещё подходит</h3>' +
          '<ul>' +
            '<li>просто признать: <em>«я слышу тебя»</em>, <em>«это звучит правда тяжело»</em>, <em>«спасибо, что поделился»</em>.</li>' +
            '<li>поделиться своим похожим опытом, не превращая его в урок.</li>' +
            '<li>кнопка «поддержать» / сердечко — всегда.</li>' +
          '</ul>' +
          '<div class="doc-note"><strong>совет —</strong> если у тебя есть советы, а тебя не просили, напиши свой пост со своими стратегиями. те, кто ищет советы, найдут его там.</div>'
    },
    'dc.gl.s3.body':       {
      en: '<p>anonymity is the foundation of this place. don\'t break it for anyone.</p>' +
          '<ul>' +
            '<li><strong>don\'t dox</strong> — no real names, addresses, workplaces, phone numbers, schools, or social-media handles. yours or anyone else\'s.</li>' +
            '<li><strong>don\'t link external profiles</strong> in posts or replies.</li>' +
            '<li><strong>don\'t ask</strong> "what\'s your real name?" / "where do you live?" — even gently.</li>' +
            '<li>if you screenshot a post (for crisis reporting only), <strong>blur or remove the handle</strong>.</li>' +
          '</ul>' +
          '<h3>a note on screenshots</h3>' +
          '<p>please don\'t screenshot stories for jokes, "look at this" posts, or to share outside the platform. <em>this is a closed circle on purpose</em>.</p>',
      ru: '<p>анонимность — фундамент этого места. не нарушай её ни для кого.</p>' +
          '<ul>' +
            '<li><strong>никакого доксинга</strong> — никаких настоящих имён, адресов, мест работы, телефонов, школ или ссылок на соцсети. ни своих, ни чужих.</li>' +
            '<li><strong>не давай ссылки</strong> на внешние профили в постах или ответах.</li>' +
            '<li><strong>не спрашивай</strong> «как тебя на самом деле зовут?» / «где ты живёшь?» — даже мягко.</li>' +
            '<li>если делаешь скриншот поста (только для жалобы в тяжелой ситуации), <strong>замажь или вырежи ник</strong>.</li>' +
          '</ul>' +
          '<h3>про скриншоты</h3>' +
          '<p>пожалуйста, не делай скриншоты историй ради шутки, постов «вот посмотри» или чтобы поделиться вне платформы. <em>это закрытый круг по замыслу</em>.</p>'
    },
    'dc.gl.s4.body':       {
      en: '<p>we\'re peers, not professionals.</p>' +
          '<ul>' +
            '<li><strong>no diagnosing</strong> ("sounds like you have …").</li>' +
            '<li><strong>no prescribing</strong> medications, dosages, or supplement stacks.</li>' +
            '<li><strong>no advising people to stop or change their treatment.</strong> this one is serious — encouraging someone to drop their meds can cause real harm.</li>' +
          '</ul>' +
          '<p>you can share <em>your</em> experience with a diagnosis, treatment, or therapist — just don\'t extrapolate it into instructions for someone else.</p>',
      ru: '<p>мы — равные, не профессионалы.</p>' +
          '<ul>' +
            '<li><strong>никаких диагнозов</strong> («похоже, у тебя…»).</li>' +
            '<li><strong>никаких назначений</strong> лекарств, дозировок, схем добавок.</li>' +
            '<li><strong>не советуй людям бросать или менять лечение.</strong> это серьёзно — уговорить кого-то бросить таблетки может реально навредить.</li>' +
          '</ul>' +
          '<p>можно делиться <em>своим</em> опытом с диагнозом, лечением или терапевтом — просто не превращай это в инструкцию для другого.</p>'
    },
    'dc.gl.s5.body':       {
      en: '<p>removed on sight, no warnings, no negotiation:</p>' +
          '<div class="doc-chips">' +
            '<span class="doc-chip doc-chip--bad">harassment</span>' +
            '<span class="doc-chip doc-chip--bad">hate speech</span>' +
            '<span class="doc-chip doc-chip--bad">slurs</span>' +
            '<span class="doc-chip doc-chip--bad">threats</span>' +
            '<span class="doc-chip doc-chip--bad">sexual content</span>' +
            '<span class="doc-chip doc-chip--bad">non-consensual nudity</span>' +
            '<span class="doc-chip doc-chip--bad">violent imagery</span>' +
            '<span class="doc-chip doc-chip--bad">illegal activity</span>' +
            '<span class="doc-chip doc-chip--bad">spam / promotion</span>' +
            '<span class="doc-chip doc-chip--bad">"sell me your e-book"</span>' +
          '</div>' +
          '<p>any of these will end your access. no second chances on this one.</p>',
      ru: '<p>удаляется сразу, без предупреждений, без переговоров:</p>' +
          '<div class="doc-chips">' +
            '<span class="doc-chip doc-chip--bad">травля</span>' +
            '<span class="doc-chip doc-chip--bad">язык ненависти</span>' +
            '<span class="doc-chip doc-chip--bad">оскорбления</span>' +
            '<span class="doc-chip doc-chip--bad">угрозы</span>' +
            '<span class="doc-chip doc-chip--bad">сексуальный контент</span>' +
            '<span class="doc-chip doc-chip--bad">обнажение без согласия</span>' +
            '<span class="doc-chip doc-chip--bad">сцены насилия</span>' +
            '<span class="doc-chip doc-chip--bad">незаконная деятельность</span>' +
            '<span class="doc-chip doc-chip--bad">спам / реклама</span>' +
            '<span class="doc-chip doc-chip--bad">«купи мою книгу»</span>' +
          '</div>' +
          '<p>что-то из этого — и доступ заканчивается. без вторых шансов в этом пункте.</p>'
    },
    'dc.gl.s6.alert.head': { en: 'this is the most important section',
                             ru: 'это самый важный раздел' },
    'dc.gl.s6.alert':      {
      en: '<p><strong>StillHere is not an emergency service.</strong> if you or someone else is in immediate danger, please call a trained crisis counselor — <a href="crisis-resources.html">our crisis-resources page</a> has free 24/7 numbers by country.</p>',
      ru: '<p><strong>StillHere — не служба экстренной помощи.</strong> если ты или кто-то рядом в непосредственной опасности, пожалуйста, позвони обученному консультанту кризисной поддержки — <a href="crisis-resources.html">наша страница линий помощи</a> содержит бесплатные номера 24/7 по странам.</p>'
    },
    'dc.gl.s6.body':       {
      en: '<h3>what\'s specifically prohibited</h3>' +
          '<ul>' +
            '<li>any content <strong>encouraging</strong> self-harm or suicide.</li>' +
            '<li>step-by-step descriptions of methods.</li>' +
            '<li>"pact" posts looking for partners.</li>' +
            '<li>romanticizing self-harm.</li>' +
          '</ul>' +
          '<h3>what\'s okay (and even welcome)</h3>' +
          '<ul>' +
            '<li>sharing that you\'re struggling, without details about method or means.</li>' +
            '<li>asking for support, witnessing, presence.</li>' +
            '<li>talking about recovery, setbacks, what\'s helped or hurt.</li>' +
          '</ul>' +
          '<h3>if you see someone in crisis</h3>' +
          '<ul>' +
            '<li><strong>respond gently</strong> — even just "i\'m here, i hear you" matters.</li>' +
            '<li><strong>share crisis resources</strong> — point them to <a href="crisis-resources.html">free 24/7 lines</a>.</li>' +
            '<li><strong>report the post</strong> using the report button — we\'ll look at it within hours, not days.</li>' +
          '</ul>',
      ru: '<h3>что конкретно запрещено</h3>' +
          '<ul>' +
            '<li>любой контент, <strong>побуждающий</strong> к самоповреждению или суициду.</li>' +
            '<li>пошаговые описания способов.</li>' +
            '<li>посты-«пакты» в поисках напарника.</li>' +
            '<li>романтизация самоповреждения.</li>' +
          '</ul>' +
          '<h3>что подходит (и даже приветствуется)</h3>' +
          '<ul>' +
            '<li>рассказать, что тебе тяжело — без подробностей о способах и средствах.</li>' +
            '<li>попросить о поддержке, о том что бы быть понятым, или просто побыть рядом.</li>' +
            '<li>говорить о восстановлении, срывах, что помогало или ранило.</li>' +
          '</ul>' +
          '<h3>если видишь, что кто-то срочно нуждается в помощи</h3>' +
          '<ul>' +
            '<li><strong>ответь мягко</strong> — даже «я здесь, я слышу тебя» — это уже важно.</li>' +
            '<li><strong>поделись линиями помощи</strong> — направь к <a href="crisis-resources.html">бесплатным линиям 24/7</a>.</li>' +
            '<li><strong>пожалуйся на пост</strong> через кнопку report — мы посмотрим в течение часов, не дней.</li>' +
          '</ul>'
    },
    'dc.gl.s7.body':       {
      en: '<p>good responses don\'t have to be long, smart, or polished. some patterns that work:</p>' +
          '<h3>say what you noticed</h3>' +
          '<ul>' +
            '<li><em>"that sounds exhausting."</em></li>' +
            '<li><em>"the part about __ really landed for me."</em></li>' +
          '</ul>' +
          '<h3>share without making it about you</h3>' +
          '<ul>' +
            '<li><em>"i went through something similar last year — you\'re not the only one."</em></li>' +
          '</ul>' +
          '<h3>just be present</h3>' +
          '<ul>' +
            '<li><em>"i don\'t have words but i read it. thank you for sharing."</em></li>' +
          '</ul>' +
          '<h3>avoid</h3>' +
          '<ul>' +
            '<li><em>"have you tried …"</em></li>' +
            '<li><em>"it could be worse."</em></li>' +
            '<li><em>"everything happens for a reason."</em></li>' +
            '<li><em>"praying for you 🙏"</em> — unless the OP shared a faith.</li>' +
          '</ul>',
      ru: '<p>хорошие ответы не должны быть длинными, умными или отточенными. вот рабочие шаблоны:</p>' +
          '<h3>скажи что заметил</h3>' +
          '<ul>' +
            '<li><em>«это звучит изматывающе.»</em></li>' +
            '<li><em>«часть про __ меня правда зацепила.»</em></li>' +
          '</ul>' +
          '<h3>поделись, не делая это про себя</h3>' +
          '<ul>' +
            '<li><em>«я проходил через похожее в прошлом году — ты не один.»</em></li>' +
          '</ul>' +
          '<h3>просто будь рядом</h3>' +
          '<ul>' +
            '<li><em>«у меня нет слов, но я прочитал. спасибо что поделился.»</em></li>' +
          '</ul>' +
          '<h3>избегай</h3>' +
          '<ul>' +
            '<li><em>«а ты пробовал…»</em></li>' +
            '<li><em>«могло быть и хуже.»</em></li>' +
            '<li><em>«всё происходит по какой-то причине.»</em></li>' +
            '<li><em>«молюсь за тебя 🙏»</em> — если только автор сам не упомянул веру.</li>' +
          '</ul>'
    },
    'dc.gl.s8.body':       {
      en: '<h3>how to report</h3>' +
          '<p>every post and comment has a three-dot menu with a <strong>report</strong> option. one click. we get a notification. reports are anonymous to the person being reported.</p>' +
          '<h3>what happens next</h3>' +
          '<ol>' +
            '<li>we look at it — usually within 24 hours, faster for crisis flags.</li>' +
            '<li>if it breaks a rule, it\'s removed.</li>' +
            '<li>for serious or repeated violations, the account is suspended or banned.</li>' +
            '<li>bans for prohibited content (section 05) are permanent.</li>' +
          '</ol>' +
          '<h3>appeals</h3>' +
          '<p>if you think we got it wrong, write to <a href="mailto:support@stillhere.app">support@stillhere.app</a> with what happened. we read every email — this is a one-person project, not a queue, so a real human will respond.</p>',
      ru: '<h3>как пожаловаться</h3>' +
          '<p>у каждого поста и комментария есть меню три-точки с пунктом <strong>«пожаловаться»</strong>. один клик. мы получаем уведомление. жалобы анонимны для того, на кого жалуются.</p>' +
          '<h3>что будет дальше</h3>' +
          '<ol>' +
            '<li>мы смотрим — обычно в течение 24 часов, быстрее для кризисных меток.</li>' +
            '<li>если нарушает правило — удаляется.</li>' +
            '<li>при серьёзных или повторяющихся нарушениях аккаунт приостанавливается или банится.</li>' +
            '<li>баны за запрещённый контент (раздел 05) — постоянные.</li>' +
          '</ol>' +
          '<h3>апелляции</h3>' +
          '<p>если думаешь, что мы ошиблись, напиши на <a href="mailto:support@stillhere.app">support@stillhere.app</a> с тем, что произошло. мы читаем каждое письмо — это проект одного человека, не очередь, поэтому ответит живой человек.</p>'
    },

    'dc.gl.closing.title': { en: 'these aren\'t <em>rules</em>, they\'re a request.',
                             ru: 'это не <em>правила</em>, это просьба.' },
    'dc.gl.closing.text':  { en: 'the platform works because most people, most of the time, choose to show up kindly. thank you for being one of them.',
                             ru: 'платформа работает, потому что большинство людей, в большинстве случаев, выбирают приходить сюда по-доброму. спасибо, что ты один из них.' },

    /* ── docs/html/privacy-policy.html ──────────────────── */
    'dc.pp.eyebrow':       { en: '<em>—</em> privacy policy',         ru: '<em>—</em> политика конфиденциальности' },
    'dc.pp.title':         { en: 'your data, <em>your <span class="doc-title-tail">call.</span></em>',
                             ru: 'твои данные, <em>твоё <span class="doc-title-tail">решение.</span></em>' },
    'dc.pp.lede':          { en: 'StillHere is one person\'s project. there\'s no ad team, no data buyer, no analytics empire. <em>this is what we actually do with what you share</em>.',
                             ru: 'StillHere — проект одного человека. нет рекламной команды, нет покупателей данных, нет аналитической империи. <em>вот что мы реально делаем с тем, чем ты делишься</em>.' },

    /* "Short version" callout at the top */
    'dc.pp.callout.head':  { en: '— the short version',               ru: '— коротко' },
    'dc.pp.callout.body':  {
      en: '<ul>' +
            '<li>your handle &amp; a hashed password are stored. <strong>no email, no phone, no real name.</strong></li>' +
            '<li>your posts, comments &amp; saves are stored so the site can show them back to you.</li>' +
            '<li>ai conversations live on <strong>your device only</strong> — we never see them.</li>' +
            '<li>nothing is sold, profiled, or used to train ai.</li>' +
            '<li>you can delete everything, anytime. the button works.</li>' +
          '</ul>',
      ru: '<ul>' +
            '<li>сохраняются твой ник и хэш пароля. <strong>никакого email, телефона, настоящего имени.</strong></li>' +
            '<li>твои посты, комментарии и сохранения хранятся, чтобы сайт мог показать их тебе обратно.</li>' +
            '<li>AI-диалоги живут <strong>только на твоём устройстве</strong> — мы их никогда не видим.</li>' +
            '<li>ничего не продаётся, не используется для профилирования, не используется для обучения AI.</li>' +
            '<li>можно удалить всё в любой момент. кнопка реально работает.</li>' +
          '</ul>'
    },

    /* Section 01 — who we are */
    'dc.pp.s1.body':       {
      en: '<p>StillHere is a <strong>solo project</strong> — one person making and maintaining a small mental-health platform. there\'s no parent company, no investors, no data-monetization model. when this policy says "we", that\'s mostly just one human.</p>' +
          '<p>that means the lawyer-grade vocabulary of typical privacy policies doesn\'t really fit, so the rest of this is plain language.</p>',
      ru: '<p>StillHere — <strong>сольный проект</strong>: один человек делает и поддерживает небольшую платформу про ментальное здоровье. нет материнской компании, нет инвесторов, нет модели монетизации данных. когда этот документ говорит «мы» — это в основном один живой человек.</p>' +
          '<p>значит, юридический язык типичных политик здесь не подходит. всё остальное — нормальным языком.</p>'
    },

    /* Section 02 — what we collect */
    'dc.pp.s2.body':       {
      en: '<h3>account</h3>' +
          '<ul>' +
            '<li>your <strong>handle</strong> (the @name you picked).</li>' +
            '<li>your <strong>password</strong> — stored as an irreversible hash. we cannot read it, even if we wanted to.</li>' +
            '<li>optionally: a <strong>display name</strong>, <strong>avatar image</strong> you add.</li>' +
            '<li>the <strong>timestamp</strong> of when you joined.</li>' +
          '</ul>' +
          '<h3>activity</h3>' +
          '<ul>' +
            '<li>posts you write (title, body, language, topics, mode tag, attached images/videos).</li>' +
            '<li>comments you write.</li>' +
            '<li>the "I\’m here" hearts you give.</li>' +
            '<li>the posts you save (a per-account bookmark list).</li>' +
          '</ul>' +
          '<h3>technical</h3>' +
          '<ul>' +
            '<li>basic web-server logs from our host (request, time, IP) — kept short-term for security.</li>' +
            '<li>when you <strong>publish a post or comment</strong>, we store two extra fields alongside it: the request IP and a random per-browser identifier we put in your <code>localStorage</code>. these are only used to enforce a temporary block if a moderator pauses an account that\'s been breaking the guidelines. they are not used for tracking, profiling, or advertising.</li>' +
            '<li>no cookies are set by StillHere apart from the auth session token. no advanced fingerprinting (no canvas hashes, no font enumeration, no advertising ID).</li>' +
          '</ul>' +
          '<h3>aggregate analytics</h3>' +
          '<p>we use three privacy-respecting counters to understand site traffic and keep the site fast. <strong>none of them see the content of your posts, your handle, your account id, or what you type.</strong> they only know that <em>a browser</em> opened <em>a page</em>.</p>' +
          '<ul>' +
            '<li><strong>Vercel Web Analytics</strong> — counts page views and unique visitors, aggregated to numbers like "this article had 200 reads this week". no cookies, no localStorage, no persistent identifiers. Vercel hashes the request to deduplicate visits within a 24-hour window and discards the hash afterwards.</li>' +
            '<li><strong>Vercel Speed Insights</strong> — collects only Core Web Vitals (page-load time, largest-contentful-paint, layout shift, interaction-to-next-paint) so we can tell when a page is slow. no cookies, no identifiers, performance numbers only.</li>' +
          '</ul>' +
          '<p>we deliberately do <strong>not</strong> use Google Analytics, Facebook Pixel, Segment, Mixpanel, or any other behavioural analytics tool. a standard content-blocker (uBlock Origin, Brave shield, Firefox strict mode) blocks the Vercel scripts, and we don\'t try to circumvent that — the site works identically with or without them loaded.</p>',
      ru: '<h3>аккаунт</h3>' +
          '<ul>' +
            '<li>твой <strong>ник</strong> (@-имя, которое ты выбрал).</li>' +
            '<li>твой <strong>пароль</strong> — хранится как необратимый хэш. мы не можем его прочитать, даже если бы захотели.</li>' +
            '<li>опционально: <strong>отображаемое имя</strong>, <strong>аватар</strong> который ты добавил.</li>' +
            '<li><strong>метка времени</strong> когда ты зарегистрировался.</li>' +
          '</ul>' +
          '<h3>активность</h3>' +
          '<ul>' +
            '<li>посты, которые ты пишешь (заголовок, текст, язык, темы, тег режима, прикреплённые фото/видео).</li>' +
            '<li>комментарии, которые ты пишешь.</li>' +
            '<li>сердечки "Я рядом", которые ты ставишь.</li>' +
            '<li>посты, которые ты сохраняешь (список закладок по аккаунту).</li>' +
          '</ul>' +
          '<h3>технические данные</h3>' +
          '<ul>' +
            '<li>базовые логи веб-сервера от нашего хостинга (запрос, время, IP) — хранятся кратко, ради безопасности.</li>' +
            '<li>когда ты <strong>публикуешь пост или комментарий</strong>, рядом сохраняются два дополнительных поля: IP запроса и случайный per-browser идентификатор в твоём <code>localStorage</code>. они нужны только для того, чтобы временный бан реально работал, если модератор приостанавливает аккаунт за нарушения. не используются для отслеживания, профилирования или рекламы.</li>' +
            '<li>StillHere не ставит cookies кроме токена сессии. никакого продвинутого фингерпринтинга (нет canvas-хэшей, перечисления шрифтов, рекламного ID).</li>' +
          '</ul>' +
          '<h3>агрегированная аналитика</h3>' +
          '<p>используем три privacy-respecting счётчика, чтобы понимать трафик и держать сайт быстрым. <strong>ни один из них не видит содержание твоих постов, твой ник, ID аккаунта или то, что ты печатаешь.</strong> они знают только, что <em>браузер</em> открыл <em>страницу</em>.</p>' +
          '<ul>' +
            '<li><strong>Vercel Web Analytics</strong> — считает просмотры страниц и уникальных посетителей, агрегирует в числа типа «эту статью прочитали 200 раз за неделю». без cookies, без localStorage, без постоянных идентификаторов. Vercel хэширует запрос для дедупликации в окне 24 часа и потом этот хэш выбрасывает.</li>' +
            '<li><strong>Vercel Speed Insights</strong> — собирает только Core Web Vitals (время загрузки, LCP, layout shift, interaction-to-next-paint), чтобы видеть когда страница тормозит. без cookies, без идентификаторов, только перфоманс-метрики.</li>' +
          '</ul>' +
          '<p>мы намеренно <strong>не используем</strong> Google Analytics, Facebook Pixel, Segment, Mixpanel или любой другой инструмент поведенческой аналитики. стандартный блокировщик контента (uBlock Origin, Brave shield, Firefox strict mode) блокирует скрипты Vercel — мы не пытаемся это обойти, сайт работает одинаково с ними и без них.</p>'
    },

    /* Section 03 — what we don't collect */
    'dc.pp.s3.body':       {
      en: '<ul>' +
            '<li><strong>no email or phone number.</strong> we don\'t ask for them. you don\'t have to give one.</li>' +
            '<li><strong>no real name.</strong> the handle is the only identifier.</li>' +
            '<li><strong>no precise location.</strong> we never geo-locate you — your IP is stored only as an opaque value for the block list described in section 02, and never resolved to a city or coordinates.</li>' +
            '<li><strong>no advanced device fingerprinting</strong> (no canvas hashes, no font enumeration, no advertising ID). the only "fingerprint" we keep is a random string we generated in your browser the first time you posted — you can wipe it any time by clearing site data.</li>' +
            '<li><strong>no third-party trackers.</strong> no facebook pixel, no google analytics, no segment, no mixpanel. the only outbound telemetry is anonymous performance metrics described in section 02.</li>' +
            '<li><strong>no behavioural profiling</strong> for advertising or "engagement". the feed is chronological by design.</li>' +
          '</ul>',
      ru: '<ul>' +
            '<li><strong>никакого email или телефона.</strong> мы их не спрашиваем. ты не обязан давать.</li>' +
            '<li><strong>никакого настоящего имени.</strong> ник — единственный идентификатор.</li>' +
            '<li><strong>никакой точной геолокации.</strong> мы никогда не определяем твоё местоположение — IP хранится только как opaque-значение для блок-листа из раздела 02 и никогда не превращается в город или координаты.</li>' +
            '<li><strong>никакого продвинутого фингерпринтинга устройства</strong> (нет canvas-хэшей, перечисления шрифтов, рекламного ID). единственный «фингерпринт», который мы храним — случайная строка, сгенерированная в твоём браузере при первой публикации; стереть её можно очисткой данных сайта.</li>' +
            '<li><strong>никаких сторонних трекеров.</strong> ни facebook pixel, ни google analytics, ни segment, ни mixpanel. единственная исходящая телеметрия — анонимные перфоманс-метрики из раздела 02.</li>' +
            '<li><strong>никакого поведенческого профилирования</strong> ради рекламы или «вовлечённости». лента — хронологическая, by design.</li>' +
          '</ul>'
    },

    /* Section 04 — anonymity, on purpose */
    'dc.pp.s4.body':       {
      en: '<p>your handle is the only public thing about you, and it doesn\'t need to relate to your real identity. if you pick something neutral, you are <em>effectively anonymous</em> on the site.</p>' +
          '<p>that said — here\'s how we think about anonymity honestly:</p>' +
          '<ul>' +
            '<li>your posts are linked to your handle internally (so you can edit or delete them later).</li>' +
            '<li>if you put your real name in a post, that\'s public. we don\'t scan or hide it.</li>' +
            '<li>if you reuse the same handle elsewhere on the internet, someone could connect them. we can\'t prevent that.</li>' +
            '<li>if you screenshot your own post and share it, the screenshot exists outside this site. we have no control over it.</li>' +
            '<li>posting "anonymously" (without an account) is still tied to your request IP and a random browser identifier so that blocks can be enforced. those values stay inside our database and are not used to identify <em>who</em> you are — only to recognise the same device/connection across submissions.</li>' +
          '</ul>' +
          '<div class="doc-note"><strong>tip —</strong> if you really want maximum anonymity, use a fresh handle here that you don\'t use anywhere else, and post from a network you\'re comfortable with.</div>',
      ru: '<p>твой ник — единственное, что публично; он не обязан быть связан с твоей реальной личностью. если выберешь нейтральное — на сайте ты <em>фактически анонимен</em>.</p>' +
          '<p>тем не менее, вот честный взгляд на анонимность:</p>' +
          '<ul>' +
            '<li>твои посты внутри привязаны к твоему нику (чтобы ты потом мог их редактировать или удалять).</li>' +
            '<li>если в пост ты напишешь своё настоящее имя — оно станет публичным. мы не сканируем и не прячем такое.</li>' +
            '<li>если используешь один и тот же ник где-то ещё в интернете, кто-то может связать. мы не можем это предотвратить.</li>' +
            '<li>если делаешь скриншот собственного поста и где-то его публикуешь — скриншот живёт вне сайта, мы за него не отвечаем.</li>' +
            '<li>публикация «анонимно» (без аккаунта) всё равно привязана к IP запроса и случайному идентификатору браузера, чтобы баны работали. эти значения живут внутри нашей БД и не используются чтобы понять <em>кто</em> ты — только чтобы распознать то же устройство/соединение между публикациями.</li>' +
          '</ul>' +
          '<div class="doc-note"><strong>совет —</strong> если хочешь максимальной анонимности — заведи здесь свежий ник, который нигде больше не использовал, и публикуй из сети, в которой тебе спокойно.</div>'
    },

    /* Section 05 — AI conversations */
    'dc.pp.s5.body':       {
      en: '<p>the ai companion is the most private feature on the site. how it works:</p>' +
          '<ol>' +
            '<li>your messages are sent through an edge function we host (it holds the model api key, so your browser never sees it).</li>' +
            '<li>the model provider receives your message <strong>without your handle, account id, or any identifier</strong>.</li>' +
            '<li>the conversation is stored <strong>in your browser\'s localStorage</strong> — not on our servers.</li>' +
            '<li>if you switch devices or clear your browser data, those conversations are gone. that\'s the trade-off — privacy over portability.</li>' +
          '</ol>' +
          '<p>we work with a model provider that operates under a <strong>zero data retention</strong> policy — they don\'t keep your prompts after responding.</p>',
      ru: '<p>AI-спутник — самая приватная функция на сайте. как она работает:</p>' +
          '<ol>' +
            '<li>твои сообщения идут через нашу edge-функцию (она держит ключ API модели, в браузере ключа нет).</li>' +
            '<li>провайдер модели получает твоё сообщение <strong>без твоего ника, ID аккаунта или любого идентификатора</strong>.</li>' +
            '<li>диалог хранится <strong>в localStorage твоего браузера</strong> — не на наших серверах.</li>' +
            '<li>если сменишь устройство или очистишь данные браузера — эти диалоги пропадут. это компромисс: приватность вместо переносимости.</li>' +
          '</ol>' +
          '<p>мы работаем с провайдером модели, у которого политика <strong>zero data retention</strong> — они не хранят твои запросы после ответа.</p>'
    },

    /* Section 06 — third parties */
    'dc.pp.s6.body':       {
      en: '<p>StillHere can\'t run on nothing. it relies on three vendors:</p>' +
          '<ul>' +
            '<li><strong>Supabase</strong> — our database &amp; authentication backend (where your handle, password hash, posts, comments live). they process this data on our behalf.</li>' +
            '<li><strong>An AI gateway</strong> — proxies ai chat requests with zero data retention. they see only your message text, not who you are.</li>' +
            '<li><strong>Vercel</strong> — hosts the website itself and provides <em>Speed Insights</em> + <em>Web Analytics</em> (anonymous page-view counts and Core Web Vitals). their servers log standard request data for a few days; both analytics tools are described in section 02.</li>' +
          '</ul>' +
          '<p>that\'s the full list. <em>nothing else</em>. no behavioural analytics vendor, no error-tracking saas, no email service, no advertising network.</p>',
      ru: '<p>StillHere не может работать на пустом месте. он опирается на три сервиса:</p>' +
          '<ul>' +
            '<li><strong>Supabase</strong> — наш бэкенд для БД и авторизации (там живут твой ник, хэш пароля, посты, комментарии). они обрабатывают эти данные от нашего имени.</li>' +
            '<li><strong>AI-шлюз</strong> — проксирует AI-чат с zero data retention. видит только текст твоего сообщения, не знает кто ты.</li>' +
            '<li><strong>Vercel</strong> — хостит сам сайт и даёт <em>Speed Insights</em> + <em>Web Analytics</em> (анонимные счётчики просмотров и Core Web Vitals). их серверы логируют стандартные запросы несколько дней; оба инструмента описаны в разделе 02.</li>' +
          '</ul>' +
          '<p>это полный список. <em>больше ничего</em>. ни поведенческой аналитики, ни SaaS для трекинга ошибок, ни email-сервиса, ни рекламной сети.</p>'
    },

    /* Section 07 — data retention */
    'dc.pp.s7.body':       {
      en: '<p>simple rules:</p>' +
          '<ul>' +
            '<li>your account and content stay <strong>until you delete them</strong>. there\'s no automatic expiry.</li>' +
            '<li>deleted posts and comments are removed from the database within a few minutes (no soft-delete, no shadow copy).</li>' +
            '<li>when you delete your account, your profile row is anonymized; your posts become "anonymous". if you also click "delete all my posts" first, they\'re gone entirely.</li>' +
            '<li>web-server access logs are kept by our host for a few days for security, then purged.</li>' +
          '</ul>',
      ru: '<p>простые правила:</p>' +
          '<ul>' +
            '<li>твой аккаунт и контент живут <strong>пока ты их не удалишь</strong>. автоматического срока нет.</li>' +
            '<li>удалённые посты и комментарии уходят из БД за несколько минут (без soft-delete, без shadow-копий).</li>' +
            '<li>когда ты удаляешь аккаунт, твоя строка профиля анонимизируется; посты становятся «анонимными». если перед этим нажмёшь «удалить все мои посты» — их не будет вообще.</li>' +
            '<li>access-логи веб-сервера наш хостинг хранит несколько дней для безопасности, потом удаляет.</li>' +
          '</ul>'
    },

    /* Section 08 — your rights */
    'dc.pp.s8.body':       {
      en: '<p>no matter what country you\'re in or what acronym applies (GDPR / CCPA / LGPD / DPDP), you have these:</p>' +
          '<ul>' +
            '<li><strong>access</strong> — see what\'s stored. for now this is what you see in your profile + edit-profile pages; email us if you want a JSON export.</li>' +
            '<li><strong>correction</strong> — edit your profile and posts directly.</li>' +
            '<li><strong>deletion</strong> — delete posts individually, delete-all-posts from edit-profile, or delete the entire account. those buttons actually work.</li>' +
            '<li><strong>portability</strong> — email us, we\'ll send a JSON of your content.</li>' +
            '<li><strong>objection</strong> — there\'s nothing to object to (no profiling, no ads), but if there were, you could.</li>' +
          '</ul>' +
          '<p>to exercise any of these, click the appropriate button — or write to <a href="mailto:hello@stillhere.global">hello@stillhere.global</a>.</p>',
      ru: '<p>не важно в какой ты стране и какой акроним применим (GDPR / CCPA / LGPD / DPDP), у тебя есть эти права:</p>' +
          '<ul>' +
            '<li><strong>доступ</strong> — видеть, что сохранено. пока это то, что показано в твоём профиле + на странице редактирования; напиши нам если нужен JSON-экспорт.</li>' +
            '<li><strong>исправление</strong> — редактируй профиль и посты напрямую.</li>' +
            '<li><strong>удаление</strong> — удалить посты по одному, удалить все посты из edit-profile, или удалить весь аккаунт. эти кнопки реально работают.</li>' +
            '<li><strong>переносимость</strong> — напиши нам, если хочешь получить JSON-экспорт.</li>' +
            '<li><strong>возражение</strong> — против чего тут возражать (нет профилирования, нет рекламы), но если бы было — ты мог бы.</li>' +
          '</ul>' +
          '<p>чтобы воспользоваться любым из этих прав — нажми соответствующую кнопку или напиши на <a href="mailto:hello@stillhere.global">hello@stillhere.global</a>.</p>'
    },

    /* Section 09 — security */
    'dc.pp.s9.body':       {
      en: '<ul>' +
            '<li><strong>passwords</strong> are hashed by Supabase using industry-standard algorithms — we can never read them in plaintext.</li>' +
            '<li><strong>all traffic</strong> is encrypted in transit over HTTPS.</li>' +
            '<li><strong>row-level security</strong> at the database means even if someone breaks in to our app code, they still can\'t query data they shouldn\'t.</li>' +
            '<li>this is a small project. we don\'t have a security team — but we follow standard hygiene and respond fast to any reports.</li>' +
          '</ul>' +
          '<p>found a vulnerability? please email <a href="mailto:hello@stillhere.global">hello@stillhere.global</a> before disclosing publicly. thank you.</p>',
      ru: '<ul>' +
            '<li><strong>пароли</strong> хэшируются Supabase индустриальными алгоритмами — мы никогда не прочитаем их в открытом виде.</li>' +
            '<li><strong>весь трафик</strong> шифруется при передаче через HTTPS.</li>' +
            '<li><strong>row-level security</strong> в БД значит: даже если кто-то ворвётся в код приложения, он всё равно не сможет запросить данные, которые ему не положены.</li>' +
            '<li>это маленький проект. у нас нет security-команды — но мы следуем базовой гигиене и быстро реагируем на сообщения о проблемах.</li>' +
          '</ul>' +
          '<p>нашёл уязвимость? пожалуйста, напиши на <a href="mailto:hello@stillhere.global">hello@stillhere.global</a> до публичного раскрытия. спасибо.</p>'
    },

    /* Section 10 — children's privacy */
    'dc.pp.s10.body':      {
      en: '<p>StillHere is intended for users <strong>16 and older</strong>. the stories shared here often touch on grief, depression, trauma, and adult themes; adult language is common. we don\'t knowingly collect data from anyone under 16. if you believe a minor signed up, please <a href="mailto:hello@stillhere.global">tell us</a> and we\'ll remove the account.</p>',
      ru: '<p>StillHere предназначен для пользователей <strong>16+ лет</strong>. истории здесь часто касаются горя, депрессии, травмы, взрослых тем; взрослая лексика — обычное дело. мы сознательно не собираем данные от тех, кому меньше 16. если есть подозрение, что зарегистрировался несовершеннолетний — <a href="mailto:hello@stillhere.global">напиши нам</a>, мы удалим аккаунт.</p>'
    },

    /* Section 11 — changes to this policy */
    'dc.pp.s11.body':      {
      en: '<p>if anything material changes, we\'ll post a notice on the <a href="../../nav-bar/updates.html">updates page</a> and bump the version number above. the older versions stay archived in our git history.</p>',
      ru: '<p>если что-то существенное изменится — опубликуем уведомление на <a href="../../nav-bar/updates.html">странице обновлений</a> и повысим номер версии вверху. старые версии останутся в нашей git-истории.</p>'
    },

    /* Section 12 — contact */
    'dc.pp.s12.body':      {
      en: '<p>questions, requests, concerns — write to <a href="mailto:hello@stillhere.global">hello@stillhere.global</a>. this is a one-person project so a real human will respond, usually within a day or two.</p>',
      ru: '<p>вопросы, запросы, беспокойства — пиши на <a href="mailto:hello@stillhere.global">hello@stillhere.global</a>. это проект одного человека — ответит живой человек, обычно за день-два.</p>'
    },
    'dc.pp.s1.title':      { en: 'who we are',                        ru: 'кто мы' },
    'dc.pp.s2.title':      { en: 'what we collect',                   ru: 'что мы собираем' },
    'dc.pp.s2.hint':       { en: 'the minimum to make the site work', ru: 'минимум, чтобы сайт работал' },
    'dc.pp.s3.title':      { en: 'what we don\'t collect',            ru: 'что мы не собираем' },
    'dc.pp.s4.title':      { en: 'anonymity, on purpose',             ru: 'анонимность намеренно' },
    'dc.pp.s5.title':      { en: 'ai conversations',                  ru: 'AI-диалоги' },
    'dc.pp.s5.hint':       { en: 'kept on your device',               ru: 'хранятся на твоём устройстве' },
    'dc.pp.s6.title':      { en: 'third parties',                     ru: 'третьи стороны' },
    'dc.pp.s7.title':      { en: 'data retention',                    ru: 'хранение данных' },
    'dc.pp.s8.title':      { en: 'your rights',                       ru: 'твои права' },
    'dc.pp.s8.hint':       { en: 'whatever the regulation',           ru: 'независимо от регуляции' },
    'dc.pp.s9.title':      { en: 'security',                          ru: 'безопасность' },
    'dc.pp.s10.title':     { en: 'children\'s privacy',               ru: 'приватность детей' },
    'dc.pp.s11.title':     { en: 'changes to this policy',            ru: 'изменения в этой политике' },
    'dc.pp.s12.title':     { en: 'contact',                           ru: 'контакты' },
    'dc.pp.closing.title': { en: 'your data is <em>only</em> here for you.',
                             ru: 'твои данные здесь <em>только</em> ради тебя.' },
    'dc.pp.closing.text':  { en: 'we built StillHere so people could share what\'s hard without anyone watching. that doesn\'t work unless we keep our word — and we do.',
                             ru: 'мы построили StillHere, чтобы люди могли делиться тяжёлым без чужих глаз. это не работает, если мы не держим слово — а мы его держим.' },

    /* ── docs/html/terms-of-service.html ────────────────── */
    'dc.tos.eyebrow':      { en: '<em>—</em> terms of service',       ru: '<em>—</em> условия использования' },
    'dc.tos.title':        { en: 'the agreement, <em>plain &amp; <span class="doc-title-tail">short.</span></em>',
                             ru: 'соглашение, <em>просто и <span class="doc-title-tail">коротко.</span></em>' },
    'dc.tos.title2':        { en: '— the short version',
    ru: '— коротко' },
    'dc.tos.row1': {
      en: 'StillHere is free, anonymous, and runs on hope and one developer\'s spare time.',
      ru: 'StillHere — бесплатное и анонимное место, которое держится на надежде и свободном времени одного человека.'
    },
    'dc.tos.row2': {
      en: 'by using it, you agree to follow the <a href="guidelines.html">community guidelines</a>.',
      ru: 'находясь здесь, ты соглашаешься с <a href="guidelines.html">правилами</a>.'
    },
    'dc.tos.row3': {
      en: '<strong>StillHere is not therapy</strong> and not an emergency service. if you\'re in crisis, please reach <a href="crisis-resources.html">a trained counselor</a>.',
      ru: '<strong>StillHere — не терапия</strong> и не экстренная помощь. если тебе сейчас очень тяжело, пожалуйста, обратись к <a href="crisis-resources.html">обученному специалисту</a>.'
    },
    'dc.tos.row4': {
      en: 'we may remove content or accounts that break the rules.',
      ru: 'если правила нарушаются, мы можем аккуратно убрать такой контент или аккаунт.'
    },
    'dc.tos.row5': {
      en: 'you can leave anytime. delete-account is a real button, not customer-service theatre.',
      ru: 'ты можешь уйти в любой момент. кнопка удаления аккаунта настоящая — без лишних шагов.'
    },
    'dc.tos.lede':         { en: 'no legalese where we can help it. these terms describe how StillHere works, what you agree to by using it, and what we owe each other.',
                             ru: 'без юридического жаргона, где это возможно. эти условия описывают как работает StillHere, с чем ты соглашаешься используя его, и что мы должны друг другу.' },
    'dc.tos.s1.title':     { en: 'what stillhere is',                 ru: 'что такое StillHere' },
    'dc.tos.s2.title':     { en: 'using the site = accepting these',  ru: 'использование сайта = согласие с этим' },
    'dc.tos.s3.title':     { en: 'eligibility',                       ru: 'кто может пользоваться' },
    'dc.tos.s4.title':     { en: 'your account',                      ru: 'твой аккаунт' },
    'dc.tos.s5.title':     { en: 'how to behave',                     ru: 'как себя вести' },
    'dc.tos.s5.hint':      { en: 'the gentle floor',                  ru: 'мягкий минимум' },
    'dc.tos.s6.title':     { en: 'your content',                      ru: 'твой контент' },
    'dc.tos.s7.title':     { en: 'no-advice mode',                    ru: 'режим без советов' },
    'dc.tos.s8.title':     { en: 'mental-health disclaimer',          ru: 'дисклеймер о ментальном здоровье' },
    'dc.tos.s9.title':     { en: 'moderation',                        ru: 'модерация' },
    'dc.tos.s10.title':    { en: 'termination',                       ru: 'прекращение использования' },
    'dc.tos.s11.title':    { en: 'limitation of liability',           ru: 'ограничение ответственности' },
    'dc.tos.s12.title':    { en: 'changes to these terms',            ru: 'изменения этих условий' },
    'dc.tos.closing.title':{ en: 'that\'s <em>it.</em>',              ru: 'и <em>всё.</em>' },
    'dc.tos.closing.text': { en: 'no 80-page enterprise sentence-soup, no arbitration ambush, no surprise data clauses. questions? <a href="mailto:hello@stillhere.global">hello@stillhere.global</a>.',
                             ru: 'без 80-страничного корпоративного супа из предложений, без арбитражной засады, без сюрпризов в data-clauses. вопросы? <a href="mailto:hello@stillhere.global">hello@stillhere.global</a>.' },

    /* ── Terms of Service — full prose bodies ─────────── */
    'dc.tos.s1.body':      {
      en: '<p>StillHere is a <strong>small, anonymous mental-health space</strong> — a community feed of stories, a kind ai listener, and the gentlest moderation we can manage. it\'s free to use. it\'s a solo project, not a company.</p>' +
          '<p>it is <em>not</em> a substitute for therapy, medicine, or emergency services. it is a place to <em>feel less alone</em>.</p>',
      ru: '<p>StillHere — это <strong>маленькое анонимное пространство для ментального здоровья</strong>: лента историй сообщества, добрый AI-слушатель и максимально мягкая модерация. бесплатно. сольный проект, не компания.</p>' +
          '<p>это <em>не</em> замена терапии, медицины или экстренных служб. это место, где можно <em>почувствовать себя менее одиноким</em>.</p>'
    },

    'dc.tos.s2.body':      {
      en: '<p>by creating an account, posting, commenting, or even just browsing, you agree to follow these terms and our <a href="guidelines.html">community guidelines</a>. if you can\'t agree, please don\'t use the site.</p>',
      ru: '<p>создавая аккаунт, публикуя посты, комментируя — или даже просто читая — ты соглашаешься следовать этим условиям и нашим <a href="guidelines.html">правилам сообщества</a>. если не можешь согласиться — пожалуйста, не пользуйся сайтом.</p>'
    },

    'dc.tos.s3.body':      {
      en: '<ul>' +
            '<li>you must be at least <strong>16</strong> (or the minimum digital-consent age in your country, whichever is higher).</li>' +
            '<li>we set 16+ because stories here often touch on heavy topics — grief, depression, trauma — and adult language is common.</li>' +
            '<li>if you\'re 13–15, you may read with a trusted adult, but please don\'t post or sign up.</li>' +
            '<li>if you\'re under 18, please use the site with care and tell a trusted adult if anything feels off.</li>' +
            '<li>you may not use the site if a previous account was banned for serious violations.</li>' +
          '</ul>',
      ru: '<ul>' +
            '<li>тебе должно быть не меньше <strong>16</strong> (или минимальный возраст digital-consent в твоей стране, если он выше).</li>' +
            '<li>мы поставили 16+ потому что истории здесь часто касаются тяжёлых тем — горе, депрессия, травма — и взрослая лексика встречается часто.</li>' +
            '<li>если тебе 13–15, можно читать вместе со взрослым, которому доверяешь, но, пожалуйста, не публикуй и не регистрируйся.</li>' +
            '<li>если тебе меньше 18, пожалуйста, пользуйся сайтом аккуратно и расскажи доверенному взрослому, если что-то ощущается не так.</li>' +
            '<li>нельзя пользоваться сайтом, если предыдущий аккаунт был забанен за серьёзные нарушения.</li>' +
          '</ul>'
    },

    'dc.tos.s4.body':      {
      en: '<ul>' +
            '<li>pick a handle and a password. that\'s the entire signup. <strong>don\'t share your password.</strong></li>' +
            '<li>you are responsible for everything posted from your account.</li>' +
            '<li>you can delete the account whenever — from <strong>edit profile → delete account</strong>. it removes your profile data; if you also delete all your posts first, that content goes too.</li>' +
            '<li>we may delete an account that violates rules (see section 09).</li>' +
          '</ul>',
      ru: '<ul>' +
            '<li>выбери ник и пароль. это вся регистрация. <strong>не давай свой пароль никому.</strong></li>' +
            '<li>ты несёшь ответственность за всё, что публикуется с твоего аккаунта.</li>' +
            '<li>удалить аккаунт можно в любой момент — через <strong>edit profile → delete account</strong>. это уберёт данные профиля; если перед этим удалишь все свои посты, контент уйдёт тоже.</li>' +
            '<li>мы можем удалить аккаунт, нарушающий правила (см. раздел 09).</li>' +
          '</ul>'
    },

    'dc.tos.s5.body':      {
      en: '<p>the full version lives in the <a href="guidelines.html">community guidelines</a>. the short version:</p>' +
          '<div class="doc-chips">' +
            '<span class="doc-chip doc-chip--good">be kind</span>' +
            '<span class="doc-chip doc-chip--good">respect "no advice"</span>' +
            '<span class="doc-chip doc-chip--good">protect anonymity</span>' +
            '<span class="doc-chip doc-chip--good">honesty</span>' +
            '<span class="doc-chip doc-chip--bad">no harassment</span>' +
            '<span class="doc-chip doc-chip--bad">no hate</span>' +
            '<span class="doc-chip doc-chip--bad">no medical advice</span>' +
            '<span class="doc-chip doc-chip--bad">no promotion / spam</span>' +
            '<span class="doc-chip doc-chip--bad">no doxxing</span>' +
          '</div>',
      ru: '<p>полная версия — в <a href="guidelines.html">правилах сообщества</a>. короткая:</p>' +
          '<div class="doc-chips">' +
            '<span class="doc-chip doc-chip--good">будь добрым</span>' +
            '<span class="doc-chip doc-chip--good">уважай «без советов»</span>' +
            '<span class="doc-chip doc-chip--good">береги анонимность</span>' +
            '<span class="doc-chip doc-chip--good">честность</span>' +
            '<span class="doc-chip doc-chip--bad">без травли</span>' +
            '<span class="doc-chip doc-chip--bad">без ненависти</span>' +
            '<span class="doc-chip doc-chip--bad">без медицинских советов</span>' +
            '<span class="doc-chip doc-chip--bad">без рекламы / спама</span>' +
            '<span class="doc-chip doc-chip--bad">без доксинга</span>' +
          '</div>'
    },

    'dc.tos.s6.body':      {
      en: '<h3>you own what you write</h3>' +
          '<p>your posts and comments are <strong>yours</strong>. you keep all rights to them.</p>' +
          '<h3>what you grant us</h3>' +
          '<p>by posting here you give StillHere a <em>non-exclusive, non-transferable, royalty-free</em> licence to store, display, and back up your content — only for the purpose of running the site. nothing more. we don\'t use your content for marketing, fine-tuning models, or anything outside the site.</p>' +
          '<h3>what we don\'t do</h3>' +
          '<ul>' +
            '<li>we don\'t sell your content.</li>' +
            '<li>we don\'t train AI on your content.</li>' +
            '<li>we don\'t repost it elsewhere.</li>' +
          '</ul>',
      ru: '<h3>тебе принадлежит то, что ты пишешь</h3>' +
          '<p>твои посты и комментарии — <strong>твои</strong>. все права на них остаются у тебя.</p>' +
          '<h3>что ты даёшь нам</h3>' +
          '<p>публикуя здесь, ты даёшь StillHere <em>неэксклюзивную, непередаваемую, безвозмездную</em> лицензию хранить, показывать и резервировать твой контент — только для работы сайта. больше ничего. мы не используем твой контент для маркетинга, дообучения моделей или чего-то вне сайта.</p>' +
          '<h3>чего мы не делаем</h3>' +
          '<ul>' +
            '<li>не продаём твой контент.</li>' +
            '<li>не обучаем на нём AI.</li>' +
            '<li>не перепубликовываем его где-либо ещё.</li>' +
          '</ul>'
    },

    'dc.tos.s7.body':      {
      en: '<p>when a post is tagged <strong>"no advice"</strong>, the author is asking only for presence — not suggestions, not therapy recommendations, not "have you tried…". replies that ignore this tag may be removed.</p>' +
          '<p>the ai companion also has a <strong>no-advice toggle</strong> that switches its tone from a gentle helper to a quiet listener. it doesn\'t keep notes between sessions.</p>',
      ru: '<p>когда пост помечен <strong>«без советов»</strong>, автор просит только "быть рядом" — не предложений, не рекомендаций терапии, не «а ты пробовал…». ответы, игнорирующие этот тег, могут быть удалены.</p>' +
          '<p>у AI-спутника тоже есть <strong>переключатель «без советов»</strong>, который меняет его тон с мягкого помощника на тихого слушателя. он не ведёт заметок между сессиями.</p>'
    },

    'dc.tos.s8.alert.head':{ en: 'please read this carefully',         ru: 'пожалуйста, прочитай внимательно' },
    'dc.tos.s8.alert':     {
      en: '<p><strong>StillHere is not a therapist, doctor, counselor, or emergency service.</strong> the ai companion is a language model — it\'s empathetic, but it is not qualified to diagnose, treat, or save your life.</p>' +
          '<p>if you are in crisis, please call a real human. see our <a href="crisis-resources.html">crisis resources</a> page for free 24/7 numbers in your country.</p>',
      ru: '<p><strong>StillHere — не терапевт, не врач, не консультант и не служба экстренной помощи.</strong> AI-спутник — это языковая модель. он эмпатичен, но не квалифицирован ставить диагнозы, лечить или спасти твою жизнь.</p>' +
          '<p>если тебе сейчас очень тяжело — пожалуйста, позвони живому человеку. на странице <a href="crisis-resources.html">где найти помощь</a> есть бесплатные номера 24/7 по странам.</p>'
    },
    'dc.tos.s8.body':      {
      en: '<p>by using the site you understand that other users are <strong>peers, not professionals</strong>. their stories and replies are their personal experiences — not medical advice.</p>',
      ru: '<p>используя сайт, ты понимаешь, что другие пользователи — это <strong>такие же люди, не профессионалы</strong>. их истории и ответы — это их личный опыт, а не медицинский совет.</p>'
    },

    'dc.tos.s9.body':      {
      en: '<p>we moderate. that means:</p>' +
          '<ul>' +
            '<li>posts and comments pass a basic automated check at submit time.</li>' +
            '<li>users can <strong>report</strong> content; we review reports — usually within 24 hours.</li>' +
            '<li>content that breaks the guidelines gets <strong>removed</strong>.</li>' +
            '<li>serious or repeated violations lead to <strong>account suspension or ban</strong>. some violations are zero-tolerance.</li>' +
            '<li>to enforce a temporary block, we store your request IP and a random browser identifier on the post or comment you submit. these are only consulted when a moderator pauses someone — they are not used for tracking. full detail in the <a href="privacy-policy.html">privacy policy</a>.</li>' +
            '<li>if you think we got it wrong, appeal by emailing <a href="mailto:hello@stillhere.global">hello@stillhere.global</a>.</li>' +
          '</ul>',
      ru: '<p>мы модерируем. это значит:</p>' +
          '<ul>' +
            '<li>посты и комментарии проходят базовую автоматическую проверку при отправке.</li>' +
            '<li>пользователи могут <strong>жаловаться</strong> на контент; мы рассматриваем жалобы — обычно в течение 24 часов.</li>' +
            '<li>контент, нарушающий правила, <strong>удаляется</strong>.</li>' +
            '<li>серьёзные или повторяющиеся нарушения ведут к <strong>приостановке или бану аккаунта</strong>. для некоторых нарушений — zero-tolerance.</li>' +
            '<li>чтобы временный бан реально работал, мы сохраняем IP запроса и случайный идентификатор браузера рядом с твоим постом или комментарием. их смотрят только когда модератор приостанавливает кого-то — для трекинга они не используются. подробности в <a href="privacy-policy.html">политике конфиденциальности</a>.</li>' +
            '<li>если думаешь, что мы ошиблись — апелляция по адресу <a href="mailto:hello@stillhere.global">hello@stillhere.global</a>.</li>' +
          '</ul>'
    },

    'dc.tos.s10.body':     {
      en: '<ul>' +
            '<li><strong>you can leave anytime</strong> — delete your account from edit profile.</li>' +
            '<li><strong>we can terminate</strong> an account that violates these terms or the guidelines.</li>' +
            '<li>we may stop operating StillHere if the project is no longer sustainable; we\'ll give as much warning as possible and offer data export.</li>' +
          '</ul>',
      ru: '<ul>' +
            '<li><strong>ты можешь уйти в любой момент</strong> — удали аккаунт через edit profile.</li>' +
            '<li><strong>мы можем закрыть</strong> аккаунт, нарушающий эти условия или правила.</li>' +
            '<li>мы можем прекратить работу StillHere, если проект перестанет быть устойчивым; постараемся предупредить максимально заранее и предложим экспорт данных.</li>' +
          '</ul>'
    },

    'dc.tos.s11.body':     {
      en: '<p>StillHere is provided <strong>"as is"</strong>, without warranty of any kind. we do our best, but we cannot guarantee the site will be available, error-free, or that any content here is accurate, complete, or healing.</p>' +
          '<p>to the maximum extent permitted by law, StillHere and its operator(s) are not liable for indirect, incidental, or consequential damages arising from your use of the site. this includes content posted by other users.</p>' +
          '<p>nothing in these terms limits liability that cannot be limited by law (e.g. gross negligence, willful misconduct).</p>',
      ru: '<p>StillHere предоставляется <strong>«как есть»</strong>, без каких-либо гарантий. мы стараемся, но не можем гарантировать, что сайт всегда будет доступен, без ошибок, или что любой контент здесь точен, полон или целителен.</p>' +
          '<p>в максимально допустимой законом степени StillHere и его оператор(ы) не несут ответственности за косвенный, побочный или последующий ущерб, связанный с использованием сайта. это включает контент, опубликованный другими пользователями.</p>' +
          '<p>ничто в этих условиях не ограничивает ответственность, которая не может быть ограничена по закону (например, грубая небрежность, умышленные действия).</p>'
    },

    'dc.tos.s12.body':     {
      en: '<p>if we update these terms materially, we\'ll post a notice on the <a href="../../nav-bar/updates.html">updates page</a> and bump the version number above. continued use after a change means you accept the new version.</p>',
      ru: '<p>если мы существенно обновим эти условия, разместим уведомление на <a href="../../nav-bar/updates.html">странице обновлений</a> и повысим номер версии вверху. продолжение использования после изменения означает согласие с новой версией.</p>'
    },

    /* ── docs nav (shared across all 4 docs pages) ───── */
    'dc.nav.guidelines':   { en: 'guidelines',                        ru: 'правила' },
    'dc.nav.privacy':      { en: 'privacy',                           ru: 'приватность' },
    'dc.nav.terms':        { en: 'terms',                             ru: 'условия' },
    'dc.nav.crisis':       { en: 'crisis resources',                  ru: 'где найти помощь' },

    /* ── docs/html/crisis-resources.html ────────────────── */
    'dc.cr.eyebrow':       { en: '<em>—</em> crisis resources',       ru: '<em>—</em> где найти помощь' },
    'dc.cr.title':         { en: 'if you need <em>help <span class="doc-title-tail">now.</span></em>',
                             ru: 'если нужна <em>помощь <span class="doc-title-tail">сейчас.</span></em>' },
    'dc.cr.lede':          { en: 'this isn\'t a hotline — but here\'s a list of <em>free, 24/7 lines</em> by country, plus specialized support for grief, youth, LGBTQ+, and chat-based help.',
                             ru: 'это не служба поддержки — но здесь список <em>бесплатных линий 24/7</em> по странам, плюс специализированная поддержка для горя, молодёжи, ЛГБТК+ и помощь через чат.' },

    'dc.cr.meta.updated':  { en: 'updated',                           ru: 'обновлено' },
    'dc.cr.meta.free':     { en: 'free',                              ru: 'бесплатно' },
    'dc.cr.meta.free.val': { en: 'all of them',                       ru: 'все линии' },
    'dc.cr.meta.247.val':  { en: 'most of them',                      ru: 'большинство' },

    'dc.cr.alert.head':    { en: 'if you are in immediate danger',    ru: 'если опасность прямо сейчас' },
    'dc.cr.alert.body':    {
      en: '<p>please <strong>call your local emergency number now</strong> — <strong>112</strong> (most of europe), <strong>911</strong> (us / canada), <strong>999</strong> (uk / hong kong), <strong>000</strong> (australia), <strong>110 / 119</strong> (japan).</p>' +
          '<p>if you\'re not in physical danger but need a trained human to talk to, the lines below are <em>free, anonymous, and 24/7</em> in most countries.</p>',
      ru: '<p>пожалуйста, <strong>позвони на местный номер экстренных служб</strong> — <strong>112</strong> (большая часть Европы), <strong>911</strong> (США / Канада), <strong>999</strong> (Великобритания / Гонконг), <strong>000</strong> (Австралия), <strong>110 / 119</strong> (Япония).</p>' +
          '<p>если физической опасности нет, но нужен обученный человек, с которым можно поговорить — линии ниже <em>бесплатные, анонимные, 24/7</em> в большинстве стран.</p>'
    },

    'dc.cr.toc.head':      { en: '— jump to',                         ru: '— перейти к' },

    'dc.cr.s6.body':       {
      en: '<p>specifically trained for people under 25:</p>' +
          '<ul>' +
            '<li><strong>116 111</strong> — europe-wide youth helpline.</li>' +
            '<li><strong>childline UK</strong> — <a href="tel:08001111">0800 1111</a>, also online chat.</li>' +
            '<li><strong>kids help phone (canada)</strong> — <a href="tel:18006686868">1-800-668-6868</a>.</li>' +
            '<li><strong>kids helpline (au)</strong> — <a href="tel:1800551800">1800 55 1800</a>, 5–25.</li>' +
            '<li><strong>youthline (nz)</strong> — <a href="tel:0800376633">0800 376 633</a> or text 234.</li>' +
          '</ul>',
      ru: '<p>специально обучены для людей до 25 лет:</p>' +
          '<ul>' +
            '<li><strong>116 111</strong> — общеевропейская линия для молодёжи.</li>' +
            '<li><strong>childline UK</strong> — <a href="tel:08001111">0800 1111</a>, также онлайн-чат.</li>' +
            '<li><strong>kids help phone (Канада)</strong> — <a href="tel:18006686868">1-800-668-6868</a>.</li>' +
            '<li><strong>kids helpline (Австралия)</strong> — <a href="tel:1800551800">1800 55 1800</a>, 5–25 лет.</li>' +
            '<li><strong>youthline (Новая Зеландия)</strong> — <a href="tel:0800376633">0800 376 633</a> или SMS 234.</li>' +
          '</ul>'
    },
    'dc.cr.s7.body':       {
      en: '<ul>' +
            '<li><strong>the trevor project (us)</strong> — <a href="tel:18664887386">1-866-488-7386</a> · text START to 678678 · 24/7.</li>' +
            '<li><strong>trans lifeline (us/ca)</strong> — <a href="tel:18775658860">1-877-565-8860</a>.</li>' +
            '<li><strong>switchboard lgbt+ (uk)</strong> — <a href="tel:08000119100">0800 0119 100</a>.</li>' +
            '<li><strong>mindout (uk)</strong> — online chat &amp; email-based.</li>' +
            '<li><strong>qlife (au)</strong> — <a href="tel:1800184527">1800 184 527</a>.</li>' +
          '</ul>',
      ru: '<ul>' +
            '<li><strong>the trevor project (США)</strong> — <a href="tel:18664887386">1-866-488-7386</a> · SMS START на 678678 · 24/7.</li>' +
            '<li><strong>trans lifeline (США/Канада)</strong> — <a href="tel:18775658860">1-877-565-8860</a>.</li>' +
            '<li><strong>switchboard lgbt+ (Великобритания)</strong> — <a href="tel:08000119100">0800 0119 100</a>.</li>' +
            '<li><strong>mindout (Великобритания)</strong> — онлайн-чат и email.</li>' +
            '<li><strong>qlife (Австралия)</strong> — <a href="tel:1800184527">1800 184 527</a>.</li>' +
          '</ul>'
    },
    'dc.cr.s8.body':       {
      en: '<ul>' +
            '<li><strong>cruse bereavement (uk)</strong> — <a href="tel:08088081677">0808 808 1677</a>.</li>' +
            '<li><strong>griefshare (international)</strong> — online groups, free, in many countries.</li>' +
            '<li><strong>the dougy center</strong> — children &amp; teens, online resources.</li>' +
            '<li><strong>compassionate friends</strong> — support after losing a child, branches worldwide.</li>' +
          '</ul>',
      ru: '<ul>' +
            '<li><strong>cruse bereavement (Великобритания)</strong> — <a href="tel:08088081677">0808 808 1677</a>.</li>' +
            '<li><strong>griefshare (международная)</strong> — онлайн-группы, бесплатно, во многих странах.</li>' +
            '<li><strong>the dougy center</strong> — дети и подростки, онлайн-ресурсы.</li>' +
            '<li><strong>compassionate friends</strong> — поддержка после потери ребёнка, отделения по всему миру.</li>' +
          '</ul>'
    },
    'dc.cr.s9.body':       {
      en: '<h3>if calling feels like too much:</h3>' +
          '<ul>' +
            '<li><strong><a href="https://www.imalive.org" target="_blank" rel="noopener">imalive.org</a></strong> — peer chat with trained volunteers (us).</li>' +
            '<li><strong><a href="https://www.crisistextline.org" target="_blank" rel="noopener">crisis text line</a></strong> — text-based, US/UK/Canada/Ireland.</li>' +
            '<li><strong><a href="https://www.7cups.com" target="_blank" rel="noopener">7 cups</a></strong> — free emotional support listeners, worldwide.</li>' +
            '<li><strong><a href="https://befrienders.org" target="_blank" rel="noopener">befrienders worldwide</a></strong> — directory of crisis lines in 32+ countries.</li>' +
            '<li><strong><a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a></strong> — search any country, any topic.</li>' +
          '</ul>' +
          '<p>russian-language resources:</p>' +
          '<ul>' +
            '<li><strong><a href="https://pomogi.org/" target="_blank" rel="noopener">pomogi.org</a></strong> — directory of free psychological help in Russian.</li>' +
            '<li><strong><a href="https://www.b17.ru/" target="_blank" rel="noopener">b17.ru</a></strong> — large psychologist directory; many offer a free first consultation.</li>' +
            '<li><strong><a href="https://your-territory.ru/" target="_blank" rel="noopener">"your territory"</a></strong> — free online chat &amp; calls for teens and young adults.</li>' +
            '<li><strong><a href="https://psymanyfound.ru/" target="_blank" rel="noopener">"we\'re near"</a></strong> — online psychological support with a live chat option.</li>' +
            '<li><strong><a href="https://teleminzdrav.ru/" target="_blank" rel="noopener">telemedicine — Russian Ministry of Health</a></strong> — official hotline &amp; online consultations.</li>' +
          '</ul>',
      ru: '<h3>если позвонить — это слишком:</h3>' +
          '<ul>' +
            '<li><strong><a href="https://www.imalive.org" target="_blank" rel="noopener">imalive.org</a></strong> — peer-чат с обученными волонтёрами (США).</li>' +
            '<li><strong><a href="https://www.crisistextline.org" target="_blank" rel="noopener">crisis text line</a></strong> — текстовая помощь, США/Великобритания/Канада/Ирландия.</li>' +
            '<li><strong><a href="https://www.7cups.com" target="_blank" rel="noopener">7 cups</a></strong> — бесплатные слушатели эмоциональной поддержки, по всему миру.</li>' +
            '<li><strong><a href="https://befrienders.org" target="_blank" rel="noopener">befrienders worldwide</a></strong> — каталог кризисных линий в 32+ странах.</li>' +
            '<li><strong><a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a></strong> — поиск по любой стране, любой теме.</li>' +
          '</ul>' +
          '<p>русскоязычные ресурсы:</p>' +
          '<ul>' +
            '<li><strong><a href="https://pomogi.org/" target="_blank" rel="noopener">pomogi.org</a></strong> — каталог бесплатной психологической помощи на русском.</li>' +
            '<li><strong><a href="https://www.b17.ru/" target="_blank" rel="noopener">b17.ru</a></strong> — большой каталог психологов; многие предлагают бесплатную первую консультацию.</li>' +
            '<li><strong><a href="https://your-territory.ru/" target="_blank" rel="noopener">«твоя территория»</a></strong> — бесплатный онлайн-чат и звонки для подростков и молодых взрослых.</li>' +
            '<li><strong><a href="https://psymanyfound.ru/" target="_blank" rel="noopener">«мы рядом»</a></strong> — онлайн-психологическая поддержка с живым чатом.</li>' +
            '<li><strong><a href="https://teleminzdrav.ru/" target="_blank" rel="noopener">телемедицина — Минздрав России</a></strong> — официальная горячая линия и онлайн-консультации.</li>' +
          '</ul>'
    },

    'dc.cr.note':          {
      en: '<strong>note —</strong> these numbers are checked carefully but can change. if a line doesn\'t work, please use <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a> to find a current one for your country, and please <a href="mailto:hello@stillhere.global">tell us</a> so we can update this list.',
      ru: '<strong>примечание —</strong> эти номера проверены, но могут меняться. если линия не работает — пожалуйста, найди актуальную для своей страны на <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a> и <a href="mailto:hello@stillhere.global">напиши нам</a>, чтобы мы обновили список.'
    },

    'dc.cr.closing.ai':    { en: 'talk to ai companion',              ru: 'поговорить с AI-спутником' },

    /* ── Country names + per-card line labels ────────────
       Each card's <ul class="doc-resource-lines"> is one key
       containing the full list HTML with phone <a> links and
       translated <em> labels. Phone numbers don't translate. */

    /* Europe — 11 countries */
    'dc.cr.country.eu':    { en: 'all eu — emergency &amp; common hotlines',
                             ru: 'вся ЕС — экстренные и общие линии' },
    'dc.cr.lines.eu':      {
      en: '<li><em>emergency</em><a href="tel:112">112</a></li>' +
          '<li><em>emotional support (samaritans-europe)</em><a href="tel:116123">116 123</a></li>' +
          '<li><em>missing / abused children</em><a href="tel:116111">116 111</a></li>',
      ru: '<li><em>экстренный вызов</em><a href="tel:112">112</a></li>' +
          '<li><em>эмоциональная поддержка (samaritans-europe)</em><a href="tel:116123">116 123</a></li>' +
          '<li><em>пропавшие / пострадавшие дети</em><a href="tel:116111">116 111</a></li>'
    },

    'dc.cr.country.uk':    { en: 'united kingdom',                    ru: 'Великобритания' },
    'dc.cr.lines.uk':      {
      en: '<li><em>samaritans</em><a href="tel:116123">116 123</a></li>' +
          '<li><em>shout (text)</em><a>text 85258</a></li>' +
          '<li><em>childline</em><a href="tel:08001111">0800 1111</a></li>',
      ru: '<li><em>samaritans</em><a href="tel:116123">116 123</a></li>' +
          '<li><em>shout (SMS)</em><a>SMS 85258</a></li>' +
          '<li><em>childline — для детей</em><a href="tel:08001111">0800 1111</a></li>'
    },

    'dc.cr.country.de':    { en: 'germany',                           ru: 'Германия' },
    'dc.cr.lines.de':      {
      en: '<li><em>telefonseelsorge</em><a href="tel:08001110111">0800 111 0 111</a></li>' +
          '<li><em>kinder &amp; jugendtelefon</em><a href="tel:116111">116 111</a></li>',
      ru: '<li><em>telefonseelsorge — служба духовной поддержки</em><a href="tel:08001110111">0800 111 0 111</a></li>' +
          '<li><em>детский и молодёжный телефон</em><a href="tel:116111">116 111</a></li>'
    },

    'dc.cr.country.fr':    { en: 'france',                            ru: 'Франция' },
    'dc.cr.lines.fr':      {
      en: '<li><em>3114 (suicide nationwide)</em><a href="tel:3114">3114</a></li>' +
          '<li><em>SOS amitié</em><a href="tel:0972394050">09 72 39 40 50</a></li>',
      ru: '<li><em>3114 — общенациональная линия по суициду</em><a href="tel:3114">3114</a></li>' +
          '<li><em>SOS amitié</em><a href="tel:0972394050">09 72 39 40 50</a></li>'
    },

    'dc.cr.country.es':    { en: 'spain',                             ru: 'Испания' },
    'dc.cr.lines.es':      {
      en: '<li><em>línea de la vida</em><a href="tel:024">024</a></li>' +
          '<li><em>teléfono de la esperanza</em><a href="tel:717003717">717 003 717</a></li>',
      ru: '<li><em>línea de la vida — линия жизни</em><a href="tel:024">024</a></li>' +
          '<li><em>teléfono de la esperanza — телефон надежды</em><a href="tel:717003717">717 003 717</a></li>'
    },

    'dc.cr.country.it':    { en: 'italy',                             ru: 'Италия' },
    'dc.cr.lines.it':      {
      en: '<li><em>telefono amico</em><a href="tel:0223272327">02 2327 2327</a></li>' +
          '<li><em>samaritans onlus</em><a href="tel:800860022">800 86 00 22</a></li>',
      ru: '<li><em>telefono amico — телефон друга</em><a href="tel:0223272327">02 2327 2327</a></li>' +
          '<li><em>samaritans onlus</em><a href="tel:800860022">800 86 00 22</a></li>'
    },

    'dc.cr.country.pl':    { en: 'poland',                            ru: 'Польша' },
    'dc.cr.lines.pl':      {
      en: '<li><em>telefon zaufania (adults)</em><a href="tel:116123">116 123</a></li>' +
          '<li><em>telefon zaufania (youth)</em><a href="tel:116111">116 111</a></li>',
      ru: '<li><em>telefon zaufania — для взрослых</em><a href="tel:116123">116 123</a></li>' +
          '<li><em>telefon zaufania — для молодёжи</em><a href="tel:116111">116 111</a></li>'
    },

    'dc.cr.country.ua':    { en: 'ukraine',                           ru: 'Украина' },
    'dc.cr.lines.ua':      {
      en: '<li><em>lifeline ukraine</em><a href="tel:7333">7333</a></li>' +
          '<li><em>la strada</em><a href="tel:116123">116 123</a></li>' +
          '<li><em>national helpline (free)</em><a href="tel:0800500225">0 800 500 225</a></li>',
      ru: '<li><em>lifeline ukraine</em><a href="tel:7333">7333</a></li>' +
          '<li><em>la strada</em><a href="tel:116123">116 123</a></li>' +
          '<li><em>национальная линия (бесплатно)</em><a href="tel:0800500225">0 800 500 225</a></li>'
    },

    'dc.cr.country.ru':    { en: 'russia (Russian-speaking)',         ru: 'Россия (русскоязычные)' },
    'dc.cr.lines.ru':      {
      en: '<li><em>children\'s helpline (free)</em><a href="tel:88002000122">8 800 2000 122</a></li>' +
          '<li><em>moscow psychological support</em><a href="tel:051">051</a></li>' +
          '<li><em>ministry of health hotline</em><a href="tel:88002000389">8 800 2000 389</a></li>' +
          '<li><em>"yasnoye utro" — cancer support (free)</em><a href="tel:88001001191">8 800 100 0191</a></li>',
      ru: '<li><em>детский телефон доверия (бесплатно)</em><a href="tel:88002000122">8 800 2000 122</a></li>' +
          '<li><em>московская психологическая помощь</em><a href="tel:051">051</a></li>' +
          '<li><em>горячая линия Минздрава</em><a href="tel:88002000389">8 800 2000 389</a></li>' +
          '<li><em>«ясное утро» — поддержка при онкологии (бесплатно)</em><a href="tel:88001001191">8 800 100 0191</a></li>'
    },

    'dc.cr.country.by':    { en: 'belarus',                           ru: 'Беларусь' },
    'dc.cr.lines.by':      {
      en: '<li><em>helpline (minsk)</em><a href="tel:80173520303">8 (017) 352 03 03</a></li>' +
          '<li><em>emergency psychological help</em><a href="tel:170">170</a></li>',
      ru: '<li><em>линия доверия (Минск)</em><a href="tel:80173520303">8 (017) 352 03 03</a></li>' +
          '<li><em>экстренная психологическая помощь</em><a href="tel:170">170</a></li>'
    },

    'dc.cr.country.kz':    { en: 'kazakhstan',                        ru: 'Казахстан' },
    'dc.cr.lines.kz':      {
      en: '<li><em>national helpline (free)</em><a href="tel:150">150</a></li>' +
          '<li><em>youth helpline</em><a href="tel:111">111</a></li>',
      ru: '<li><em>национальная линия (бесплатно)</em><a href="tel:150">150</a></li>' +
          '<li><em>линия для молодёжи</em><a href="tel:111">111</a></li>'
    },

    /* North America */
    'dc.cr.country.us':    { en: 'united states',                     ru: 'США' },
    'dc.cr.lines.us':      {
      en: '<li><em>988 suicide &amp; crisis</em><a href="tel:988">988</a></li>' +
          '<li><em>crisis text line</em><a>text 741741</a></li>' +
          '<li><em>SAMHSA</em><a href="tel:18006624357">1-800-662-4357</a></li>' +
          '<li><em>veterans crisis line</em><a href="tel:988">988 press 1</a></li>',
      ru: '<li><em>988 — линия суицида и кризиса</em><a href="tel:988">988</a></li>' +
          '<li><em>crisis text line — SMS-чат</em><a>SMS 741741</a></li>' +
          '<li><em>SAMHSA — психиатрическая помощь</em><a href="tel:18006624357">1-800-662-4357</a></li>' +
          '<li><em>кризисная линия для ветеранов</em><a href="tel:988">988, нажать 1</a></li>'
    },

    'dc.cr.country.ca':    { en: 'canada',                            ru: 'Канада' },
    'dc.cr.lines.ca':      {
      en: '<li><em>talk suicide canada</em><a href="tel:18334564566">1-833-456-4566</a></li>' +
          '<li><em>kids help phone</em><a href="tel:18006686868">1-800-668-6868</a></li>' +
          '<li><em>9-8-8 (nationwide)</em><a href="tel:988">988</a></li>',
      ru: '<li><em>talk suicide canada</em><a href="tel:18334564566">1-833-456-4566</a></li>' +
          '<li><em>kids help phone — для детей</em><a href="tel:18006686868">1-800-668-6868</a></li>' +
          '<li><em>9-8-8 (национальная линия)</em><a href="tel:988">988</a></li>'
    },

    'dc.cr.country.mx':    { en: 'mexico',                            ru: 'Мексика' },
    'dc.cr.lines.mx':      {
      en: '<li><em>SAPTEL</em><a href="tel:5552598121">55 5259 8121</a></li>' +
          '<li><em>locatel (mexico city)</em><a href="tel:5556581111">55 5658 1111</a></li>',
      ru: '<li><em>SAPTEL — психологическая помощь</em><a href="tel:5552598121">55 5259 8121</a></li>' +
          '<li><em>locatel (Мехико)</em><a href="tel:5556581111">55 5658 1111</a></li>'
    },

    /* Asia & Pacific */
    'dc.cr.country.jp':    { en: 'japan',                             ru: 'Япония' },
    'dc.cr.lines.jp':      {
      en: '<li><em>tell lifeline (english)</em><a href="tel:0357740992">03-5774-0992</a></li>' +
          '<li><em>yorisoi hotline</em><a href="tel:0120279338">0120-279-338</a></li>',
      ru: '<li><em>tell lifeline (на английском)</em><a href="tel:0357740992">03-5774-0992</a></li>' +
          '<li><em>yorisoi — горячая линия</em><a href="tel:0120279338">0120-279-338</a></li>'
    },

    'dc.cr.country.kr':    { en: 'south korea',                       ru: 'Южная Корея' },
    'dc.cr.lines.kr':      {
      en: '<li><em>suicide prevention</em><a href="tel:1393">1393</a></li>' +
          '<li><em>youth counseling</em><a href="tel:1388">1388</a></li>',
      ru: '<li><em>профилактика суицида</em><a href="tel:1393">1393</a></li>' +
          '<li><em>консультации для молодёжи</em><a href="tel:1388">1388</a></li>'
    },

    'dc.cr.country.cn':    { en: 'china',                             ru: 'Китай' },
    'dc.cr.lines.cn':      {
      en: '<li><em>beijing crisis line</em><a href="tel:01082951332">010-8295-1332</a></li>' +
          '<li><em>shanghai mental health</em><a href="tel:02164387250">021-6438-7250</a></li>',
      ru: '<li><em>пекинская кризисная линия</em><a href="tel:01082951332">010-8295-1332</a></li>' +
          '<li><em>шанхайский центр психического здоровья</em><a href="tel:02164387250">021-6438-7250</a></li>'
    },

    'dc.cr.country.in':    { en: 'india',                             ru: 'Индия' },
    'dc.cr.lines.in':      {
      en: '<li><em>iCall (TISS)</em><a href="tel:9152987821">9152987821</a></li>' +
          '<li><em>vandrevala</em><a href="tel:18602662345">1860-266-2345</a></li>' +
          '<li><em>AASRA</em><a href="tel:9820466726">9820466726</a></li>',
      ru: '<li><em>iCall (TISS)</em><a href="tel:9152987821">9152987821</a></li>' +
          '<li><em>vandrevala</em><a href="tel:18602662345">1860-266-2345</a></li>' +
          '<li><em>AASRA</em><a href="tel:9820466726">9820466726</a></li>'
    },

    'dc.cr.country.au':    { en: 'australia',                         ru: 'Австралия' },
    'dc.cr.lines.au':      {
      en: '<li><em>lifeline</em><a href="tel:131114">13 11 14</a></li>' +
          '<li><em>beyond blue</em><a href="tel:1300224636">1300 22 4636</a></li>' +
          '<li><em>kids helpline</em><a href="tel:1800551800">1800 55 1800</a></li>',
      ru: '<li><em>lifeline</em><a href="tel:131114">13 11 14</a></li>' +
          '<li><em>beyond blue</em><a href="tel:1300224636">1300 22 4636</a></li>' +
          '<li><em>kids helpline — для детей</em><a href="tel:1800551800">1800 55 1800</a></li>'
    },

    'dc.cr.country.nz':    { en: 'new zealand',                       ru: 'Новая Зеландия' },
    'dc.cr.lines.nz':      {
      en: '<li><em>1737 — need to talk?</em><a href="tel:1737">1737</a></li>' +
          '<li><em>lifeline aotearoa</em><a href="tel:0800543354">0800 543 354</a></li>',
      ru: '<li><em>1737 — нужно поговорить?</em><a href="tel:1737">1737</a></li>' +
          '<li><em>lifeline aotearoa</em><a href="tel:0800543354">0800 543 354</a></li>'
    },

    /* Latin America */
    'dc.cr.country.br':    { en: 'brazil',                            ru: 'Бразилия' },
    'dc.cr.lines.br':      {
      en: '<li><em>CVV (centro de valorização da vida)</em><a href="tel:188">188</a></li>',
      ru: '<li><em>CVV — центр сохранения жизни</em><a href="tel:188">188</a></li>'
    },

    'dc.cr.country.ar':    { en: 'argentina',                         ru: 'Аргентина' },
    'dc.cr.lines.ar':      {
      en: '<li><em>centro de asistencia al suicida (caba)</em><a href="tel:135">135</a></li>' +
          '<li><em>fuera de caba</em><a href="tel:01152752085">011 5275-2085</a></li>',
      ru: '<li><em>центр помощи при суицидах (Буэнос-Айрес)</em><a href="tel:135">135</a></li>' +
          '<li><em>вне Буэнос-Айреса</em><a href="tel:01152752085">011 5275-2085</a></li>'
    },

    'dc.cr.country.co':    { en: 'colombia',                          ru: 'Колумбия' },
    'dc.cr.lines.co':      {
      en: '<li><em>línea 106 (bogotá)</em><a href="tel:106">106</a></li>' +
          '<li><em>línea púrpura</em><a href="tel:018000112137">018000-112-137</a></li>',
      ru: '<li><em>линия 106 (Богота)</em><a href="tel:106">106</a></li>' +
          '<li><em>línea púrpura — пурпурная линия</em><a href="tel:018000112137">018000-112-137</a></li>'
    },

    'dc.cr.country.cl':    { en: 'chile',                             ru: 'Чили' },
    'dc.cr.lines.cl':      {
      en: '<li><em>fono salud responde</em><a href="tel:6003607777">600 360 7777</a></li>' +
          '<li><em>línea libre (niños)</em><a href="tel:1515">1515</a></li>',
      ru: '<li><em>fono salud responde — линия здоровья</em><a href="tel:6003607777">600 360 7777</a></li>' +
          '<li><em>línea libre — для детей</em><a href="tel:1515">1515</a></li>'
    },

    /* Middle East & Africa */
    'dc.cr.country.il':    { en: 'israel',                            ru: 'Израиль' },
    'dc.cr.lines.il':      {
      en: '<li><em>ERAN</em><a href="tel:1201">1201</a></li>' +
          '<li><em>natal (trauma &amp; war)</em><a href="tel:180036363">1-800-363-363</a></li>',
      ru: '<li><em>ERAN — кризисная линия</em><a href="tel:1201">1201</a></li>' +
          '<li><em>natal — травма и война</em><a href="tel:180036363">1-800-363-363</a></li>'
    },

    'dc.cr.country.ae':    { en: 'UAE',                               ru: 'ОАЭ' },
    'dc.cr.lines.ae':      {
      en: '<li><em>dubai 24/7 helpline</em><a href="tel:8004673">800-4673</a></li>',
      ru: '<li><em>линия Дубая 24/7</em><a href="tel:8004673">800-4673</a></li>'
    },

    'dc.cr.country.za':    { en: 'south africa',                      ru: 'ЮАР' },
    'dc.cr.lines.za':      {
      en: '<li><em>SADAG suicide line</em><a href="tel:0800567567">0800 567 567</a></li>' +
          '<li><em>lifeline national</em><a href="tel:0861322322">0861 322 322</a></li>',
      ru: '<li><em>SADAG — линия суицида</em><a href="tel:0800567567">0800 567 567</a></li>' +
          '<li><em>lifeline — национальная линия</em><a href="tel:0861322322">0861 322 322</a></li>'
    },

    'dc.cr.country.ke':    { en: 'kenya',                             ru: 'Кения' },
    'dc.cr.lines.ke':      {
      en: '<li><em>befrienders kenya</em><a href="tel:+254722178177">+254 722 178 177</a></li>',
      ru: '<li><em>befrienders kenya</em><a href="tel:+254722178177">+254 722 178 177</a></li>'
    },
    'dc.cr.s1.title':      { en: 'europe',                            ru: 'европа' },
    'dc.cr.s1.hint':       { en: 'free 24/7 lines',                   ru: 'бесплатно 24/7' },
    'dc.cr.s2.title':      { en: 'north america',                     ru: 'северная америка' },
    'dc.cr.s3.title':      { en: 'asia &amp; pacific',                ru: 'азия и тихоокеанский регион' },
    'dc.cr.s4.title':      { en: 'latin america',                     ru: 'латинская америка' },
    'dc.cr.s5.title':      { en: 'middle east &amp; africa',          ru: 'ближний восток и африка' },
    'dc.cr.s6.title':      { en: 'youth support',                     ru: 'поддержка молодых' },
    'dc.cr.s7.title':      { en: 'lgbtq+ support',                    ru: 'ЛГБТК+ поддержка' },
    'dc.cr.s8.title':      { en: 'grief &amp; loss',                  ru: 'горе и утрата' },
    'dc.cr.s9.title':      { en: 'online &amp; chat support',         ru: 'онлайн и чат-поддержка' },
    'dc.cr.closing.title': { en: 'whatever brought you here — <em>we\'re glad you\'re still here.</em>',
                             ru: 'что бы тебя сюда ни привело — <em>мы рады, что ты ещё здесь.</em>' },
    'dc.cr.closing.text':  { en: 'you didn\'t have to look this up. you did. that matters.<br>if calling a hotline feels too big, even just sitting with a glass of water for ten minutes is something. then maybe try one of the chat options above.',
                             ru: 'ты не обязан был это искать. но искал. это важно.<br>если позвонить кажется слишком большим — даже просто посидеть со стаканом воды десять минут уже что-то. потом попробуй один из чатов выше.' },

    /* ── ai-chat.html ────────────────────────────────────── */
    'ac.title':            { en: 'AI support — StillHere',           ru: 'AI-спутник — StillHere' },

    'ac.side.eyebrow':     { en: '— a quiet space',                   ru: '— тихое место' },
    'ac.side.title':       { en: 'your conversations',                ru: 'твои диалоги' },
    'ac.side.new':         { en: 'start a new conversation',          ru: 'начать новый диалог' },
    'ac.side.search':      { en: 'search past chats…',                ru: 'найти в прошлых чатах…' },
    'ac.side.empty':       { en: 'no conversations yet.<br>start one above.',
                             ru: 'пока нет диалогов.<br>начни первый выше.' },
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
                             ru: 'для поддержки, не для медицинских советов. если тебе сейчас очень тяжело, пожалуйста, обратись к <a href="docs/html/crisis-resources.html">живому человеку</a>.' },

    'ac.delmod.title':     { en: 'delete this conversation?',         ru: 'удалить этот диалог?' },
    'ac.delmod.desc':      { en: 'this can\'t be undone.',            ru: 'это нельзя отменить.' },
    'ac.delmod.cancel':    { en: 'cancel',                            ru: 'отмена' },
    'ac.delmod.confirm':   { en: 'yes, delete',                       ru: 'да, удалить' },

    /* Dynamic strings rendered by JS/ai-chat.js */
    'ac.chat.new':         { en: 'new conversation',                  ru: 'новый диалог' },
    'ac.chat.untitled':    { en: 'untitled',                          ru: 'без названия' },
    'ac.bucket.today':     { en: 'today',                             ru: 'сегодня' },
    'ac.bucket.thisweek':  { en: 'this week',                         ru: 'на этой неделе' },
    'ac.bucket.earlier':   { en: 'earlier',                           ru: 'раньше' },
    'ac.err.signin':       { en: 'sign in →',                          ru: 'войти →' },
    'ac.err.reach':        { en: 'couldn\'t reach the companion right now.',
                             ru: 'сейчас не получилось дозвониться до собеседника.' },
    'ac.err.retry':        { en: 'please try again in a moment.',      ru: 'попробуй ещё раз через минуту.' },

    /* ── notifications.js (bell dropdown + dynamic items) ── */
    'nt.aria':             { en: 'Notifications',                      ru: 'Уведомления' },
    'nt.title':            { en: 'notifications',                      ru: 'уведомления' },
    'nt.clear':            { en: 'mark all read',                      ru: 'отметить всё как прочитанное' },
    'nt.empty.tag':        { en: 'nothing new',                        ru: 'ничего нового' },
    'nt.empty.text':       { en: 'quiet for now.',                     ru: 'пока тихо.' },
    'nt.showmore':         { en: 'show {n} more',                      ru: 'ещё {n}' },
    'nt.type.reply':       { en: 'replied to your comment',            ru: 'ответил на твой комментарий' },
    'nt.type.respond':     { en: 'responded to your story',            ru: 'откликнулся на твою историю' },
    'nt.actor.someone':    { en: 'someone',                            ru: 'кто-то' },
    'nt.time.now':         { en: 'just now',                           ru: 'только что' },
    'nt.time.m':           { en: ' min ago',                           ru: ' мин назад' },
    'nt.time.h':           { en: 'h ago',                              ru: ' ч назад' },
    'nt.time.d':           { en: 'd ago',                              ru: ' д назад' },

    /* ── moderation.js (block messages, ban warnings) ── */
    'mod.label.violation': { en: 'Community guidelines violation',     ru: 'Нарушение правил сообщества' },
    'mod.banned':          { en: 'Account suspended',                  ru: 'Аккаунт заблокирован' },
    'mod.time.hour':       { en: 'hour',                               ru: 'час' },
    'mod.time.hours':      { en: 'hours',                              ru: 'часов' },
    'mod.time.day':        { en: 'day',                                ru: 'день' },
    'mod.time.days':       { en: 'days',                               ru: 'дней' },
    'mod.attempt.one':     { en: 'attempt remaining',                  ru: 'попытка осталась' },
    'mod.attempt.many':    { en: 'attempts remaining',                 ru: 'попыток осталось' },

    /* ── index.html (landing) ────────────────────────────── */
    'idx.hero.eyebrow':    { en: '<em>—</em> 01 / Presence, not solutions',
                             ru: '<em>—</em> 01 / Быть рядом, не решения' },
    'idx.hero.location':   { en: 'Global · Anonymous · Free',
                             ru: 'Глобально · Анонимно · Бесплатно' },
    'idx.hero.subtitle':   { en: 'a space for <em>presence</em>,<br>not solutions.',
                             ru: 'место, где важнее <em>быть рядом</em>,<br>а не искать решения.' },
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
    'idx.c4.desc2':        { en: 'no bots, no performance — mindful, honest conversation, in any language.',
                             ru: 'никаких ботов, никакого позёрства — внимательный, честный диалог, на любом языке.' },

    'idx.c5.num':          { en: '05 — human',            ru: '05 — человеческое' },
    'idx.c5.title':        { en: 'real people, real words',
                             ru: 'настоящие люди, настоящие слова' },
    'idx.c5.desc':         { en: 'no bots, no performance — mindful, honest conversation, in any language.',
                             ru: 'никаких ботов, никакого позёрства — внимательный, честный диалог, на любом языке.' },

    'idx.quote.text':      { en: '"you don\'t always need to be <em>fixed.</em><br>sometimes you just need to be <em>witnessed.</em>"',
                             ru: '«тебя не всегда нужно <em>чинить.</em><br>иногда тебе нужно, чтобы тебя просто <em>услышали.</em>»' },
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
    'aria.close':          { en: 'Close',                 ru: 'Закрыть' },
    'aria.send':           { en: 'Send',                  ru: 'Отправить' },
    'aria.scrollnext':     { en: 'Scroll to next section', ru: 'Прокрутить к следующему разделу' },
    'aria.writeletter':    { en: 'Write a quiet letter',  ru: 'Написать тихое письмо' },
    'aria.theme':          { en: 'Theme',                 ru: 'Тема оформления' },
    'aria.projstatus':     { en: 'Project status',        ru: 'Статус проекта' },

    /* ── language toggle button ──────────────────────────── */
    'i18n.toggleAria':     { en: 'Switch language',       ru: 'Сменить язык' },

    /* ── coming-soon.html ──────────────────────────────── */
    'cs.eyebrow':          { en: '<em>—</em> still in the making',
                             ru: '<em>—</em> ещё в работе' },
    'cs.title':            { en: 'coming <em>soon.</em><img src="assets/letters/_Special Characters/Asterisk_01.png" class="cs-title-star" alt="" aria-hidden="true">',
                             ru: 'скоро <em>будет.</em><img src="assets/letters/_Special Characters/Asterisk_01.png" class="cs-title-star" alt="" aria-hidden="true">' },
    'cs.lede':             { en: 'this corner of StillHere isn\'t quite ready yet — we\'re <em>still here</em>, making it carefully. nothing rushed, nothing filler. when it lands, it\'ll feel like the rest of the place.',
                             ru: 'этот уголок StillHere ещё не готов — мы <em>здесь</em>, проектируем его. без спешки, без воды. когда он появится, он будет в одном духе с остальным местом.' },
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
                             ru: 'маленькие комнаты, где двое могут поговорить вне общей ленты. полностью зашифровано на нашей стороне, ничего не пишется в логи, ничего нельзя восстановить.' },
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
    'main.feed.eyebrow':   { en: '— STORIES SHARED HERE', ru: '— ИСТОРИИ ИЗ ЛЕНТЫ' },
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
    'main.filter.discussed': { en: 'Most Discussed',      ru: 'Самые обсуждаемые'},
    'main.filter.unanswered': { en: 'Needs Support',      ru: 'Нуждающиеся в поддержке'},



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
                                   ru: 'Если тебе сейчас очень тяжело — позвони на горячую линию:' },
    'main.widget.crisis.btn':    { en: 'Crisis Hotlines',        ru: 'Линии помощи' },
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
                                   ru: 'Короткие записки, на которые никто не ответит. Читай, когда нужно почувствовать, что ты не один.' },
    'main.widget.letters.link':  { en: 'more quiet letters',     ru: 'больше тихих писем' },

    /* Burger menu — Quiet letters page link */
    'menu.letters':              { en: 'Quiet letters',          ru: 'Тихие письма' },

    'main.post.support':         { en: "I'm here",               ru: 'Я рядом' },
    'main.post.support.active':  { en: 'here',                   ru: 'Я рядом' },
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
    /* ── Crisis-detection care modal ─────────────────────────────
       Shown when a post/comment/letter/AI-chat message matches a
       distress pattern. Tone: warm, agency-respecting, paper-stamp. */
    'crisis.high.title':         { en: 'before you keep going —',
                                   ru: 'прежде чем продолжишь —' },
    'crisis.high.desc':          { en: 'what you wrote sounds like you may be in pain right now. ' +
                                       'we\'re not an emergency service — but real, trained people ' +
                                       '<em>are</em>, and they\'re free, anonymous, 24/7.',
                                   ru: 'то, что ты написал, звучит так, будто тебе сейчас очень больно. ' +
                                       'мы не служба экстренной помощи — но <em>живые люди</em>, ' +
                                       'обученные слушать, есть. они бесплатные, анонимные, круглосуточно.' },
    'crisis.soft.title':         { en: 'we noticed something heavy',
                                   ru: 'кажется, тебе тяжело' },
    'crisis.soft.desc':          { en: 'this can stay here, and you can post it. just — if it helps — ' +
                                       'there\'s <em>someone who listens</em>, available right now, free.',
                                   ru: 'это может остаться здесь, и ты можешь опубликовать. просто — ' +
                                       'если поможет — есть <em>кто-то, кто выслушает</em>, прямо сейчас, бесплатно.' },
    'crisis.btn.see':            { en: 'see who can listen now',
                                   ru: 'кто может выслушать сейчас' },
    'crisis.btn.keep.high':      { en: 'I\'m okay — post it anyway',
                                   ru: 'я в порядке — отправить' },
    'crisis.btn.keep.soft':      { en: 'I\'m okay — post anyway',
                                   ru: 'я в порядке — отправить' },
    'crisis.foot':               { en: 'nothing you write is deleted by this message. it\'s here when you\'re ready.',
                                   ru: 'это сообщение ничего не удаляет. твоё письмо здесь, когда ты будешь готов.' },

    'main.toast.linkcopied':     { en: 'Link copied',            ru: 'Ссылка скопирована' },
    'main.toast.saved':          { en: 'Saved',                  ru: 'Сохранено' },
    'main.toast.unsaved':        { en: 'Removed from saved',     ru: 'Убрано из сохранённых' },
    'main.toast.presence':       { en: 'they know someone is here.',
                                   ru: 'они знают, что кто-то рядом.' },
    'main.toast.presence.off':   { en: 'okay — quietly stepping back.',
                                   ru: 'хорошо — тихо ухожу.' },
    'main.tooltip.noadvice':     { en: 'they asked for presence, not advice.',
                                   ru: 'они просят просто побыть рядом, а не советов.' },
    'main.loading.stories':      { en: 'gathering stories…',     ru: 'собираем истории…' },
    'main.empty.savedTitle':     { en: 'No saved stories yet',   ru: 'Пока ничего не сохранено' },
    'main.empty.savedText':      { en: 'Tap “Save Post” on any story to keep it here.',
                                   ru: 'Нажми «Сохранить» на любой истории, чтобы она осталась здесь.' },
    'main.empty.filteredTitle':  { en: 'Nothing matches these filters',
                                   ru: 'Под эти фильтры ничего не подходит' },
    'main.empty.filteredText':   { en: 'Try clearing a filter or come back later.',
                                   ru: 'Попробуй убрать фильтр или зайди позже.' },
    'main.empty.share':          { en: 'share something',        ru: 'поделиться' },
    'main.empty.clear':          { en: 'clear filters',          ru: 'сбросить фильтры' },

    /* ── post.html — comments empty state ── */
    'post.comments.emptyTitle':  { en: 'No replies yet',
                                   ru: 'Пока нет ответов' },
    'post.comments.emptyText':   { en: 'be the first to respond — quietly is fine.',
                                   ru: 'ответь первым — тихо тоже подойдёт.' },

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
                                   ru: 'твои истории и сохранённые на месте, там, где ты их оставил' },
    'login.intro.b3':            { en: 'nothing was sold, profiled, or shared while you were away',
                                   ru: 'ничего не продано, не профилировано и не передано, пока тебя не было' },

    'login.card.eyebrow':        { en: '— sign in',               ru: '— вход' },
    'login.card.title':          { en: 'Welcome back',            ru: 'С возвращением' },
    'login.card.sub':            { en: 'use the handle &amp; password you picked when you joined.',
                                   ru: 'введи ник и пароль, которые ты задал при регистрации.' },

    'login.field.username':      { en: 'username',                ru: 'ник' },
    'login.field.username.ph':   { en: 'yourhandle',              ru: 'твой ник' },
    'login.field.password':      { en: 'password',                ru: 'пароль' },
    'login.pw.show':             { en: 'show',                    ru: 'показать' },
    'login.pw.hide':             { en: 'hide',                    ru: 'скрыть' },
    'login.pw.aria':             { en: 'Show password',           ru: 'Показать пароль' },

    'login.submit':              { en: 'sign in',                 ru: 'войти' },
    'login.forgot':              { en: 'forgot password?',        ru: 'забыли пароль?' },
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
                                   ru: 'твои данные <strong>никогда не продаются, не используются для профилирования и не идут в обучение AI</strong>' },
    'reg.intro.b4':              { en: 'delete your account anytime — really, the button works',
                                   ru: 'удалить аккаунт можно в любой момент — правда, кнопка работает' },

    'reg.card.eyebrow':          { en: '— create account',       ru: '— регистрация' },
    'reg.card.title':            { en: 'Create your account',    ru: 'Создай аккаунт' },

    'reg.field.firstname':       { en: 'first name',             ru: 'имя' },
    'reg.field.lastname':        { en: 'last name',              ru: 'фамилия' },
    'reg.field.optional':        { en: 'optional',               ru: 'необязательно' },
    'reg.field.username':        { en: 'username',               ru: 'ник' },
    'reg.field.username.ph':     { en: 'yourhandle',             ru: 'твой ник' },
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
