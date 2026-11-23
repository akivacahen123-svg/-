import React, { useMemo, useState } from 'react';
import type { Page } from '../App';
import { AnimatedMoney, Carousel, Icons, Money, MonthlyChart, Ring } from '../components/ui';
import { buildIndex, groupsOf, insightsFor, yearMonths } from '../lib/analytics';
import { monthLabel, MONTHS } from '../lib/format';
import { useStore } from '../lib/store';
import { TIPS } from '../content/course';

const TONE_TAG = { good: 'מצוין', warn: 'לתשומת לב', info: 'תובנה' } as const;

export default function Dashboard({ go }: { go: (p: Page) => void }) {
  const { data, loadDemo } = useStore();
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
          <button className="btn" onClick={loadDemo}>הצגת נתוני דוגמה</button>
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
  const tipStart = (Number(cur.slice(5)) + year) % TIPS.length;
  const tips = [0, 1, 2].map((k) => TIPS[(tipStart + k) % TIPS.length]);
  const outflow = t.expense + t.debt + t.saving;
  const spentShare = t.income > 0 ? outflow / t.income : 0;
  const prevIdx = idx.months.indexOf(cur) - 1;
  const prev = prevIdx >= 0 ? idx.totals(idx.months[prevIdx]) : null;
  const expDelta = prev && prev.expense + prev.debt > 0 ? (t.expense + t.debt) / (prev.expense + prev.debt) - 1 : null;

  const groups = groupsOf(data.categories, ['expense', 'debt'])
    .map((g) => ({
      name: g.group,
      actual: g.cats.reduce((s, c) => s + idx.categoryAmount(cur, c.id), 0),
      budget: g.cats.reduce((s, c) => s + (data.budget[c.id] ?? 0), 0),
    }))
    .filter((g) => g.actual > 0 || g.budget > 0)
    .sort((a, b) => b.actual - a.actual);
  const gMax = Math.max(1, ...groups.map((g) => Math.max(g.actual, g.budget)));
  const budgetTotal = data.categories.filter((c) => c.kind === 'expense' || c.kind === 'debt').reduce((s, c) => s + (data.budget[c.id] ?? 0), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">תמונת מצב חודשית</div>
          <h1>{monthLabel(cur)}</h1>
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => go('budget')}><Icons.budget width={18} /> תכנון התקציב</button>
          <select className="input" id="dash-year" aria-label="שנה" value={year} onChange={(e) => {
            const ms = idx.months.filter((m) => m.startsWith(e.target.value));
            setMonth(ms[ms.length - 1]);
          }}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="input" id="dash-month" aria-label="חודש" value={cur} onChange={(e) => setMonth(e.target.value)}>
            {idx.months.filter((m) => m.startsWith(String(year))).map((m) => <option key={m} value={m}>{MONTHS[Number(m.slice(5)) - 1]}</option>)}
          </select>
        </div>
      </div>

      <div className="grid hero-row rise" style={{ marginBottom: 18 }}>
        <section className={`hero ${t.balance < 0 ? 'neg' : ''}`} aria-label="יתרה חודשית">
          <div className="morph" /><div className="morph b" />
          <div className="hero-body">
            <div>
              <div className="label">{t.balance >= 0 ? 'נשאר לכם החודש' : 'החודש יצא יותר ממה שנכנס'}</div>
              <div className="big"><AnimatedMoney v={t.balance} /></div>
              <div style={{ opacity: 0.9 }}>מתחילת {year}: <Money v={ytdBalance} /></div>
            </div>
            <Ring value={spentShare} label={`${Math.round(spentShare * 100)}%`} sub="מההכנסה יצא" />
          </div>
          <div className="meta">
            <span className="chip">הכנסות <Money v={t.income} /></span>
            <span className="chip">הוצאות <Money v={t.expense + t.debt} /></span>
            <span className="chip">חיסכון <Money v={t.saving} /></span>
          </div>
        </section>

        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>מה כדאי לדעת</h2>
            <span className="pill">{insights.length + tips.length} כרטיסים</span>
          </div>
          <Carousel label="תובנות וטיפים">
            {[
              ...insights.map((i, k) => (
                <div key={`i${k}`} className={`slide-card ${i.tone}`}>
                  <div className="corner" />
                  <span className="tag">{TONE_TAG[i.tone]}</span>
                  <p>{i.text}</p>
                </div>
              )),
              ...tips.map((tip, k) => (
                <div key={`t${k}`} className="slide-card tip">
                  <div className="corner" />
                  <span className="tag">טיפ מהקורס</span>
                  <p>{tip}</p>
                  <button className="btn sm" style={{ alignSelf: 'flex-start', marginTop: 'auto' }} onClick={() => go('course')}>לקורס</button>
                </div>
              )),
            ]}
          </Carousel>
        </div>
      </div>

      <div className="grid k4 rise" style={{ marginBottom: 18 }}>
        <Stat label="הכנסות" v={t.income} color="var(--income)" tint="var(--tint-teal)" icon={<Icons.arrowDown />} />
        <Stat label="הוצאות והחזרי חובות" v={t.expense + t.debt} color="var(--expense)" tint="var(--tint-coral)" icon={<Icons.arrowUp />}
          delta={expDelta != null ? `${expDelta >= 0 ? '+' : ''}${Math.round(expDelta * 100)}% לעומת החודש הקודם` : undefined} />
        <Stat label="חיסכון" v={t.saving} color="var(--saving)" tint="var(--tint-violet)" icon={<Icons.piggy />} />
        <Stat label="תקציב חודשי" v={budgetTotal} color="#d99a12" tint="var(--tint-butter)" icon={<Icons.wallet />}
          delta={budgetTotal ? `נוצל ${Math.round(((t.expense + t.debt) / budgetTotal) * 100)}%` : 'עדיין לא נקבע'} />
      </div>

      <div className="grid c2" style={{ marginBottom: 18 }}>
        <div className="card">
          <h2>הכנסות מול הוצאות ב-{year}</h2>
          <p className="sub">לחצו על חודש כדי לראות את הפירוט שלו. ממוצע הוצאות חודשי השנה: <Money v={avgExpense} /></p>
          <MonthlyChart key={year} data={chart} selected={cur} onSelect={(m) => idx.months.includes(m) && setMonth(m)} />
        </div>
        <div className="card">
          <h2>לאן הלך הכסף</h2>
          <p className="sub">הפס מראה את הביצוע בפועל, והקו את התקציב.</p>
          {groups.slice(0, 8).map((g, i) => (
            <div className="hbar" key={g.name}>
              <span className="name" title={g.name}>{g.name}</span>
              <div className="track">
                <div className="fill" style={{ width: `${(g.actual / gMax) * 100}%`, background: g.budget && g.actual > g.budget * 1.05 ? 'var(--expense)' : 'var(--income)', animationDelay: `${i * 60}ms` }} />
                {g.budget > 0 && <div className="mark" style={{ insetInlineStart: `${(g.budget / gMax) * 100}%` }} title={`תקציב: ${Math.round(g.budget)}`} />}
              </div>
              <span className="small"><Money v={g.actual} /></span>
            </div>
          ))}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn sm" onClick={() => go('budget')}>לטבלת התקציב</button>
            <button className="btn sm ghost" onClick={() => go('transactions')}>לכל התנועות</button>
          </div>
        </div>
      </div>

      <div className="grid k3 rise">
        <QuickLink title="הזנה מהירה" text="הוצאה במזומן, ביט או רישום מוואטסאפ" icon={<Icons.plus />} tint="var(--tint-teal)" onClick={() => go('import')} />
        <QuickLink title="הון משפחתי" text="נכסים, חובות ושווי נקי" icon={<Icons.wealth />} tint="var(--tint-violet)" onClick={() => go('wealth')} />
        <QuickLink title="גיבוי וייצוא" text="שמירת הנתונים וייצוא לאקסל" icon={<Icons.settings />} tint="var(--tint-butter)" onClick={() => go('backup')} />
      </div>
    </>
  );
}

function Stat({ label, v, color, tint, icon, delta }: { label: string; v: number; color: string; tint: string; icon: React.ReactNode; delta?: string }) {
  return (
    <div className="card stat lift">
      <div className="shape" style={{ background: tint }} />
      <div className="badge" style={{ background: tint, color }}>{icon}</div>
      <div className="label">{label}</div>
      <div className="value"><AnimatedMoney v={v} /></div>
      {delta && <div className="delta">{delta}</div>}
    </div>
  );
}

function QuickLink({ title, text, icon, tint, onClick }: { title: string; text: string; icon: React.ReactNode; tint: string; onClick: () => void }) {
  return (
    <button className="card lift" onClick={onClick} style={{ textAlign: 'start', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center', color: 'var(--text)' }}>
      <span className="badge" style={{ width: 46, height: 46, borderRadius: '16px 16px 16px 5px', background: tint, display: 'grid', placeItems: 'center', flex: 'none' }}>{icon}</span>
      <span>
        <b className="display" style={{ fontSize: 17, fontWeight: 600, display: 'block' }}>{title}</b>
        <span className="small muted">{text}</span>
      </span>
    </button>
  );
}
