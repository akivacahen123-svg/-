const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

export const money = (n: number) => ils.format(Math.round(n));
export const plain = (n: number) => num.format(Math.round(n));

export const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
export const MONTHS_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

/** 'YYYY-MM' */
export const monthKey = (date: string) => date.slice(0, 7);
export const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** Parse many date shapes found in Israeli statements: 23/11/2026, 23.11.26, 2026-11-23, Excel serials, Date objects. */
export function parseDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    // Excel serial date
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    const mo = +m[2];
    const d = +m[1];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  return null;
}

/** Parse "1,234.50", "₪ 1,234", "-120.00", "120-" (trailing minus as some banks print). */
export function parseAmount(v: unknown): number | null {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (v == null) return null;
  let s = String(v).replace(/[₪\s‎‏]|ש"ח|NIS/g, '');
  if (!s) return null;
  let neg = false;
  if (/^-/.test(s) || /-$/.test(s) || /^\(.*\)$/.test(s)) neg = true;
  s = s.replace(/[()\-]/g, '').replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  return neg ? -n : n;
}
