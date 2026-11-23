/**
 * Calendar dates as 'YYYY-MM-DD' strings in Asia/Jerusalem. Dates have no time of day,
 * so arithmetic is done in UTC on the calendar date and never shifts across midnight.
 */
export type ISODate = string;

const toUTC = (d: ISODate) => {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};
const fromUTC = (t: number): ISODate => new Date(t).toISOString().slice(0, 10);

export const addDays = (d: ISODate, n: number): ISODate => fromUTC(toUTC(d) + n * 86400000);
export const compareISO = (a: ISODate, b: ISODate) => (a < b ? -1 : a > b ? 1 : 0);

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The same day next month; a day that does not exist (31st, 29 Feb) becomes the month's last day. */
export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m, day] = d.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(day, daysInMonth(ny, nm));
  return `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

/** Today in Israel, as a calendar date. */
export function todayInIsrael(now = new Date()): ISODate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/**
 * How many monthly deposits on `dayOfMonth` fall in (from, due], i.e. after today and no later than the due date.
 * Counted from real dates, not from the difference in month names.
 */
export function countMonthlyDeposits(from: ISODate, due: ISODate, dayOfMonth: number): number {
  if (compareISO(due, from) <= 0) return 0;
  let n = 0;
  for (let k = 0; ; k++) {
    const d = monthlyOn(from, k, dayOfMonth);
    if (compareISO(d, due) > 0) break;
    if (compareISO(d, from) > 0) n++;
  }
  return n;
}

/** The deposit day in the k-th month after `start`'s month (the day is clamped to the month's length). */
function monthlyOn(start: ISODate, k: number, dayOfMonth: number): ISODate {
  const [y, m] = addMonths(`${start.slice(0, 7)}-01`, k).split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(dayOfMonth, daysInMonth(y, m))).padStart(2, '0')}`;
}
