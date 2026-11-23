import type { AppData, Category, CategoryKind, Transaction } from './types';
import { monthKey, pad } from './format';

/** Signed amount in the category's natural direction (expense: out is +, income: in is +). */
export function natural(t: Transaction, cat: Category | undefined): number {
  const kind = cat?.kind ?? (t.direction === 'in' ? 'income' : 'expense');
  const naturalOut = kind !== 'income';
  return (t.direction === 'out') === naturalOut ? t.amount : -t.amount;
}

export interface MonthTotals {
  month: string;
  income: number;
  expense: number;
  saving: number;
  debt: number;
  uncategorized: number;
  /** income − expense − saving − debt */
  balance: number;
}

export function buildIndex(data: AppData) {
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  /** month -> categoryId -> natural amount */
  const byMonth = new Map<string, Map<string, number>>();
  const uncategorized = new Map<string, { in: number; out: number }>();
  for (const t of data.transactions) {
    const m = monthKey(t.date);
    const cat = t.categoryId ? cats.get(t.categoryId) : undefined;
    if (!cat) {
      const u = uncategorized.get(m) ?? { in: 0, out: 0 };
      u[t.direction] += t.amount;
      uncategorized.set(m, u);
      continue;
    }
    if (cat.kind === 'transfer') continue;
    const mm = byMonth.get(m) ?? new Map<string, number>();
    mm.set(cat.id, (mm.get(cat.id) ?? 0) + natural(t, cat));
    byMonth.set(m, mm);
  }
  const months = [...new Set([...byMonth.keys(), ...uncategorized.keys()])].sort();

  const totals = (m: string): MonthTotals => {
    const res: MonthTotals = { month: m, income: 0, expense: 0, saving: 0, debt: 0, uncategorized: 0, balance: 0 };
    for (const [cid, v] of byMonth.get(m) ?? []) {
      const k = cats.get(cid)!.kind as Exclude<CategoryKind, 'transfer'>;
      res[k] += v;
    }
    const u = uncategorized.get(m);
    if (u) {
      // unknown money still counts, so the balance stays honest
      res.income += u.in;
      res.expense += u.out;
      res.uncategorized = u.in + u.out;
    }
    res.balance = res.income - res.expense - res.saving - res.debt;
    return res;
  };

  const categoryAmount = (m: string, cid: string) => byMonth.get(m)?.get(cid) ?? 0;

  /** Average per month over the given months (months with no data at all count as 0 only if inside the range). */
  const average = (cid: string, ms: string[]) => (ms.length ? ms.reduce((s, m) => s + categoryAmount(m, cid), 0) / ms.length : 0);

  return { cats, months, totals, categoryAmount, average, byMonth };
}

export type Index = ReturnType<typeof buildIndex>;

export function lastMonths(months: string[], upto: string, n: number): string[] {
  return months.filter((m) => m <= upto).slice(-n);
}

export function yearMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${pad(i + 1)}`);
}

export function groupsOf(cats: Category[], kinds: CategoryKind[]): { group: string; kind: CategoryKind; cats: Category[] }[] {
  const out: { group: string; kind: CategoryKind; cats: Category[] }[] = [];
  for (const c of cats) {
    if (!kinds.includes(c.kind)) continue;
    let g = out.find((x) => x.group === c.group && x.kind === c.kind);
    if (!g) out.push((g = { group: c.group, kind: c.kind, cats: [] }));
    g.cats.push(c);
  }
  return out;
}

export interface Insight {
  tone: 'good' | 'warn' | 'info';
  text: string;
}

export function insightsFor(data: AppData, idx: Index, month: string): Insight[] {
  const out: Insight[] = [];
  const t = idx.totals(month);
  if (t.income > 0) {
    const rate = (t.saving + Math.max(t.balance, 0)) / t.income;
    if (t.balance < 0) out.push({ tone: 'warn', text: `החודש ההוצאות עברו את ההכנסות ב-${Math.round(-t.balance).toLocaleString('he-IL')} ₪. כדאי לבדוק מאיפה הגיע הפער לפני שהוא מתגלגל למינוס.` });
    else out.push({ tone: 'good', text: `החודש נשארו בצד ${Math.round(rate * 100)}% מההכנסה (כולל הוראת הקבע לחיסכון).` });
  }
  if (t.uncategorized > 0) out.push({ tone: 'info', text: `יש תנועות בסך ${Math.round(t.uncategorized).toLocaleString('he-IL')} ₪ בלי קטגוריה. שיוך שלהן ילמד את המערכת לזהות אותן בפעם הבאה.` });

  // over budget categories this month
  const over = data.categories
    .filter((c) => c.kind === 'expense' && (data.budget[c.id] ?? 0) > 0)
    .map((c) => ({ c, diff: idx.categoryAmount(month, c.id) - data.budget[c.id] }))
    .filter((x) => x.diff > 100)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3);
  for (const o of over) out.push({ tone: 'warn', text: `${o.c.name}: חריגה של ${Math.round(o.diff).toLocaleString('he-IL')} ₪ מהתקציב החודשי.` });

  // year-over-year growth
  const [y] = month.split('-').map(Number);
  const thisYear = yearMonths(y).filter((m) => m <= month && idx.months.includes(m));
  const prevYear = thisYear.map((m) => `${y - 1}${m.slice(4)}`);
  if (thisYear.length >= 3 && prevYear.some((m) => idx.months.includes(m))) {
    const growth = data.categories
      .filter((c) => c.kind === 'expense')
      .map((c) => {
        const now = thisYear.reduce((s, m) => s + idx.categoryAmount(m, c.id), 0);
        const before = prevYear.reduce((s, m) => s + idx.categoryAmount(m, c.id), 0);
        return { c, now, before, diff: now - before };
      })
      .filter((g) => g.before > 500 && g.diff > 1000)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 2);
    for (const g of growth)
      out.push({ tone: 'info', text: `${g.c.name}: מתחילת השנה ${Math.round(g.now).toLocaleString('he-IL')} ₪, לעומת ${Math.round(g.before).toLocaleString('he-IL')} ₪ באותה תקופה אשתקד (+${Math.round((g.diff / g.before) * 100)}%).` });
  }
  return out;
}

/** Categories that are paid only some months (bi-monthly bills, annual fees) – they need a monthly provision. */
export function irregularCategories(data: AppData, idx: Index, upto: string) {
  const ms = lastMonths(idx.months, upto, 12);
  if (ms.length < 6) return [];
  return data.categories
    .filter((c) => c.kind === 'expense')
    .map((c) => {
      const vals = ms.map((m) => idx.categoryAmount(m, c.id));
      const paidMonths = vals.filter((v) => v > 0).length;
      const total = vals.reduce((s, v) => s + v, 0);
      const max = Math.max(...vals);
      return { c, paidMonths, total, avg: total / ms.length, max };
    })
    .filter((x) => x.total > 0 && (x.paidMonths <= ms.length / 2 || x.max > 2.5 * x.avg) && x.avg > 30)
    .sort((a, b) => b.total - a.total);
}
