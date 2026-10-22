// ערכת הכלים — כל כלי מופעל לפי data-tool על ה-body
(function () {
  'use strict';

  // ---------- עזרים ----------
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function load(key, fallback) {
    try { var v = localStorage.getItem('nf-' + key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('nf-' + key, JSON.stringify(value)); } catch (e) { /* מצב פרטי */ }
  }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : 0; }
  function fmt(n, d) {
    if (!isFinite(n)) return '—';
    return n.toLocaleString('he-IL', { maximumFractionDigits: d === undefined ? 0 : d, minimumFractionDigits: 0 });
  }
  function money(n, d) { return isFinite(n) && n !== 0 ? '₪' + fmt(n, d === undefined ? 0 : d) : '—'; }
  function pct(n, d) { return isFinite(n) ? fmt(n * 100, d === undefined ? 1 : d) + '%' : '—'; }
  function div(a, b) { return b ? a / b : NaN; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lines(s) { return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }

  function copyText(text, btn) {
    var done = function () {
      if (!btn) return;
      var t = btn.textContent; btn.textContent = 'הועתק ✓';
      setTimeout(function () { btn.textContent = t; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); } catch (e) { /* */ } ta.remove();
  }

  // שמירה ושחזור אוטומטיים של כל השדות בטופס
  function persistForm(form, key, onChange) {
    var data = load(key, {});
    $$('[name]', form).forEach(function (el) {
      if (!(el.name in data)) return;
      if (el.type === 'checkbox') el.checked = !!data[el.name];
      else el.value = data[el.name];
    });
    var handler = function () {
      var out = {};
      $$('[name]', form).forEach(function (el) { out[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
      save(key, out);
      if (onChange) onChange(out);
    };
    form.addEventListener('input', handler);
    form.addEventListener('change', handler);
    handler();
    return handler;
  }
  function formData(form) {
    var out = {};
    $$('[name]', form).forEach(function (el) { out[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    return out;
  }
  // אישור בשתי לחיצות, בתוך הדף (במקום חלון confirm)
  function confirmClick(btn, label, action) {
    var original = btn.textContent, armed = false, t;
    btn.addEventListener('click', function () {
      if (!armed) {
        armed = true; btn.textContent = label; btn.classList.add('is-armed');
        t = setTimeout(function () { armed = false; btn.textContent = original; btn.classList.remove('is-armed'); }, 3000);
        return;
      }
      clearTimeout(t); armed = false; btn.textContent = original; btn.classList.remove('is-armed');
      action();
    });
  }

  function resetButton(key, form) {
    var b = $('[data-reset]');
    if (!b) return;
    confirmClick(b, 'לחצו שוב לניקוי', function () {
      try { localStorage.removeItem('nf-' + key); } catch (e) { /* */ }
      if (form) form.reset();
      location.reload();
    });
  }
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });
  // בתוך מסגרת (תצוגה מקדימה) אין אפשרות להדפיס — מסתירים את הכפתור
  if (window.self !== window.top) $$('[data-print]').forEach(function (b) { b.hidden = true; });

  // ---------- צ׳ק־ליסטים (חינמי + QA) ----------
  function initChecklist(key) {
    var boxes = $$('.check-item input[type=checkbox]');
    var state = load(key, {});
    boxes.forEach(function (b) { b.checked = !!state[b.id]; });
    function update() {
      var done = boxes.filter(function (b) { return b.checked; }).length;
      var total = boxes.length;
      $$('[data-progress-count]').forEach(function (el) { el.textContent = done; });
      $$('[data-progress-total]').forEach(function (el) { el.textContent = total; });
      $$('[data-progress-bar]').forEach(function (el) { el.style.width = (done / total * 100) + '%'; });
      $$('[data-group]').forEach(function (g) {
        var gb = $$('input[type=checkbox]', g);
        var gd = gb.filter(function (b) { return b.checked; }).length;
        var c = $('[data-group-count]', g);
        if (c) c.textContent = gd + '/' + gb.length;
        g.classList.toggle('is-done', gd === gb.length);
      });
      var msg = $('[data-progress-msg]');
      if (msg) {
        msg.textContent = done === total ? 'מוכנים להשקה. בהצלחה!' :
          done >= total * 0.75 ? 'כמעט שם — עוד ' + (total - done) + ' בדיקות.' :
          'עוד ' + (total - done) + ' בדיקות לפני שמשיקים.';
      }
    }
    boxes.forEach(function (b) {
      b.addEventListener('change', function () { state[b.id] = b.checked; save(key, state); update(); });
    });
    update();
    var meta = $('#qa-meta');
    if (meta) persistForm(meta, key + '-meta');
    var r = $('[data-reset]');
    if (r) confirmClick(r, 'לחצו שוב לאיפוס', function () {
      state = {}; save(key, state); boxes.forEach(function (b) { b.checked = false; }); update();
    });
  }

  // ---------- מחולל בריף ----------
  // רוחב פס במשפך בסקאלה לוגריתמית — כדי שגם שלבים קטנים ייראו
  function barW(v, max) { return v > 0 ? Math.max(Math.log10(v + 1) / Math.log10(max + 1) * 100, 3) : 0; }

  function initBrief() {
    var form = $('#tool-form'), out = $('#brief-out');
    function render(d) {
      var formats = ['1:1', '4:5', '9:16', '16:9'].filter(function (f) { return d['f_' + f.replace(':', '_')]; });
      var rows = [
        ['עסק / מוצר', d.business], ['מטרת הקמפיין', d.goal], ['קהל', d.audience],
        ['הכאב במילים של הלקוח', d.pain], ['מסר מרכזי (משפט אחד)', d.message],
        ['הוכחה', d.proof], ['ההצעה', d.offer], ['קריאה לפעולה', d.cta],
        ['זוויות לבדיקה', lines(d.angles).join(' · ')], ['פורמטים', formats.join(' · ')],
        ['חובה', d.must], ['אסור', d.avoid], ['דדליין', d.deadline],
      ];
      out.innerHTML = '<h3>בריף קריאייטיב' + (d.business ? ' — ' + esc(d.business) : '') + '</h3>' +
        '<dl class="doc-list">' + rows.map(function (r) {
          return '<dt>' + r[0] + '</dt><dd>' + (r[1] ? esc(r[1]).replace(/\n/g, '<br>') : '<span class="muted">—</span>') + '</dd>';
        }).join('') + '</dl>';
      out.dataset.text = rows.map(function (r) { return r[0] + ': ' + (r[1] || '—'); }).join('\n');
    }
    persistForm(form, 'tool-brief', render);
    resetButton('tool-brief', form);
    $('[data-copy]').addEventListener('click', function (e) { copyText(out.dataset.text, e.target); });
  }

  // ---------- מחשבון תקציב ----------
  function initBudget() {
    var form = $('#tool-form'), out = $('#budget-out');
    function render(d) {
      var customers = num(d.customers), close = num(d.close) / 100, profit = num(d.profit),
          cpl = num(d.cpl), days = num(d.days) || 30;
      var leads = Math.ceil(div(customers, close));
      var maxCpl = profit * close;
      var targetCpl = maxCpl * 0.5;
      var budget = leads * cpl;
      var daily = div(budget, days);
      var minDaily = cpl * 2;
      var costPerCustomer = div(cpl, close);
      var profitTotal = customers * profit - budget;
      var verdict, cls;
      if (!customers || !close || !profit || !cpl) { verdict = 'מלאו את כל השדות כדי לקבל חישוב.'; cls = ''; }
      else if (cpl > maxCpl) { verdict = 'העלות הצפויה לליד גבוהה ממחיר הליד המקסימלי — כל ליד מפסיד. שפרו סגירה, הוזילו ליד או העלו מחיר.'; cls = 'bad'; }
      else if (cpl > targetCpl) { verdict = 'רווחי, אבל על הקצה. כדאי לשפר את ההצעה או את אחוז הסגירה כדי שיהיה מרווח.'; cls = 'warn'; }
      else { verdict = 'המספרים עובדים: העלות הצפויה לליד בתוך היעד, עם מרווח רווח.'; cls = 'good'; }
      out.innerHTML =
        '<div class="kpis">' +
        kpi('לידים נדרשים', fmt(leads), 'לקוחות ÷ אחוז סגירה') +
        kpi('תקציב נדרש', money(budget), 'לידים × עלות לליד') +
        kpi('תקציב יומי', money(daily), 'ל-' + fmt(days) + ' ימים') +
        kpi('מחיר ליד מקסימלי', money(maxCpl), 'נקודת איזון') +
        kpi('יעד עלות לליד', money(targetCpl), 'חצי מהמקסימום — משאיר רווח') +
        kpi('עלות ללקוח', money(costPerCustomer), 'עלות לליד ÷ אחוז סגירה') +
        kpi('תקציב בדיקה מינימלי', money(minDaily) + ' ליום', 'פי 2–3 מהעלות לליד') +
        kpi('רווח גולמי אחרי פרסום', money(profitTotal), 'לקוחות × רווח − תקציב') +
        '</div><div class="verdict ' + cls + '">' + verdict + '</div>';
    }
    persistForm(form, 'tool-budget', render);
    resetButton('tool-budget', form);
  }
  function kpi(label, value, note, cls) {
    return '<div class="kpi ' + (cls || '') + '"><span>' + label + '</span><strong>' + value + '</strong>' +
      (note ? '<small>' + note + '</small>' : '') + '</div>';
  }

  // ---------- מחולל UTM ----------
  function clean(v) {
    return String(v || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-.{}]/g, '');
  }
  function initUtm() {
    var form = $('#tool-form'), out = $('#utm-out'), warn = $('#utm-warn');
    var history = load('tool-utm-history', []);
    function build(d) {
      var base = String(d.url || '').trim();
      var p = [['utm_source', d.source === 'other' ? d.source_other : d.source],
               ['utm_medium', d.medium === 'other' ? d.medium_other : d.medium],
               ['utm_campaign', d.campaign], ['utm_content', d.content], ['utm_term', d.term]];
      var warnings = [];
      if (/[֐-׿]/.test(p.map(function (x) { return x[1]; }).join(''))) warnings.push('עברית הוסרה — השתמשו באנגלית בלבד.');
      if (p.some(function (x) { return /[A-Z]/.test(x[1] || ''); })) warnings.push('אותיות גדולות הומרו לקטנות.');
      if (p.some(function (x) { return /\s/.test((x[1] || '').trim()); })) warnings.push('רווחים הוחלפו בקו תחתון.');
      if (base && !/^https?:\/\//.test(base)) warnings.push('הכתובת צריכה להתחיל ב-https://');
      var qs = p.filter(function (x) { return clean(x[1]); }).map(function (x) { return x[0] + '=' + clean(x[1]); }).join('&');
      var url = base ? base + (qs ? (base.indexOf('?') > -1 ? '&' : '?') + qs : '') : '';
      out.value = url;
      warn.innerHTML = warnings.map(function (w) { return '<li>' + w + '</li>'; }).join('');
      $('#utm-missing').hidden = !!(clean(p[0][1]) && clean(p[1][1]) && clean(p[2][1]));
      return url;
    }
    function drawHistory() {
      var tb = $('#utm-history');
      tb.innerHTML = history.length ? history.map(function (h, i) {
        return '<tr><td>' + esc(h.date) + '</td><td>' + esc(h.name || '') + '</td><td class="ltr"><a href="' + esc(h.url) + '" target="_blank" rel="noopener">' + esc(h.url) + '</a></td>' +
          '<td><button class="mini" data-copy-i="' + i + '">העתקה</button></td></tr>';
      }).join('') : '<tr><td colspan="4" class="muted">עדיין לא נשמרו קישורים.</td></tr>';
    }
    persistForm(form, 'tool-utm', build);
    $$('select', form).forEach(function (s) {
      var toggle = function () { var o = $('[data-other="' + s.name + '"]'); if (o) o.hidden = s.value !== 'other'; };
      s.addEventListener('change', toggle); toggle();
    });
    $('[data-copy]').addEventListener('click', function (e) { if (out.value) copyText(out.value, e.target); });
    $('[data-save]').addEventListener('click', function () {
      var url = build(formData(form)); if (!url) return;
      history.unshift({ url: url, name: formData(form).content || formData(form).campaign, date: new Date().toLocaleDateString('he-IL') });
      history = history.slice(0, 30); save('tool-utm-history', history); drawHistory();
    });
    $('#utm-history').addEventListener('click', function (e) {
      var i = e.target.getAttribute('data-copy-i'); if (i !== null) copyText(history[i].url, e.target);
    });
    $('[data-export]').addEventListener('click', function () {
      downloadCsv('utm-links.csv', [['תאריך', 'שם', 'קישור']].concat(history.map(function (h) { return [h.date, h.name, h.url]; })));
    });
    resetButton('tool-utm', form);
    drawHistory();
  }

  function downloadCsv(name, rows) {
    var csv = '﻿' + rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- טבלת בקרה שבועית ----------
  var CTRL_IN = [['label', 'שבוע', 'text'], ['spend', 'הוצאה ₪'], ['imp', 'חשיפות'], ['clicks', 'קליקים'],
                 ['leads', 'לידים'], ['relevant', 'רלוונטיים'], ['customers', 'לקוחות'], ['revenue', 'הכנסות ₪']];
  function calc(r) {
    return {
      cpm: div(r.spend, r.imp) * 1000, ctr: div(r.clicks, r.imp), cpc: div(r.spend, r.clicks),
      cvr: div(r.leads, r.clicks), cpl: div(r.spend, r.leads), rel: div(r.relevant, r.leads),
      cpa: div(r.spend, r.customers), roas: div(r.revenue, r.spend),
    };
  }
  var CTRL_OUT = [['cpm', 'CPM', money, true], ['ctr', 'CTR', pct, false], ['cpc', 'CPC', function (n) { return money(n, 1); }, true],
                  ['cvr', 'CVR', pct, false], ['cpl', 'CPL', money, true], ['rel', '% רלוונטי', function (n) { return pct(n, 0); }, false],
                  ['cpa', 'עלות ללקוח', money, true], ['roas', 'ROAS', function (n) { return isFinite(n) ? fmt(n, 2) : '—'; }, false]];
  // שדה ריק = אין נתון (ולא אפס)
  function blankNum(v) { return String(v == null ? '' : v).trim() === '' ? NaN : num(v); }
  function initControl() {
    var rows = load('tool-control', null) || [{ label: 'שבוע 1' }];
    var targets = $('#targets');
    var tbody = $('#ctrl-body'), thead = $('#ctrl-head');
    thead.innerHTML = '<tr>' + CTRL_IN.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') +
      CTRL_OUT.map(function (c) { return '<th class="calc">' + c[1] + '</th>'; }).join('') + '<th></th></tr>';
    function draw() {
      var t = formData(targets);
      tbody.innerHTML = rows.map(function (r, i) {
        var m = calc(numRow(r)), prev = i > 0 ? calc(numRow(rows[i - 1])) : null;
        return '<tr>' + CTRL_IN.map(function (c) {
          return '<td><input data-i="' + i + '" data-k="' + c[0] + '" value="' + esc(r[c[0]] || '') + '" ' +
            (c[2] ? '' : 'inputmode="decimal"') + ' aria-label="' + c[1] + '"></td>';
        }).join('') + CTRL_OUT.map(function (c) {
          var v = m[c[0]], cls = '';
          if (prev && isFinite(v) && isFinite(prev[c[0]]) && prev[c[0]]) {
            var ch = (v - prev[c[0]]) / prev[c[0]];
            if (Math.abs(ch) >= 0.2) cls = (ch > 0) === c[3] ? 'down' : 'up';
          }
          if (c[0] === 'cpl' && num(t.cpl) && isFinite(v)) cls = v > num(t.cpl) ? 'down' : 'up';
          if (c[0] === 'cpa' && num(t.cpa) && isFinite(v)) cls = v > num(t.cpa) ? 'down' : 'up';
          if (c[0] === 'roas' && num(t.roas) && isFinite(v)) cls = v < num(t.roas) ? 'down' : 'up';
          return '<td class="calc ' + cls + '">' + c[2](v) + '</td>';
        }).join('') + '<td><button class="mini" data-del="' + i + '" aria-label="מחיקת שורה">✕</button></td></tr>';
      }).join('');
    }
    function numRow(r) { var o = {}; CTRL_IN.forEach(function (c) { o[c[0]] = c[2] ? r[c[0]] : blankNum(r[c[0]]); }); return o; }
    tbody.addEventListener('input', function (e) {
      var i = e.target.dataset.i, k = e.target.dataset.k; if (i === undefined) return;
      rows[i][k] = e.target.value; save('tool-control', rows);
      clearTimeout(draw.t); draw.t = setTimeout(function () {
        var pos = [e.target.dataset.i, e.target.dataset.k]; draw();
        var el = $('input[data-i="' + pos[0] + '"][data-k="' + pos[1] + '"]', tbody); if (el) { el.focus(); var l = el.value.length; try { el.setSelectionRange(l, l); } catch (x) { /* */ } }
      }, 500);
    });
    tbody.addEventListener('click', function (e) {
      var d = e.target.dataset.del; if (d === undefined) return;
      rows.splice(+d, 1); if (!rows.length) rows.push({ label: 'שבוע 1' }); save('tool-control', rows); draw();
    });
    $('[data-add]').addEventListener('click', function () { rows.push({ label: 'שבוע ' + (rows.length + 1) }); save('tool-control', rows); draw(); });
    $('[data-export]').addEventListener('click', function () {
      downloadCsv('control-table.csv', [CTRL_IN.map(function (c) { return c[1]; }).concat(CTRL_OUT.map(function (c) { return c[1]; }))].concat(rows.map(function (r) {
        var m = calc(numRow(r));
        return CTRL_IN.map(function (c) { return r[c[0]] || ''; }).concat(CTRL_OUT.map(function (c) { return isFinite(m[c[0]]) ? +m[c[0]].toFixed(4) : ''; }));
      })));
    });
    persistForm(targets, 'tool-control-targets', draw);
    var r = $('[data-reset]'); if (r) confirmClick(r, 'לחצו שוב למחיקה', function () {
      rows = [{ label: 'שבוע 1' }]; save('tool-control', rows); draw();
    });
    draw();
  }

  // ---------- אבחון קמפיין ----------
  function initDiagnosis() {
    var form = $('#tool-form'), out = $('#diag-out');
    var STAGES = [
      { k: 'imp', name: 'חשיפות' }, { k: 'clicks', name: 'קליקים' }, { k: 'leads', name: 'לידים' },
      { k: 'contacted', name: 'נוצר קשר' }, { k: 'customers', name: 'לקוחות' },
    ];
    var FIX = {
      noimp: ['אין חשיפות', 'הבעיה לפני שמישהו ראה את המודעה.', ['סטטוס המודעה — נדחתה? בבדיקה?', 'אמצעי תשלום ומגבלת הוצאה', 'תקציב ולוח זמנים — פעילים?', 'קהל צר מדי / מיקום שגוי', 'בגוגל: נפח חיפוש נמוך או הצעת מחיר נמוכה מדי']],
      ctr: ['המודעה לא עוצרת (CTR נמוך)', 'אנשים רואים — אבל לא לוחצים.', ['3 השניות הראשונות / הכותרת — האם יש כאב או תוצאה ברורה?', 'בדקו 3 זוויות חדשות (שיעור 08)', 'קריאייטיב שרץ שבועות? ייתכן שהוא שחוק', 'התאמת המסר לקהל (שיעור 05)', 'בגוגל: מילת המפתח בכותרת המודעה?']],
      cvr: ['הדף לא ממיר (CVR נמוך)', 'לוחצים — אבל לא משאירים פרטים.', ['ליד בדיקה: הטופס נשלח? הדף נטען בנייד?', 'הכותרת ממשיכה את ההבטחה של המודעה?', 'טופס ארוך מדי? השאירו שם וטלפון', 'מהירות טעינה בנייד', 'הוכחות והורדת סיכון בדף (שיעור 06)']],
      contact: ['הלידים לא מקבלים מענה', 'הלידים נכנסים — אבל לא מגיעים אליהם.', ['זמן תגובה: היעד הוא דקות, לא שעות', 'הודעה אוטומטית מיידית (שיעור 14)', 'התראה לאיש המכירות + משימה ב-CRM', 'בדקו שהחיבור לא נשבר (שיעור 13)']],
      close: ['לא נסגרות עסקאות', 'יש שיחות — אבל אין לקוחות.', ['סיבות ״לא רלוונטי״ ב-CRM — מה חוזר?', 'שאלת סינון בטופס', 'תסריט שיחה וההצעה עצמה', 'המחיר מול מה שהובטח במודעה', 'החזרת המרות איכותיות לפלטפורמות (שיעור 15)']],
      ok: ['המשפך תקין', 'אף שלב לא חורג מהטווח.', ['הגדילו תקציב ב-20%–30% ובדקו שוב אחרי 4–5 ימים', 'המשיכו לבדוק קריאייטיב חדש כל שבוע', 'שמרו על הרוטינה (שיעור 19)']],
    };
    function render(d) {
      var v = { imp: num(d.imp), clicks: num(d.clicks), leads: num(d.leads), contacted: num(d.contacted), customers: num(d.customers) };
      var spend = num(d.spend);
      var th = { ctr: num(d.th_ctr) / 100, cvr: num(d.th_cvr) / 100, contact: num(d.th_contact) / 100, close: num(d.th_close) / 100 };
      var rates = { ctr: div(v.clicks, v.imp), cvr: div(v.leads, v.clicks), contact: div(v.contacted, v.leads), close: div(v.customers, v.contacted) };
      if (!v.imp && !spend) { out.innerHTML = '<p class="muted">הזינו את מספרי הקמפיין כדי לקבל אבחון.</p>'; return; }
      var issue = !v.imp ? 'noimp' : rates.ctr < th.ctr ? 'ctr' : rates.cvr < th.cvr ? 'cvr' :
        (v.leads && rates.contact < th.contact) ? 'contact' : (v.contacted && rates.close < th.close) ? 'close' : 'ok';
      var max = v.imp || 1;
      var bars = STAGES.map(function (s, i) {
        var val = v[s.k], w = barW(val, max);
        var rate = i > 0 ? div(val, v[STAGES[i - 1].k]) : NaN;
        var rk = ['', 'ctr', 'cvr', 'contact', 'close'][i];
        var bad = rk === issue;
        return '<div class="fbar' + (bad ? ' bad' : '') + '"><span class="fname">' + s.name + '</span>' +
          '<span class="ftrack"><i style="width:' + w + '%"></i></span><span class="fval">' + fmt(val) +
          (i > 0 ? ' <small>(' + pct(rate) + ')</small>' : '') + '</span></div>';
      }).join('');
      var f = FIX[issue];
      out.innerHTML =
        '<div class="kpis">' + kpi('CTR', pct(rates.ctr, 2), 'סף: ' + pct(th.ctr, 1)) + kpi('CVR', pct(rates.cvr), 'סף: ' + pct(th.cvr, 0)) +
        kpi('עלות לליד', money(div(spend, v.leads)), '') + kpi('עלות ללקוח', money(div(spend, v.customers)), '') + '</div>' +
        '<div class="funnel">' + bars + '</div>' +
        '<div class="diag ' + (issue === 'ok' ? 'good' : 'bad') + '"><span class="tag ' + (issue === 'ok' ? 'tag-teal' : '') + '">' +
        (issue === 'ok' ? 'תקין' : 'השלב החריג הראשון') + '</span><h3>' + f[0] + '</h3><p>' + f[1] + '</p><h4>מה בודקים, לפי הסדר:</h4><ol>' +
        f[2].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>' +
        (issue !== 'ok' ? '<p class="muted">מתקנים את השלב הזה קודם — ורק אחריו נוגעים בשלבים הבאים.</p>' : '') + '</div>';
    }
    persistForm(form, 'tool-diagnosis', render);
    resetButton('tool-diagnosis', form);
  }

  // ---------- דשבורד ----------
  function initDashboard() {
    var form = $('#tool-form'), out = $('#dash-out');
    var CH = [['meta', 'Meta'], ['google', 'Google'], ['other', 'אחר']];
    function render(d) {
      var ch = CH.map(function (c) {
        return { name: c[1], spend: num(d[c[0] + '_spend']), leads: num(d[c[0] + '_leads']), customers: num(d[c[0] + '_customers']), revenue: num(d[c[0] + '_revenue']) };
      });
      var T = ch.reduce(function (a, c) { a.spend += c.spend; a.leads += c.leads; a.customers += c.customers; a.revenue += c.revenue; return a; }, { spend: 0, leads: 0, customers: 0, revenue: 0 });
      var gRev = num(d.goal_revenue), gCust = num(d.goal_customers), gCpa = num(d.goal_cpa);
      function vs(val, goal, higherBetter) {
        if (!goal) return '';
        var r = val / goal; var ok = higherBetter ? r >= 1 : r <= 1; var near = higherBetter ? r >= 0.9 : r <= 1.1;
        return ok ? 'good' : near ? 'warn' : 'bad';
      }
      var cpa = div(T.spend, T.customers), roas = div(T.revenue, T.spend);
      var top =
        kpi('הכנסות', money(T.revenue), gRev ? pct(T.revenue / gRev, 0) + ' מהיעד' : 'הגדירו יעד', vs(T.revenue, gRev, true)) +
        kpi('לקוחות חדשים', fmt(T.customers), gCust ? fmt(T.customers) + ' מתוך ' + fmt(gCust) : 'הגדירו יעד', vs(T.customers, gCust, true)) +
        kpi('עלות ללקוח', money(cpa), gCpa ? 'יעד: ' + money(gCpa) : '', vs(cpa, gCpa, false)) +
        kpi('ROAS', isFinite(roas) ? fmt(roas, 2) : '—', 'הוצאה: ' + money(T.spend));
      var imp = num(d.imp), clicks = num(d.clicks), relevant = num(d.relevant);
      var steps = [['חשיפות', imp], ['קליקים', clicks], ['לידים', T.leads], ['רלוונטיים', relevant], ['לקוחות', T.customers]];
      var max = Math.max.apply(null, steps.map(function (s) { return s[1]; })) || 1;
      var funnel = steps.map(function (s, i) {
        return '<div class="fbar"><span class="fname">' + s[0] + '</span><span class="ftrack"><i style="width:' + barW(s[1], max) + '%"></i></span>' +
          '<span class="fval">' + fmt(s[1]) + (i > 0 && steps[i - 1][1] ? ' <small>(' + pct(s[1] / steps[i - 1][1]) + ')</small>' : '') + '</span></div>';
      }).join('');
      var best = ch.filter(function (c) { return c.customers; }).sort(function (a, b) { return a.spend / a.customers - b.spend / b.customers; })[0];
      var table = '<table class="data"><thead><tr><th>ערוץ</th><th>הוצאה</th><th>לידים</th><th>CPL</th><th>לקוחות</th><th>עלות ללקוח</th><th>ROAS</th></tr></thead><tbody>' +
        ch.map(function (c) {
          return '<tr' + (best === c ? ' class="best"' : '') + '><td>' + c.name + (best === c ? ' <span class="tag tag-teal">הכי משתלם</span>' : '') + '</td><td>' + money(c.spend) + '</td><td>' + fmt(c.leads) + '</td><td>' + money(div(c.spend, c.leads)) +
            '</td><td>' + fmt(c.customers) + '</td><td>' + money(div(c.spend, c.customers)) + '</td><td>' + (isFinite(div(c.revenue, c.spend)) ? fmt(c.revenue / c.spend, 2) : '—') + '</td></tr>';
        }).join('') + '</tbody></table>';
      out.innerHTML = '<div class="dash-head"><h3>' + esc(d.period || 'הדשבורד שלי') + '</h3></div>' +
        '<div class="kpis kpis-4">' + top + '</div><div class="dash-grid"><div class="panel-box"><h4>משפך</h4><div class="funnel">' + funnel + '</div></div>' +
        '<div class="panel-box"><h4>ערוצים</h4><div class="table-wrap">' + table + '</div></div></div>';
    }
    persistForm(form, 'tool-dashboard', render);
    resetButton('tool-dashboard', form);
  }

  // ---------- דוח חודשי ----------
  function initReport() {
    var form = $('#tool-form'), out = $('#report-out');
    function render(d) {
      var spend = num(d.spend), leads = num(d.leads), cust = num(d.customers), rev = num(d.revenue);
      var gCust = num(d.goal_customers);
      var hit = gCust ? cust / gCust : NaN;
      var summary = d.summary || (gCust ? 'עמדנו ב-' + pct(hit, 0) + ' מיעד הלקוחות (' + fmt(cust) + ' מתוך ' + fmt(gCust) + ').' : '');
      var dec = [1, 2, 3, 4, 5].map(function (i) { return [d['d' + i], d['o' + i], d['t' + i]]; }).filter(function (x) { return x[0]; });
      var list = function (s) { var l = lines(s); return l.length ? '<ul>' + l.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="muted">—</p>'; };
      out.innerHTML =
        '<h3>דוח חודשי' + (d.month ? ' — ' + esc(d.month) : '') + (d.client ? ' · ' + esc(d.client) : '') + '</h3>' +
        '<div class="report-sec"><h4>1. שורה תחתונה</h4><p>' + (esc(summary) || '<span class="muted">—</span>') + '</p></div>' +
        '<div class="report-sec"><h4>2. מספרים מול יעד</h4><table class="data"><tbody>' +
        '<tr><th>הוצאה</th><td>' + money(spend) + '</td><th>לידים</th><td>' + fmt(leads) + '</td></tr>' +
        '<tr><th>עלות לליד</th><td>' + money(div(spend, leads)) + '</td><th>לקוחות</th><td>' + fmt(cust) + (gCust ? ' מתוך ' + fmt(gCust) : '') + '</td></tr>' +
        '<tr><th>עלות ללקוח</th><td>' + money(div(spend, cust)) + '</td><th>ROAS</th><td>' + (isFinite(div(rev, spend)) ? fmt(rev / spend, 2) : '—') + '</td></tr>' +
        '</tbody></table></div>' +
        '<div class="report-sec two"><div><h4>3. מה עבד</h4>' + list(d.worked) + '</div><div><h4>מה לא עבד</h4>' + list(d.failed) + '</div></div>' +
        '<div class="report-sec"><h4>4. למה (תובנות)</h4>' + list(d.insights) + '</div>' +
        '<div class="report-sec"><h4>5. מה עושים עכשיו</h4>' + (dec.length ? '<table class="data"><thead><tr><th>החלטה</th><th>אחראי</th><th>עד</th></tr></thead><tbody>' +
          dec.map(function (x) { return '<tr><td>' + esc(x[0]) + '</td><td>' + esc(x[1]) + '</td><td>' + esc(x[2]) + '</td></tr>'; }).join('') + '</tbody></table>' : '<p class="muted">הוסיפו לפחות החלטה אחת.</p>') + '</div>';
      out.dataset.text = out.innerText;
    }
    persistForm(form, 'tool-report', render);
    resetButton('tool-report', form);
    $('[data-copy]').addEventListener('click', function (e) { copyText(out.innerText, e.target); });
  }

  // ---------- פרויקט גמר ----------
  function initProject() {
    var form = $('#tool-form');
    function update() {
      var fields = $$('textarea, input[type=text]', form);
      var filled = fields.filter(function (f) { return f.value.trim(); }).length;
      $$('[data-progress-count]').forEach(function (el) { el.textContent = filled; });
      $$('[data-progress-total]').forEach(function (el) { el.textContent = fields.length; });
      $$('[data-progress-bar]').forEach(function (el) { el.style.width = (filled / fields.length * 100) + '%'; });
      $$('[data-stage]').forEach(function (s) {
        var f = $$('textarea, input[type=text]', s), n = f.filter(function (x) { return x.value.trim(); }).length;
        s.classList.toggle('is-done', n === f.length);
        var c = $('[data-group-count]', s); if (c) c.textContent = n + '/' + f.length;
      });
    }
    persistForm(form, 'tool-project', update);
    resetButton('tool-project', form);
  }

  var tools = { brief: initBrief, budget: initBudget, utm: initUtm, control: initControl, diagnosis: initDiagnosis,
                dashboard: initDashboard, report: initReport, project: initProject,
                qa: function () { initChecklist('qa'); }, free: function () { initChecklist('free-checklist'); } };
  var name = document.body.getAttribute('data-tool');
  if (tools[name]) tools[name]();
})();
