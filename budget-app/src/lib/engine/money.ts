/**
 * Money is stored and computed as whole agorot (integers). 1 ₪ = 100 agorot.
 * Floating-point shekels are never used for arithmetic.
 */
export type Agorot = number;

/** Values that may be missing. A missing value is NOT zero. */
export type Known<T> = { known: true; value: T } | { known: false };
export const known = <T>(value: T): Known<T> => ({ known: true, value });
export const unknown: Known<never> = { known: false };

/** How sure we are about a figure. */
export type Certainty = 'verified' | 'estimate' | 'missing';

export function assertAgorot(a: Agorot, label = 'amount'): void {
  if (!Number.isSafeInteger(a)) throw new Error(`${label} must be whole agorot, got ${a}`);
}

/** Parse "1,234.56", "1234", "-50.5", "₪ 12" into agorot without float rounding drift. */
export function parseShekels(input: string | number): Agorot | null {
  const s = String(input).replace(/[₪\s,‎‏]/g, '');
  const m = s.match(/^(-)?(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const whole = Number(m[2]);
  const frac = Number((m[3] ?? '').padEnd(2, '0'));
  const v = whole * 100 + frac;
  return m[1] ? -v : v;
}

export const shekels = (n: number): Agorot => Math.round(n * 100);

/** Format agorot for Hebrew UI: "1,234 ₪" or "1,234.50 ₪". */
export function formatAgorot(a: Agorot, opts: { decimals?: boolean } = {}): string {
  const neg = a < 0;
  const abs = Math.abs(a);
  const whole = Math.floor(abs / 100).toLocaleString('he-IL');
  const frac = abs % 100;
  const body = opts.decimals || frac ? `${whole}.${String(frac).padStart(2, '0')}` : whole;
  return `${neg ? '-' : ''}${body} ₪`;
}

/** Round half away from zero to whole agorot. */
export const roundAgorot = (x: number): Agorot => (x < 0 ? -Math.round(-x) : Math.round(x));

/** Divide, rounding UP to the next agora (used when a target must be reached). */
export const ceilDiv = (a: Agorot, n: number): Agorot => {
  if (n <= 0) throw new Error('division by zero or negative count');
  return Math.ceil(a / n);
};

export const sum = (xs: Agorot[]): Agorot => xs.reduce((s, x) => s + x, 0);
