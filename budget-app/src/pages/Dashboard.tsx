import React, { useMemo, useState } from 'react';
import type { Page } from '../App';
import { Money, MonthlyChart } from '../components/ui';
import { buildIndex, groupsOf, insightsFor, yearMonths } from '../lib/analytics';
import { monthLabel } from '../lib/format';
import { useStore } from '../lib/store';
import { TIPS } from '../content/course';

export default function Dashboard({ go }: { go: (p: Page) => void }) {
  const { data } = useStore();
  const idx = useMemo(() => buildIndex(data), [data]);
  const lastMonth = idx.months[idx.months.length - 1];
  const [month, setMonth] = useState<string | undefined>(lastMonth);
  const cur = month && idx.months.includes(month) ? month : lastMonth;

  if (!cur) {
    return (
      <div className="card empty">
        <h2>ברוכים הבאים לכיס המשפחתי</h2>
        <p>כדי להתחיל, יבאו את קובץ התקציב שלכם מאקסל, קובץ מהבנק או מחברת האשראי, או הזינו הוצאה ראשונה.</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <button className="btn primary" onClick={() => go('import')}>להזנה וייבוא</button>
          <button className="btn" onClick={() => go('course')}>להתחיל מהקורס</button>
        </div>
      </div>
    );
  }

  const year = Number(cur.slice(0, 4));
  const years = [...new Set(idx.months.map((m) => Number(m.slice(0, 4))))].sort();
  const t = idx.totals(cur);
  const ym = yearMonths(year);
  const chart = ym.map((m) => {
    const x = idx.totals(m);
    return { month: m, income: x.income, expense: x.expense + x.debt, saving: x.saving };
  });
  const ytd = ym.filter((m) => m <= cur && idx.months.includes(m)).map(idx.totals);
  const ytdBalance = ytd.reduce((s, x) => s + x.balance, 0);
  const avgExpense = ytd.length ? ytd.reduce((s, x) => s + x.expense + x.debt, 0) / ytd.length : 0;
  const insights = insightsFor(data, idx, cur);
  const tip = TIPS[(Number(cur.slice(5)) + year) % TIPS.length];

  // groups this month vs budget
  const groups = groupsOf(data.categories, ['expense', 'debt']).map((g) => ({
    name: g.group,
    actual: g.cats.reduce((s, c) => s + idx.categoryAmount(cur, c.id), 0),
    budget: g.cats.reduce((s, c) => s + (data.budget[c.id] ?? 0), 0),
  })).filter((g) => g.actual > 0 || g.budget > 0).sort((a, b) => b.actual - a.actual);
  const gMax = Math.max(1, ...groups.map((g) => Math.max(g.actual, g.budget)));

  const budgetTotal = data.categories.filter((c) => c.kind === 'expense' || c.kind === 'debt').reduce((s, c) => s + (data.budget[c.id] ?? 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{monthLabel(cur)}</h1>
          <p>תמונת מצב חודשית: הכנסות, הוצאות, חריגות ותובנות.</p>
        </div>
        <div className="row">
          <select className="input" value={year} onChange={(e) => {
            const y = e.target.value;
            const ms = idx.months.filter((m) => m.startsWith(y));
            setMonth(ms[ms.length - 1]);
          }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input" value={cur} onChange={(e) => setMonth(e.target.value)}>
            {idx.months.filter((m) => m.startsWith(String(year))).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid k4" style={{ marginBottom: 16 }}>
        <div className="card stat">
          <div className="bar" style={{ background: 'var(--income)' }} />
          <div className="label">הכנסות</div>
          <div className="value"><Money v={t.income} /></div>
        </div>
        <div className="card stat">
          <div className="bar" style={{ background: 'var(--expense)' }} />
          <div className="label">הוצאות והחזרי חובות</div>
          <div className="value"><Money v={t.expense + t.debt} /></div>
          {budgetTotal > 0 && <div className="delta">מתוך תקציב של <Money v={budgetTotal} /></div>}
        </div>
        <div className="card stat">
          <div className="bar" style={{ background: 'var(--saving)' }} />
          <div className="label">חיסכון</div>
          <div className="value"><Money v={t.saving} /></div>
        </div>
        <div className="card stat">
          <div className="bar" style={{ background: t.balance >= 0 ? 'var(--good)' : 'var(--bad)' }} />
          <div className="label">יתרה חודשית</div>
          <div className="value" style={{ color: t.balance >= 0 ? 'var(--good)' : 'var(--bad)' }}><Money v={t.balance} /></div>
          <div className="delta">מתחילת {year}: <Money v={ytdBalance} /></div>
        </div>
      </div>

      <div className="grid c2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h2>הכנסות מול הוצאות – {year}</h2>
          <p className="sub">לחצו על חודש כדי לראות את הפירוט שלו. ממוצע הוצאות חודשי השנה: <Money v={avgExpense} /></p>
          <MonthlyChart data={chart} selected={cur} onSelect={(m) => idx.months.includes(m) && setMonth(m)} />
        </div>
        <div className="card">
          <h2>תובנות לחודש</h2>
          <div className="stack">
            {insights.map((i, k) => (
              <div key={k} className={`note ${i.tone}`}>
                <span className="ic">{i.tone === 'good' ? '✓' : i.tone === 'warn' ? '!' : 'i'}</span>
                <span>{i.text}</span>
              </div>
            ))}
            <div className="note info" style={{ background: 'var(--surface-2)' }}>
              <span className="ic">💡</span>
              <span><b>טיפ: </b>{tip} <button className="btn ghost sm" onClick={() => go('course')}>לקורס ←</button></span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>הוצאות לפי קבוצה</h2>
        <p className="sub">הפס מראה את הביצוע בפועל, והקו השחור את התקציב.</p>
        {groups.map((g) => (
          <div className="hbar" key={g.name}>
            <span className="name" title={g.name}>{g.name}</span>
            <div className="track">
              <div className="fill" style={{ width: `${(g.actual / gMax) * 100}%`, background: g.budget && g.actual > g.budget * 1.05 ? 'var(--expense)' : 'var(--accent)' }} />
              {g.budget > 0 && <div className="mark" style={{ insetInlineStart: `${(g.budget / gMax) * 100}%` }} title={`תקציב: ${Math.round(g.budget)}`} />}
            </div>
            <span className="small">
              <Money v={g.actual} />
              {g.budget > 0 && <span className="muted"> / <Money v={g.budget} /></span>}
            </span>
          </div>
        ))}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn sm" onClick={() => go('budget')}>לטבלת התקציב המלאה</button>
          <button className="btn sm" onClick={() => go('transactions')}>לכל התנועות</button>
        </div>
      </div>
    </>
  );
}
