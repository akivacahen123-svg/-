/**
 * Best-effort reader for PDF statements (bank "עו"ש" summaries and credit-card monthly bills).
 * Rebuilds text lines from pdf.js positions and keeps lines that contain a date and an amount.
 * Every row is shown for review before it is saved.
 */
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseAmount, parseDate } from './format';
import type { StatementRow } from './statementImport';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

async function pdfLines(buf: ArrayBuffer): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      const arr = rows.get(y) ?? [];
      arr.push({ x: item.transform[4], s: item.str });
      rows.set(y, arr);
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      // Hebrew documents read right-to-left: right-most fragment first
      .forEach(([, items]) => lines.push(items.sort((a, b) => b.x - a.x).map((i) => i.s.trim()).join('  ')));
  }
  return lines;
}

const DATE_RE = /\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/;
const AMOUNT_RE = /-?\d{1,3}(?:,\d{3})*\.\d{2}-?|-?\d+\.\d{2}-?/g;

export async function parsePdfStatement(buf: ArrayBuffer, kind: 'bank' | 'credit'): Promise<{ rows: StatementRow[]; lines: string[] }> {
  const lines = await pdfLines(buf);
  const rows: StatementRow[] = [];
  for (const line of lines) {
    const d = line.match(DATE_RE);
    if (!d) continue;
    const date = parseDate(d[1]);
    if (!date) continue;
    const amounts = (line.match(AMOUNT_RE) ?? []).map((a) => parseAmount(a)).filter((n): n is number => n != null && n !== 0);
    if (!amounts.length) continue;
    // Credit cards: the charge amount is usually the last (left-most) money column.
    // Bank: lines carry movement then running balance; the movement is the first amount.
    const value = kind === 'credit' ? amounts[amounts.length - 1] : amounts[0];
    const description = line
      .replace(new RegExp(DATE_RE.source, 'g'), ' ')
      .replace(AMOUNT_RE, ' ')
      .replace(/[₪]|ש"ח/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!description || description.length < 2) continue;
    let direction: 'in' | 'out';
    if (kind === 'credit') direction = value < 0 ? 'in' : 'out';
    else direction = value < 0 ? 'out' : /זיכוי|משכורת|העברה מ|הפקדה|קצבה|ביטוח לאומי/.test(description) ? 'in' : 'out';
    rows.push({ date, description, amount: Math.abs(value), direction });
  }
  return { rows, lines };
}
