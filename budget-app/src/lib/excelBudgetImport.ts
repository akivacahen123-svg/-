/**
 * Imports a "budget & actuals" workbook laid out the way many families keep it:
 * one sheet per year, a row per category, a budget column, then one column per month,
 * with "סה"כ <group>" rows closing each group, an income section after "סה"כ הוצאות",
 * debt repayments after "סה"כ הכנסות", and optional asset/debt snapshots below.
 */
import * as XLSX from 'xlsx';
import type { Category, CategoryKind, Holding, Transaction } from './types';
import { makeCategory } from './defaults';
import { pad, parseAmount, uid } from './format';

export interface BudgetWorkbookResult {
  categories: Category[];
  transactions: Omit<Transaction, 'id'>[];
  budget: Record<string, number>;
  holdings: Holding[];
  holdingsDate: string;
  familyName: string;
  sheets: { name: string; months: number; cells: number; yearFixed?: string }[];
  warnings: string[];
}

const isTotal = (s: string) => /^סה"?כ|^סה״כ|^סך הכל/.test(s.trim());

function cleanName(s: string): string {
  return s
    .replace(/\([^)]*\)/g, '') // "(יתרה כ 86,000 ₪)" changes every year; drop it so years line up
    .replace(/\s+/g, ' ')
    .replace(/[\s\-–/]+$/, '')
    .trim();
}

function asMonth(v: unknown): { y: number; m: number } | null {
  if (v instanceof Date && !isNaN(v.getTime())) return { y: v.getFullYear(), m: v.getMonth() + 1 };
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
  }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2})[./](\d{4})$/) || null;
    if (m) return { y: +m[2], m: +m[1] };
  }
  return null;
}

export function looksLikeBudgetWorkbook(wb: XLSX.WorkBook): boolean {
  return wb.SheetNames.some((n) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], { header: 1, raw: true, blankrows: true }).slice(0, 6);
    return rows.some((r) => (r || []).filter((c) => asMonth(c)).length >= 3);
  });
}

