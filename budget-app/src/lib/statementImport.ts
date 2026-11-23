/**
 * Reads bank and credit-card exports (xlsx / xls / csv / html-as-xls, as Israeli banks often send).
 * Finds the header row, guesses which column is which, and returns rows for review.
 */
import * as XLSX from 'xlsx';
import { parseAmount, parseDate } from './format';

export type StatementKind = 'bank' | 'credit';

export interface ColumnMap {
  date: number;
  description: number;
  /** single signed amount column, or -1 */
  amount: number;
  /** bank-style split columns, or -1 */
  debit: number;
  credit: number;
}

export interface ParsedTable {
  sheet: string;
  headerRow: number;
  headers: string[];
  rows: unknown[][];
  map: ColumnMap;
}

export interface StatementRow {
  date: string;
  description: string;
  amount: number;
  direction: 'in' | 'out';
}

const DATE_H = [/תאריך עסקה/, /תאריך רכישה/, /^תאריך$/, /תאריך ערך/, /תאריך/, /date/i];
const DESC_H = [/שם בית (ה)?עסק/, /בית עסק/, /תיאור/, /תאור/, /פרטים/, /הפעולה/, /אסמכתא/, /description|merchant/i];
const AMOUNT_H = [/סכום חיוב/, /סכום לחיוב/, /סכום ב.?ש"?ח/, /סכום העסקה/, /סכום עסקה/, /^סכום$/, /סכום/, /amount/i];
const DEBIT_H = [/^חובה$/, /חובה/, /debit/i];
const CREDIT_H = [/^זכות$/, /זכות/, /credit/i];

function pick(headers: string[], pats: RegExp[], skip: number[] = []): number {
  for (const p of pats) {
    const i = headers.findIndex((h, idx) => !skip.includes(idx) && p.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

export function readWorkbook(buf: ArrayBuffer, fileName: string): XLSX.WorkBook {
  if (/\.csv$/i.test(fileName)) {
    // try UTF-8, fall back to Windows-1255 (Hebrew) when the text looks garbled
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes(String.fromCharCode(0xfffd))) text = new TextDecoder('windows-1255').decode(buf);
    // raw: keep cells as text so 01/07/2026 is not read as January 7th (US order)
    return XLSX.read(text, { type: 'string', raw: true });
  }
  return XLSX.read(buf, { cellDates: true });
}

export function detectTables(wb: XLSX.WorkBook): ParsedTable[] {
  const out: ParsedTable[] = [];
  for (const sheet of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, raw: true, blankrows: false, defval: '' });
    for (let r = 0; r < Math.min(rows.length, 40); r++) {
      const headers = (rows[r] || []).map((c) => String(c ?? '').replace(/\s+/g, ' ').trim());
      const date = pick(headers, DATE_H);
      const description = pick(headers, DESC_H, [date]);
      let amount = pick(headers, AMOUNT_H, [date, description]);
      const debit = pick(headers, DEBIT_H, [date, description]);
      const credit = pick(headers, CREDIT_H, [date, description, debit]);
      if (debit >= 0 && credit >= 0) amount = -1;
      if (date < 0 || description < 0 || (amount < 0 && (debit < 0 || credit < 0))) continue;
      const body = rows.slice(r + 1);
      const valid = body.filter((row) => parseDate(row[date])).length;
      if (valid === 0) continue;
      out.push({ sheet, headerRow: r, headers, rows: body, map: { date, description, amount, debit, credit } });
      break;
    }
  }
  return out;
}

export function extractRows(t: ParsedTable, kind: StatementKind, positiveIsExpense: boolean): StatementRow[] {
  const res: StatementRow[] = [];
  for (const row of t.rows) {
    const date = parseDate(row[t.map.date]);
    if (!date) continue;
    const description = String(row[t.map.description] ?? '').replace(/\s+/g, ' ').trim();
    let signed: number | null = null; // + = money in, − = money out
    if (t.map.amount >= 0) {
      const a = parseAmount(row[t.map.amount]);
      if (a == null) continue;
      signed = positiveIsExpense ? -a : a;
    } else {
      const d = parseAmount(row[t.map.debit]) ?? 0;
      const c = parseAmount(row[t.map.credit]) ?? 0;
      signed = c - d;
    }
    if (!signed) continue;
    res.push({ date, description: description || (kind === 'credit' ? 'עסקה בכרטיס' : 'תנועה בחשבון'), amount: Math.abs(signed), direction: signed > 0 ? 'in' : 'out' });
  }
  return res;
}
