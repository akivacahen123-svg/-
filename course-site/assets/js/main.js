(function () {
  'use strict';

  var CFG = window.NF_CONFIG || {};
  var root = document.documentElement;

  function load(key, fallback) {
    try { var v = localStorage.getItem('nf-' + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('nf-' + key, JSON.stringify(value)); } catch (e) { /* מצב פרטי */ }
  }

  // ---------- תפריט מובייל ----------
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------- אנימציית כניסה בגלילה ----------
  // התוכן גלוי תמיד; כשאלמנט נכנס למסך הוא מקבל .in ומונפש פעם אחת.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) io.observe(el);
    });
  }

  // ---------- גישה לקורס ----------
  // אותו גיבוב כמו fnv1a ב-build.py
  function fnv1a(text) {
    var h = 0x811c9dc5, bytes = unescape(encodeURIComponent(String(text).trim().toUpperCase()));
    for (var i = 0; i < bytes.length; i++) { h ^= bytes.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function grantAccess() {
    try { localStorage.setItem('nf-access', window.NF_ACCESS); } catch (e) { /* */ }
    root.classList.remove('no-access'); root.classList.add('has-access');
  }
  function tryCode(code) {
    if (code && fnv1a(code) === window.NF_ACCESS) { grantAccess(); return true; }
    return false;
  }
  document.querySelectorAll('[data-access-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[name=code]');
      var msg = form.querySelector('[data-access-msg]');
      if (tryCode(input.value)) {
        msg.textContent = 'הגישה נפתחה. בהצלחה בקורס!';
        msg.className = 'access-msg ok';
        if (document.body.hasAttribute('data-gated')) window.scrollTo(0, 0);
      } else {
        msg.textContent = 'הקוד לא תקין. בדקו שהעתקתם אותו בדיוק כפי שקיבלתם, או פנו אלינו.';
        msg.className = 'access-msg err';
        input.focus();
      }
    });
  });
  // חזרה מדף התשלום: welcome.html?code=XXXX
  try {
    var qp = new URLSearchParams(location.search).get('code');
    if (qp) tryCode(qp);
  } catch (e) { /* */ }

  // ---------- התקדמות בקורס ----------
  var done = load('done', []);
  function paintProgress() {
    document.querySelectorAll('[data-lesson]').forEach(function (el) {
      el.classList.toggle('is-complete', done.indexOf(+el.getAttribute('data-lesson')) > -1);
    });
    document.querySelectorAll('[data-course-progress]').forEach(function (el) { el.textContent = done.length; });
    document.querySelectorAll('[data-course-bar]').forEach(function (el) { el.style.width = (done.length / 22 * 100) + '%'; });
  }
  paintProgress();

  var lesson = document.querySelector('[data-current-lesson]');
  if (lesson) {
    var n = +lesson.getAttribute('data-current-lesson');
    var btn = document.querySelector('[data-complete]');
    var paintBtn = function () {
      var is = done.indexOf(n) > -1;
      btn.classList.toggle('is-complete', is);
      btn.textContent = is ? '✓ השיעור הושלם' : 'סיימתי את השיעור';
    };
    if (btn) {
      btn.addEventListener('click', function () {
        var i = done.indexOf(n);
        if (i > -1) done.splice(i, 1); else done.push(n);
        save('done', done); paintBtn(); paintProgress();
      });
      paintBtn();
    }

    var tasks = load('tasks-' + n, {});
    document.querySelectorAll('.task input').forEach(function (b, i) {
      b.checked = !!tasks[i];
      b.addEventListener('change', function () { tasks[i] = b.checked; save('tasks-' + n, tasks); });
    });

    document.querySelectorAll('.quiz-q').forEach(function (q) {
      var correct = +q.getAttribute('data-answer');
      q.querySelectorAll('.quiz-opt').forEach(function (opt, i) {
        opt.addEventListener('click', function () {
          if (q.classList.contains('answered')) return;
          q.classList.add('answered');
          opt.classList.add(i === correct ? 'right' : 'wrong');
          q.querySelectorAll('.quiz-opt')[correct].classList.add('right');
          q.querySelector('.quiz-why').hidden = false;
          var all = document.querySelectorAll('.quiz-q');
          if (all.length === document.querySelectorAll('.quiz-q.answered').length) {
            var score = all.length - document.querySelectorAll('.quiz-opt.wrong').length;
            var s = document.querySelector('[data-quiz-score]');
            if (s) {
              s.hidden = false;
              s.textContent = score === all.length ? 'מושלם: ' + score + '/' + all.length + '. אפשר להמשיך לשיעור הבא.' :
                score + '/' + all.length + ' נכונות. כדאי לחזור לחלק הרלוונטי בשיעור.';
            }
          }
        });
      });
    });
  }

  // ---------- טופס לידים בתצוגה מקדימה ----------
  // באתר האמיתי הטופס נשלח כרגיל (Lando). בתוך מסגרת אין לאן לשלוח — מציגים אישור בדף.
  if (window.self !== window.top) {
    document.querySelectorAll('.lead-form').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var box = document.createElement('div');
        box.className = 'lead-thanks';
        box.setAttribute('role', 'status');
        box.innerHTML = '<strong>תודה! הפרטים התקבלו.</strong><span>(תצוגה מקדימה — באתר האמיתי הפרטים נשלחים למערכת.)</span>';
        f.replaceWith(box);
      });
    });
  }

  // ---------- תוסף נגישות ----------
  var A11Y = [
    ['font', 'הגדלת טקסט', 3], ['spacing', 'ריווח טקסט', 1], ['contrast', 'ניגודיות גבוהה', 1],
    ['gray', 'גווני אפור', 1], ['links', 'הדגשת קישורים', 1], ['readable', 'גופן קריא', 1],
    ['motion', 'עצירת אנימציות', 1], ['cursor', 'סמן גדול', 1],
  ];
  var a11y = load('a11y', {});
  function applyA11y() {
    A11Y.forEach(function (o) {
      for (var lv = 1; lv <= o[2]; lv++) root.classList.remove('a11y-' + o[0] + (o[2] > 1 ? '-' + lv : ''));
      var v = a11y[o[0]] || 0;
      if (v) root.classList.add('a11y-' + o[0] + (o[2] > 1 ? '-' + v : ''));
    });
    document.querySelectorAll('.a11y-opt').forEach(function (b) {
      var v = a11y[b.dataset.k] || 0, max = +b.dataset.max;
      b.setAttribute('aria-pressed', v ? 'true' : 'false');
      var lvl = b.querySelector('.lvl'); if (lvl) lvl.textContent = max > 1 && v ? v + '/' + max : '';
    });
  }
  function buildA11y() {
    var wrap = document.createElement('div');
    wrap.className = 'a11y-widget';
    wrap.innerHTML =
      '<button type="button" class="a11y-toggle" aria-expanded="false" aria-controls="a11y-panel" aria-label="תפריט נגישות">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M4 8.5c2.6.8 5.3 1.2 8 1.2s5.4-.4 8-1.2M12 9.7V15m0 0-3.5 6M12 15l3.5 6"/></svg></button>' +
      '<div class="a11y-panel" id="a11y-panel" role="dialog" aria-label="הגדרות נגישות" hidden>' +
      '<div class="a11y-head"><strong>נגישות</strong><button type="button" class="a11y-close" aria-label="סגירה">✕</button></div>' +
      '<div class="a11y-grid">' + A11Y.map(function (o) {
        return '<button type="button" class="a11y-opt" data-k="' + o[0] + '" data-max="' + o[2] + '" aria-pressed="false">' + o[1] + '<span class="lvl"></span></button>';
      }).join('') + '</div>' +
      '<div class="a11y-foot"><button type="button" class="a11y-reset">איפוס הגדרות</button>' +
      (CFG.a11y ? '<a href="' + CFG.a11y + '">הצהרת נגישות</a>' : '') + '</div></div>';
    document.body.appendChild(wrap);
    var tg = wrap.querySelector('.a11y-toggle'), panel = wrap.querySelector('.a11y-panel');
    function setOpen(open) {
      panel.hidden = !open; tg.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) panel.querySelector('.a11y-opt').focus(); else tg.focus();
    }
    tg.addEventListener('click', function () { setOpen(panel.hidden); });
    wrap.querySelector('.a11y-close').addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
    wrap.querySelectorAll('.a11y-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.k, max = +b.dataset.max;
        a11y[k] = ((a11y[k] || 0) + 1) % (max + 1);
        save('a11y', a11y); applyA11y();
      });
    });
    wrap.querySelector('.a11y-reset').addEventListener('click', function () { a11y = {}; save('a11y', a11y); applyA11y(); });
  }
  buildA11y();
  applyA11y();

  // ---------- עוגיות ומדידה (רק אם הוגדרו מזהים) ----------
  function loadTracking() {
    if (CFG.ga4) {
      var g = document.createElement('script'); g.async = true;
      g.src = 'https://www.googletagmanager.com/gtag/js?id=' + CFG.ga4; document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', CFG.ga4);
    }
    if (CFG.pixel) {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', CFG.pixel); window.fbq('track', 'PageView');
    }
  }
  if (CFG.ga4 || CFG.pixel) {
    var consent = load('consent', null);
    if (consent === 'yes') loadTracking();
    else if (consent === null) {
      var bar = document.createElement('div');
      bar.className = 'cookie-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'עוגיות');
      bar.innerHTML = '<p>אנחנו משתמשים בעוגיות למדידה ולשיפור האתר והפרסום. <a href="' + CFG.privacy + '">מדיניות פרטיות</a></p>' +
        '<div><button type="button" class="btn btn-primary" data-c="yes">מאשר/ת</button><button type="button" class="btn btn-outline" data-c="no">רק הכרחיות</button></div>';
      document.body.appendChild(bar);
      bar.addEventListener('click', function (e) {
        var c = e.target.getAttribute('data-c'); if (!c) return;
        save('consent', c); bar.remove(); if (c === 'yes') loadTracking();
      });
    }
  }
})();