export function importBudgetWorkbook(wb: XLSX.WorkBook): BudgetWorkbookResult {
  const catMap = new Map<string, Category>();
  const cells = new Map<string, { catId: string; month: string; amount: number; sheet: string }>();
  const warnings: string[] = [];
  const sheets: BudgetWorkbookResult['sheets'] = [];
  let latestBudget: { year: number; values: Record<string, number> } = { year: 0, values: {} };
  let holdings: Holding[] = [];
  let holdingsDate = '';
  let familyName = '';

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, raw: true, blankrows: true });
    if (!familyName) {
      const title = String(rows[0]?.[0] ?? '');
      const m = title.match(/^(משפחת\s+[^\s-–]+)/);
      if (m) familyName = m[1];
    }
    // header row = first row with >= 3 month-like cells
    const headerIdx = rows.slice(0, 8).findIndex((r) => (r || []).filter((c) => asMonth(c)).length >= 3);
    if (headerIdx < 0) continue;
    const header = rows[headerIdx];
    const monthCols: { col: number; y: number; m: number }[] = [];
    header.forEach((c, i) => {
      const mm = asMonth(c);
      if (mm) monthCols.push({ col: i, ...mm });
    });

    // A sheet named "2026" whose headers say 2025 was copied from last year – trust the sheet name.
    let yearFixed: string | undefined;
    const sheetYear = sheetName.trim().match(/^(20\d\d)$/)?.[1];
    if (sheetYear) {
      const years = new Set(monthCols.map((c) => c.y));
      if (years.size === 1 && !years.has(+sheetYear)) {
        yearFixed = `כותרות החודשים בגיליון "${sheetName}" רשומות כשנת ${[...years][0]} – יובאו כשנת ${sheetYear}`;
        warnings.push(yearFixed);
        monthCols.forEach((c) => (c.y = +sheetYear));
      }
    }

    // budget column: the last column left of the first month whose top rows mention "תקציב"
    const firstMonthCol = Math.min(...monthCols.map((c) => c.col));
    let budgetCol = -1;
    for (let col = firstMonthCol - 1; col >= 0 && budgetCol < 0; col--) {
      for (let r = 0; r <= headerIdx + 2; r++) {
        if (/תקציב/.test(String(rows[r]?.[col] ?? ''))) {
          budgetCol = col;
          break;
        }
      }
    }
    // the label column: the right-most text column left of the budget column
    const labelCol = 1;

    let kind: CategoryKind = 'expense';
    let pending: { name: string; row: unknown[] }[] = [];
    let mode = 'flow' as 'flow' | 'holdings';
    let cellCount = 0;
    const budgetHere: Record<string, number> = {};
    const sheetHoldings: Holding[] = [];
    let sheetHoldingsDate = '';

    // Fixed rows (mortgage, saving) are often pre-filled for the whole year. A month counts as
    // "entered" only when enough rows have values; later months are left out.
    const filledPerMonth = monthCols.map((mc) => {
      let n = 0;
      for (let r = headerIdx + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        if (String(row[0] ?? '').trim()) continue; // totals / section rows
        const v = parseAmount(row[mc.col]);
        if (v != null && v !== 0) n++;
      }
      return n;
    });
    const peak = Math.max(0, ...filledPerMonth);
    let lastActive = -1;
    filledPerMonth.forEach((n, i) => {
      if (n >= Math.max(5, peak * 0.4)) lastActive = i;
    });
    const activeCols = new Set(monthCols.filter((_, i) => i <= lastActive).map((c) => c.col));

    const flush = (groupName: string) => {
      for (const p of pending) {
        const nums = monthCols.map((mc) => parseAmount(p.row[mc.col])).filter((n): n is number => n != null && n !== 0);
        const budgetVal = budgetCol >= 0 ? parseAmount(p.row[budgetCol]) : null;
        // In the income block, rows that are mostly negative (e.g. a mortgage netted out of rent) are expenses.
        let k: CategoryKind = kind;
        let group = groupName;
        let sign = 1;
        const negShare = nums.length ? nums.filter((n) => n < 0).length / nums.length : (budgetVal ?? 0) < 0 ? 1 : 0;
        if (kind === 'income' && negShare > 0.5) {
          k = 'expense';
          group = 'דיור – משכנתאות';
          sign = -1;
        }
        if (k === 'expense' && /חיסכון|חסכון/.test(p.name)) {
          k = 'saving';
          group = 'חיסכון';
        }
        const cat = makeCategory(p.name, group, k);
        if (!catMap.has(cat.id)) catMap.set(cat.id, cat);
        if (budgetVal != null) budgetHere[cat.id] = sign * budgetVal;
        for (const mc of monthCols) {
          if (!activeCols.has(mc.col)) continue;
          const v = parseAmount(p.row[mc.col]);
          if (v == null || v === 0) continue;
          const month = `${mc.y}-${pad(mc.m)}`;
          cells.set(`${cat.id}|${month}`, { catId: cat.id, month, amount: sign * v, sheet: sheetName });
          cellCount++;
        }
      }
      pending = [];
    };

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const a = String(row[0] ?? '').trim();
      const b = String(row[labelCol] ?? '').trim();

      if (mode === 'holdings') {
        if (/מצב החובות/.test(b)) continue;
        if (/מצב הנכסים/.test(b)) {
          sheetHoldingsDate = String(row[2] ?? '');
          continue;
        }
        if (isTotal(a)) continue;
        const v = parseAmount(row[2]);
        if (b && v) sheetHoldings.push({ id: uid(), name: b, value: v });
        continue;
      }

      if (/מצב החובות|מצב הנכסים/.test(b)) {
        flush(kind === 'debt' ? 'החזר חובות' : 'שונות');
        mode = 'holdings';
        if (/מצב הנכסים/.test(b)) sheetHoldingsDate = String(row[2] ?? '');
        continue;
      }
      if (a === 'הוצאות' || a === 'הכנסות') {
        if (a === 'הכנסות') kind = 'income';
        continue;
      }
      if (isTotal(a)) {
        const g = a.replace(/^סה"?כ|^סה״כ|^סך הכל/, '').trim();
        if (/^הוצאות$/.test(g)) {
          flush('שונות');
          kind = 'income';
        } else if (/^הכנסות$/.test(g)) {
          flush('הכנסות');
          kind = 'debt';
        } else if (/חוב/.test(g)) {
          flush('החזר חובות');
          kind = 'expense';
        } else {
          flush(g || 'שונות');
        }
        continue;
      }
      if (!b || /^הפרש/.test(b) || a) continue;
      pending.push({ name: cleanName(b), row });
    }
    flush(kind === 'income' ? 'הכנסות' : kind === 'debt' ? 'החזר חובות' : 'שונות');

    const year = Math.max(...monthCols.map((c) => c.y));
    if (Object.keys(budgetHere).length && year >= latestBudget.year) latestBudget = { year, values: budgetHere };
    if (sheetHoldings.length) {
      holdings = sheetHoldings;
      holdingsDate = sheetHoldingsDate;
    }
    sheets.push({ name: sheetName, months: activeCols.size, cells: cellCount, yearFixed });
  }

  const transactions: Omit<Transaction, 'id'>[] = [];
  for (const { catId, month, amount, sheet } of cells.values()) {
    const cat = catMap.get(catId)!;
    const naturalOut = cat.kind !== 'income';
    const out = amount >= 0 ? naturalOut : !naturalOut;
    transactions.push({
      date: `${month}-01`,
      amount: Math.abs(amount),
      direction: out ? 'out' : 'in',
      description: cat.name,
      categoryId: catId,
      source: 'excel',
      note: `סיכום חודשי מגיליון "${sheet}"`,
    });
  }

  // categories with no data in the last 24 imported months and no budget are archived
  const allMonths = [...new Set([...cells.values()].map((c) => c.month))].sort();
  const recentFrom = allMonths[Math.max(0, allMonths.length - 24)] ?? '';
  const recentCats = new Set([...cells.values()].filter((c) => c.month >= recentFrom).map((c) => c.catId));
  for (const c of catMap.values()) {
    if (!recentCats.has(c.id) && !latestBudget.values[c.id]) c.archived = true;
  }

  return {
    categories: [...catMap.values()],
    transactions,
    budget: latestBudget.values,
    holdings,
    holdingsDate,
    familyName,
    sheets,
    warnings,
  };
}
