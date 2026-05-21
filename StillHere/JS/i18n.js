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
    'menu.guidelines':     { en: 'Guidelines',            ru: 'Правила' },
    'menu.statistics':     { en: 'Statistics',            ru: 'Статистика' },

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

    'main.post.support':         { en: 'Support',                ru: 'Поддержать' },
    'main.post.responses':       { en: 'Responses',              ru: 'Ответов' },
    'main.post.share':           { en: 'Share',                  ru: 'Поделиться' },
    'main.post.menu.save':       { en: 'Save Post',              ru: 'Сохранить пост' },
    'main.post.menu.unsave':     { en: 'Unsave',                 ru: 'Убрать из сохранённых' },
    'main.post.menu.copy':       { en: 'Copy Link',              ru: 'Скопировать ссылку' },
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
