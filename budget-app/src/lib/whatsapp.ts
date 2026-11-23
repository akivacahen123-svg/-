/**
 * Turns WhatsApp notes into transactions.
 * Accepts an exported chat (.txt) or pasted lines such as:
 *   [23/11/2026, 10:15:22] עקיבא: סופר 350
 *   23.11.2026, 10:15 - שרה: דלק 200 ש"ח
 *   ביגוד לילדים 480
 *   +1200 החזר מס          (a leading + or the words הכנסה/קיבלתי mark income)
 */
import { parseDate, todayISO } from './format';

export interface NoteRow {
  date: string;
  description: string;
  amount: number;
  direction: 'in' | 'out';
  who?: string;
  raw: string;
}

const HEADER = /^‎?\[?(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:[AP]M)?\]?\s*(?:-\s*)?([^:]{1,40}):\s*(.*)$/;
const INCOME_WORDS = /הכנסה|קיבלתי|התקבל|החזר מס|משכורת|זיכוי|נכנס/;
const SKIP = /<המדיה הושמטה>|<Media omitted>|הודעה זו נמחקה|This message was deleted|ההודעות והשיחות מוצפנות/;

export function parseNotes(text: string, fallbackDate = todayISO()): NoteRow[] {
  const out: NoteRow[] = [];
  // lines without a date take the date of the message above them
  let lastDate = fallbackDate;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/[‎‏‪-‮]/g, '').trim();
    if (!line || SKIP.test(line)) continue;
    let date = lastDate;
    let who: string | undefined;
    let msg = line;
    const h = line.match(HEADER);
    if (h) {
      date = parseDate(h[1]) ?? fallbackDate;
      who = h[3].trim();
      msg = h[4].trim();
    } else {
      // a bare date at the start of a pasted line: "23/11 סופר 350"
      const d = line.match(/^(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)\s+(.*)$/);
      if (d) {
        const withYear = /\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(d[1]) ? d[1] : `${d[1]}/${fallbackDate.slice(0, 4)}`;
        date = parseDate(withYear) ?? fallbackDate;
        msg = d[2];
      }
    }
    lastDate = date;
    // several entries in one message: "סופר 350, דלק 200"
    for (const part of msg.split(/[,;\n]|\s+ו(?=\S+\s+\d)/)) {
      const p = part.trim();
      const m = p.match(/([+-]?)\s*₪?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(?:₪|ש"ח|שח|שקל(?:ים)?)?/);
      if (!m) continue;
      const amount = parseFloat(m[2].replace(/,/g, '') + (m[3] ? `.${m[3]}` : ''));
      if (!amount || amount > 1_000_000) continue;
      const description = p.replace(m[0], ' ').replace(/\s+/g, ' ').replace(/^[-–:]+|[-–:]+$/g, '').trim();
      if (!description) continue;
      const direction = m[1] === '+' || INCOME_WORDS.test(description) ? 'in' : 'out';
      out.push({ date, description, amount, direction, who, raw: line });
    }
  }
  return out;
}
