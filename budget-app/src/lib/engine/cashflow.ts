import { type Agorot, assertAgorot } from './money';
import { addDays, compareISO, type ISODate } from './dates';

export interface CashEvent {
  date: ISODate;
  /** + money in, − money out */
  amount: Agorot;
  label: string;
  /** planned items are forecasts, not bank facts */
  planned?: boolean;
}

export interface DayBalance {
  date: ISODate;
  /** balance at the end of the day */
  balance: Agorot;
  /** lowest point reached during the day (outflows are applied first) */
  low: Agorot;
  events: CashEvent[];
  /** both money in and out on the same day: real order unknown */
  orderUncertain: boolean;
}

export interface Forecast {
  days: DayBalance[];
  /** first day the balance goes below zero, or null */
  firstShortfall: { date: ISODate; low: Agorot; events: CashEvent[] } | null;
  lowest: { date: ISODate; low: Agorot };
  end: Agorot;
}

/**
 * Daily cash forecast: opening balance (as of a date) + money in − money out, day by day.
 * Same-day policy: outflows are applied before inflows (the cautious view), and the day is
 * marked as uncertain so the screen can say so. A credit line is never added to the balance.
 */
export function forecastCash(openingDate: ISODate, opening: Agorot, events: CashEvent[], until: ISODate): Forecast {
  assertAgorot(opening, 'opening balance');
  events.forEach((e) => assertAgorot(e.amount, e.label));
  const days: DayBalance[] = [];
  let bal = opening;
  let firstShortfall: Forecast['firstShortfall'] = null;
  let lowest = { date: openingDate, low: opening };
  for (let d = openingDate; compareISO(d, until) <= 0; d = addDays(d, 1)) {
    const today = events.filter((e) => e.date === d);
    const outs = today.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
    const ins = today.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
    const low = bal + outs;
    bal = low + ins;
    const day: DayBalance = { date: d, balance: bal, low, events: today, orderUncertain: outs < 0 && ins > 0 };
    days.push(day);
    if (low < lowest.low) lowest = { date: d, low };
    if (!firstShortfall && low < 0) firstShortfall = { date: d, low, events: today };
  }
  return { days, firstShortfall, lowest, end: bal };
}
