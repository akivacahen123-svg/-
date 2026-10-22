(function () {
  'use strict';

  function load(key, fallback) {
    try { var v = localStorage.getItem('nf-' + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('nf-' + key, JSON.stringify(value)); } catch (e) { /* מצב פרטי */ }
  }

  // תפריט מובייל
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

  // התקדמות בקורס: סימון שיעורים שהושלמו בכל רשימה באתר
  var done = load('done', []);
  function paintProgress() {
    document.querySelectorAll('[data-lesson]').forEach(function (el) {
      el.classList.toggle('is-complete', done.indexOf(+el.getAttribute('data-lesson')) > -1);
    });
    document.querySelectorAll('[data-course-progress]').forEach(function (el) {
      el.textContent = done.length;
    });
    document.querySelectorAll('[data-course-bar]').forEach(function (el) {
      el.style.width = (done.length / 22 * 100) + '%';
    });
  }
  paintProgress();

  var lesson = document.querySelector('[data-current-lesson]');
  if (!lesson) return;
  var n = +lesson.getAttribute('data-current-lesson');

  // כפתור ״סיימתי את השיעור״
  var btn = document.querySelector('[data-complete]');
  function paintBtn() {
    var is = done.indexOf(n) > -1;
    if (!btn) return;
    btn.classList.toggle('is-complete', is);
    btn.textContent = is ? '✓ השיעור הושלם' : 'סיימתי את השיעור';
  }
  if (btn) {
    btn.addEventListener('click', function () {
      var i = done.indexOf(n);
      if (i > -1) done.splice(i, 1); else done.push(n);
      save('done', done); paintBtn(); paintProgress();
    });
    paintBtn();
  }

  // משימות למחר בבוקר — נשמרות
  var tasks = load('tasks-' + n, {});
  document.querySelectorAll('.task input').forEach(function (b, i) {
    b.checked = !!tasks[i];
    b.addEventListener('change', function () { tasks[i] = b.checked; save('tasks-' + n, tasks); });
  });

  // בוחן
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
        var answered = document.querySelectorAll('.quiz-q.answered');
        if (all.length === answered.length) {
          var score = document.querySelectorAll('.quiz-q').length - document.querySelectorAll('.quiz-opt.wrong').length;
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
})();
