import React, { useMemo, useState } from 'react';
import { Money } from '../components/ui';
import { buildIndex, groupsOf, irregularCategories, lastMonths } from '../lib/analytics';
import { makeCategory } from '../lib/defaults';
import { monthLabel } from '../lib/format';
import { useStore } from '../lib/store';
import type { CategoryKind } from '../lib/types';

const KIND_LABEL: Record<CategoryKind, string> = { income: 'הכנסות', expense: 'הוצאות', saving: 'חיסכון', debt: 'החזר חובות', transfer: 'העברות' };

export default function BudgetPage() {
  const { data, setData } = useStore();
  const idx = useMemo(() => buildIndex(data), [data]);
  const last = idx.months[idx.months.length - 1];
  const [month, setMonth] = useState<string>(last ?? '');
  const cur = month || last;
  const window12 = cur ? lastMonths(idx.months, cur, 12) : [];
  const [newCat, setNewCat] = useState({ name: '', group: '', kind: 'expense' as CategoryKind });

  const setBudget = (id: string, v: number | null) =>
    setData((d) => {
      const b = { ...d.budget };
      if (v == null || isNaN(v)) delete b[id];
      else b[id] = v;
      return { ...d, budget: b };
    });

  const fillAverage = (onlyEmpty: boolean) =>
    setData((d) => {
      const b = { ...d.budget };
      for (const c of d.categories) {
        if (c.kind === 'transfer') continue;
        if (onlyEmpty && b[c.id] != null) continue;
        const avg = idx.average(c.id, window12);
        if (avg > 0) b[c.id] = Math.round(avg / 10) * 10;
      }
      return { ...d, budget: b };
    });

  const sumKind = (k: CategoryKind, f: (id: string) => number) => data.categories.filter((c) => c.kind === k).reduce((s, c) => s + f(c.id), 0);
  const b = (id: string) => data.budget[id] ?? 0;
  const plan = { income: sumKind('income', b), expense: sumKind('expense', b), saving: sumKind('saving', b), debt: sumKind('debt', b) };
  const surplus = plan.income - plan.expense - plan.saving - plan.debt;
  const avgOf = (k: CategoryKind) => sumKind(k, (id) => idx.average(id, window12));
  const avg = { income: avgOf('income'), expense: avgOf('expense'), saving: avgOf('saving'), debt: avgOf('debt') };
  const irregular = cur ? irregularCategories(data, idx, cur) : [];
  const [showArchived, setShowArchived] = useState(false);
  const visible = data.categories.filter((c) => showArchived || !c.archived || data.budget[c.id]);
  const archivedCount = data.categories.filter((c) => c.archived).length;
  const groups = groupsOf(visible, ['income', 'expense', 'saving', 'debt']);
  const order: CategoryKind[] = ['income', 'expense', 'saving', 'debt'];
  groups.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>בניית תקציב</h1>
          <p>תקציב חודשי לכל קטגוריה, לצד הממוצע בפועל ב-12 החודשים האחרונים{cur ? ` (עד ${monthLabel(cur)})` : ''}.</p>
        </div>
        <div className="row">
          {idx.months.length > 0 && (
            <select className="input" value={cur} onChange={(e) => setMonth(e.target.value)} aria-label="השוואה לחודש">
              {[...idx.months].reverse().map((m) => <option key={m} value={m}>השוואה ל{monthLabel(m)}</option>)}
            </select>
          )}
          <button className="btn" onClick={() => fillAverage(true)}>מלא חסרים לפי ממוצע</button>
          <button className="btn primary" onClick={() => { if (confirm('להחליף את כל סכומי התקציב בממוצע של 12 החודשים האחרונים?')) fillAverage(false); }}>מלא הכול לפי ממוצע 12 חודשים</button>
        </div>
      </div>

      <div className="grid k4" style={{ marginBottom: 16 }}>
        {(['income', 'expense', 'saving', 'debt'] as const).map((k) => (
          <div className="card stat" key={k}>
            <div className="bar" style={{ background: k === 'income' ? 'var(--income)' : k === 'saving' ? 'var(--saving)' : 'var(--expense)' }} />
            <div className="label">{KIND_LABEL[k]} – מתוכנן</div>
            <div className="value"><Money v={plan[k]} /></div>
            <div className="delta">ממוצע בפועל: <Money v={avg[k]} /></div>
          </div>
        ))}
      </div>

      <div className={`note ${surplus >= 0 ? 'good' : 'warn'}`} style={{ marginBottom: 16 }}>
        <span className="ic">{surplus >= 0 ? '✓' : '!'}</span>
        <span>
          {surplus >= 0 ? <>התקציב מאוזן. נשארים <Money v={surplus} /> בחודש לא מתוכננים. כדאי להחליט מראש לאן הם הולכים, למשל לקרן חירום או לחגים.</> : <>התקציב המתוכנן גבוה מההכנסות ב-<Money v={-surplus} /> בחודש. בחרו 2-3 קטגוריות להפחתה.</>}
          {plan.income > 0 && <> שיעור החיסכון המתוכנן: <b>{Math.round((plan.saving / plan.income) * 100)}%</b> מההכנסה.</>}
        </span>
      </div>

      <div className="grid c2">
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>קטגוריה</th>
                  <th className="n">ממוצע 12 ח׳</th>
                  {cur && <th className="n">{monthLabel(cur)}</th>}
                  <th className="n">תקציב חודשי</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const gBudget = g.cats.reduce((s, c) => s + b(c.id), 0);
                  const gAvg = g.cats.reduce((s, c) => s + idx.average(c.id, window12), 0);
                  const gCur = cur ? g.cats.reduce((s, c) => s + idx.categoryAmount(cur, c.id), 0) : 0;
                  return (
                    <React.Fragment key={g.kind + g.group}>
                      <tr className="group-row">
                        <td>{g.group} <span className="pill">{KIND_LABEL[g.kind]}</span></td>
                        <td className="n"><Money v={gAvg} /></td>
                        {cur && <td className="n"><Money v={gCur} /></td>}
                        <td className="n"><Money v={gBudget} /></td>
                      </tr>
                      {g.cats.map((c) => {
                        const a = idx.average(c.id, window12);
                        const m = cur ? idx.categoryAmount(cur, c.id) : 0;
                        const bud = data.budget[c.id];
                        const overBy = bud && c.kind === 'expense' ? m - bud : 0;
                        return (
                          <tr key={c.id}>
                            <td>{c.name}</td>
                            <td className="n muted"><Money v={a} /></td>
                            {cur && <td className="n" style={{ color: overBy > bud! * 0.1 ? 'var(--bad)' : undefined }}><Money v={m} /></td>}
                            <td className="n">
                              <input
                                className="input num"
                                style={{ width: 96, textAlign: 'end' }}
                                inputMode="decimal"
                                value={bud ?? ''}
                                placeholder={a > 0 ? String(Math.round(a / 10) * 10) : '0'}
                                onChange={(e) => setBudget(c.id, e.target.value === '' ? null : parseFloat(e.target.value))}
                                aria-label={`תקציב ${c.name}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {archivedCount > 0 && (
            <label className="row small muted" style={{ gap: 4, marginTop: 10 }}>
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              הצגת {archivedCount} קטגוריות ישנות שלא היו בשימוש בשנתיים האחרונות
            </label>
          )}
          <form className="row" style={{ marginTop: 14 }} onSubmit={(e) => {
            e.preventDefault();
            if (!newCat.name.trim()) return;
            const group = newCat.group.trim() || KIND_LABEL[newCat.kind];
            const c = makeCategory(newCat.name.trim(), group, newCat.kind);
            setData((d) => (d.categories.some((x) => x.id === c.id) ? d : { ...d, categories: [...d.categories, c] }));
            setNewCat({ ...newCat, name: '' });
          }}>
            <b className="small">קטגוריה חדשה:</b>
            <input className="input" placeholder="שם" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
            <input className="input" placeholder="קבוצה" list="groups" value={newCat.group} onChange={(e) => setNewCat({ ...newCat, group: e.target.value })} />
            <datalist id="groups">{[...new Set(data.categories.map((c) => c.group))].map((g) => <option key={g} value={g} />)}</datalist>
            <select className="input" value={newCat.kind} onChange={(e) => setNewCat({ ...newCat, kind: e.target.value as CategoryKind })}>
              {(Object.keys(KIND_LABEL) as CategoryKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <button className="btn" type="submit">הוספה</button>
          </form>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <div className="card">
            <h2>הוצאות לא סדירות</h2>
            <p className="sub">קטגוריות שמשולמות רק בחלק מהחודשים או שיש בהן קפיצות. כדאי להפריש להן סכום קבוע כל חודש.</p>
            {irregular.length === 0 && <p className="muted small">צריך לפחות 6 חודשים של נתונים.</p>}
            {irregular.slice(0, 12).map((x) => (
              <div key={x.c.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>
                  {x.c.name}
                  <div className="small muted">שולם ב-{x.paidMonths} מתוך {window12.length} חודשים · הכי גבוה <Money v={x.max} /></div>
                </span>
                <span style={{ textAlign: 'end' }}>
                  <b><Money v={x.avg} /></b>
                  <div className="small muted">לחודש</div>
                </span>
              </div>
            ))}
            {irregular.length > 0 && (
              <p className="small" style={{ marginBottom: 0 }}>
                סך הכול להפרשה חודשית: <b><Money v={irregular.reduce((s, x) => s + x.avg, 0)} /></b>
              </p>
            )}
          </div>
          <div className="card">
            <h2>איך לבנות את התקציב</h2>
            <ol className="small" style={{ paddingInlineStart: 18, margin: 0 }}>
              <li>מתחילים מהממוצע של 12 החודשים האחרונים.</li>
              <li>מעדכנים לפי שינויים ידועים: הלוואה שנגמרת, ילד שעולה כיתה, עליית מחירים.</li>
              <li>"משלמים לעצמנו קודם": קובעים סכום חיסכון חודשי.</li>
              <li>בוחרים 2-3 קטגוריות בלבד לצמצום.</li>
              <li>מוודאים שהיתרה המתוכננת חיובית.</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
