'use strict';

(function () {
  if (!window.SH_SUPABASE_URL || !window.supabase) return;

  var db = window.supabase.createClient(window.SH_SUPABASE_URL, window.SH_SUPABASE_KEY);
  var isDark = function () {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  };

  /* ── Helpers ─────────────────────────────────────────── */

  function escHtml(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function timeAgo(iso) {
    var d = Math.floor((Date.now() - new Date(iso)) / 1000);
    var tt = function (k, fb) { return (window.SH_I18N && SH_I18N.t(k)) || fb; };
    if (d < 60)    return tt('st.time.now', 'just now');
    if (d < 3600)  return Math.floor(d / 60)   + tt('st.time.m', 'm ago');
    if (d < 86400) return Math.floor(d / 3600) + tt('st.time.h', 'h ago');
    return Math.floor(d / 86400) + tt('st.time.d', 'd ago');
  }

  function fmt(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0','') + 'k';
    return String(n);
  }

  /* Animated counter — rolls up from 0 to target */
  function animateCount(id, target) {
    var el = document.getElementById(id);
    if (!el || target === null) return;
    var duration = 1000;
    var start    = null;
    function step(ts) {
      if (!start) start = ts;
      var p   = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * ease));
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target);
    }
    requestAnimationFrame(step);
  }

  /* ── Build 30-day date buckets ───────────────────────── */

  function buildDayBuckets(n) {
    var buckets = {};
    for (var i = n - 1; i >= 0; i--) {
      var d  = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    return buckets;
  }

  /* ── Fetch all data ──────────────────────────────────── */

  var since30d = new Date(Date.now() - 30 * 86400000).toISOString();
  var since7d  = new Date(Date.now() -  7 * 86400000).toISOString();

  Promise.all([
    /* 0 */ db.from('profiles').select('id', { count: 'exact', head: true }),
    /* 1 */ db.from('posts').select('id', { count: 'exact', head: true }),
    /* 2 */ db.from('comments').select('id', { count: 'exact', head: true }),
    /* 3 */ db.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    /* 4 */ db.from('comments').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    /* 5 */ db.from('posts').select('created_at, lang, topics').gte('created_at', since30d),
    /* 6 */ db.from('comments').select('created_at').gte('created_at', since30d),
    /* 7 */ db.from('posts')
              .select('id, title, created_at, profiles(display_name, username)')
              .order('created_at', { ascending: false })
              .limit(8),
  ]).then(function (r) {

    /* ── Big numbers ── */
    animateCount('stat-users',    r[0].count ?? 0);
    animateCount('stat-posts',    r[1].count ?? 0);
    animateCount('stat-comments', r[2].count ?? 0);
    animateCount('stat-week',     (r[3].count ?? 0) + (r[4].count ?? 0));

    /* Trend labels */
    var weekPosts    = r[3].count ?? 0;
    var weekComments = r[4].count ?? 0;
    /* "+N this week" trend strings — i18n so the label flips with
       the language toggle. */
    var weekLabel = (window.SH_I18N && SH_I18N.t('st.trend.week')) || 'this week';
    setTrend('trend-posts',    weekPosts,    weekLabel);
    setTrend('trend-comments', weekComments, weekLabel);

    var posts30d    = r[5].data || [];
    var comments30d = r[6].data || [];

    /* ── Chart ── */
    renderGrowthChart(posts30d, comments30d);

    /* ── Languages ── */
    renderBars('lang-bars', getLangCounts(posts30d), 'bar-fill--purple');

    /* ── Topics ── */
    renderBars('topic-bars', getTopicCounts(posts30d), 'bar-fill--peach');

    /* ── Recent posts ── */
    renderRecentPosts(r[7].data || r[7].error
      ? (r[7].data || [])
      : []);

    /* ── Last-updated stamp ── */
    var el = document.getElementById('lastUpdated');
    if (el) {
      var pfx = (window.SH_I18N && SH_I18N.t) ? SH_I18N.t('st.updated.prefix') : 'Updated';
      el.textContent = pfx + ' ' + new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    }
  });

  /* ── Trend label ─────────────────────────────────────── */

  function setTrend(id, count, label) {
    var el = document.getElementById(id);
    if (!el || !count) return;
    el.textContent = '+' + count + ' ' + label;
    el.style.color = 'var(--color-success)';
  }

  /* ── Language counts ─────────────────────────────────── */

  function getLangCounts(posts) {
    var counts = {};
    posts.forEach(function (p) {
      var l = (p.lang || 'other').toUpperCase();
      counts[l] = (counts[l] || 0) + 1;
    });
    return counts;
  }

  function getTopicCounts(posts) {
    var counts = {};
    posts.forEach(function (p) {
      (p.topics || []).forEach(function (t) {
        var label = t.charAt(0).toUpperCase() + t.slice(1);
        counts[label] = (counts[label] || 0) + 1;
      });
    });
    return counts;
  }

  /* ── Bar chart renderer ──────────────────────────────── */

  function renderBars(containerId, counts, fillClass) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var sorted = Object.entries(counts)
      .sort(function (a, b) { return b[1] - a[1]; })
      .slice(0, 6);

    if (!sorted.length) {
      var msg = (window.SH_I18N && SH_I18N.t) ? SH_I18N.t('st.empty.data') : 'No data yet';
      container.innerHTML = '<p style="color:var(--text-light);font-size:13px;text-align:center;padding:24px 0">' + msg + '</p>';
      return;
    }

    var total = sorted.reduce(function (s, e) { return s + e[1]; }, 0) || 1;

    container.innerHTML = sorted.map(function (entry) {
      var label = entry[0];
      var count = entry[1];
      var pct   = Math.round(count / total * 100);
      return (
        '<div class="bar-row">' +
          '<span class="bar-label">' + escHtml(label) + '</span>' +
          '<div class="bar-track">' +
            '<div class="' + fillClass + ' bar-fill" style="width:0%" data-target="' + pct + '"></div>' +
          '</div>' +
          '<span class="bar-pct">' + pct + '%</span>' +
        '</div>'
      );
    }).join('');

    /* Animate bars after a tick so CSS transition fires */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        container.querySelectorAll('.bar-fill').forEach(function (el) {
          el.style.width = el.getAttribute('data-target') + '%';
        });
      });
    });
  }

  /* ── Recent posts ────────────────────────────────────── */

  function renderRecentPosts(posts) {
    var container = document.getElementById('recent-posts');
    if (!container) return;

    if (!posts.length) {
      var msg = (window.SH_I18N && SH_I18N.t) ? SH_I18N.t('st.empty.stories') : 'No stories yet';
      container.innerHTML = '<p style="color:var(--text-light);font-size:13px;text-align:center;padding:24px 0">' + msg + '</p>';
      return;
    }

    var anonLabel    = (window.SH_I18N && SH_I18N.t('st.author.anon')) || 'Anonymous';
    var untitledTxt  = (window.SH_I18N && SH_I18N.t('st.post.untitled')) || '(untitled)';
    container.innerHTML = posts.map(function (p) {
      var author = p.profiles
        ? escHtml(p.profiles.display_name || p.profiles.username)
        : anonLabel;
      var title = escHtml(p.title || untitledTxt);
      return (
        '<a href="post.html?id=' + escHtml(p.id) + '" class="recent-post-row">' +
          '<span class="rp-title">' + title + '</span>' +
          '<span class="rp-meta">' + author + ' &nbsp;·&nbsp; ' + timeAgo(p.created_at) + '</span>' +
        '</a>'
      );
    }).join('');
  }

  /* ── Growth chart ────────────────────────────────────── */

  function renderGrowthChart(posts, comments) {
    var postBuckets    = buildDayBuckets(30);
    var commentBuckets = buildDayBuckets(30);

    posts.forEach(function (p) {
      var k = p.created_at.slice(0, 10);
      if (k in postBuckets) postBuckets[k]++;
    });
    comments.forEach(function (c) {
      var k = c.created_at.slice(0, 10);
      if (k in commentBuckets) commentBuckets[k]++;
    });

    var labels = Object.keys(postBuckets).map(function (d) {
      /* Localised date — flips to "29 мая" in Russian. */
      var stLang = (window.SH_I18N && SH_I18N.getLang) ? SH_I18N.getLang() : 'en';
      var stLocale = stLang === 'ru' ? 'ru-RU' : 'en-GB';
      return new Date(d + 'T12:00:00').toLocaleDateString(stLocale, { month: 'short', day: 'numeric' });
    });
    var postData    = Object.values(postBuckets);
    var commentData = Object.values(commentBuckets);

    var canvas = document.getElementById('growthChart');
    if (!canvas) return;

    var dark       = isDark();
    var gridColor  = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    var tickColor  = dark ? '#52506a' : '#8A8A8A';
    var tooltipBg  = dark ? 'rgba(18,15,28,0.97)' : 'rgba(255,255,255,0.97)';
    var tooltipFg  = dark ? '#ede9f8' : '#111827';

    /* Build gradients after chartArea is known via afterDraw plugin */
    var chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: (window.SH_I18N && SH_I18N.t('st.chart.stories')) || 'Stories',
            data: postData,
            borderColor: '#a691c2',
            backgroundColor: 'rgba(166,145,194,0.12)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#a691c2',
          },
          {
            label: (window.SH_I18N && SH_I18N.t('st.chart.responses')) || 'Responses',
            data: commentData,
            borderColor: '#e0bda5',
            backgroundColor: 'rgba(224,189,165,0.10)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#e0bda5',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipFg,
            bodyColor: tickColor,
            borderColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
          },
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              maxTicksLimit: 8,
              font: { family: 'Ubuntu', size: 11 },
            },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: tickColor,
              stepSize: 1,
              font: { family: 'Ubuntu', size: 11 },
            },
            beginAtZero: true,
          },
        },
      },
    });

    /* Custom legend */
    var legendEl = document.getElementById('chart-legend');
    if (legendEl) {
      legendEl.innerHTML = chart.data.datasets.map(function (ds) {
        return '<div class="legend-item">' +
          '<span class="legend-dot" style="background:' + ds.borderColor + '"></span>' +
          '<span>' + ds.label + '</span>' +
          '</div>';
      }).join('');
    }
  }

})();
