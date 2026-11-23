import { type Agorot, assertAgorot, roundAgorot } from './money';

export type RateKind = 'nominal' | 'effective';

/** Annual rate (as a decimal, 0.06 = 6%) → monthly rate. The two kinds are never mixed silently. */
export function monthlyRate(annual: number, kind: RateKind): number {
  if (annual < 0) throw new Error('negative rate');
  return kind === 'nominal' ? annual / 12 : Math.pow(1 + annual, 1 / 12) - 1;
}

/**
 * Level payment for a non-indexed, fixed-rate loan: A = P·r / (1 − (1+r)^−n); at r = 0, A = P / n.
 * Returns the rounded payment and the total repaid (the last payment absorbs rounding).
 * Not a model of every credit product.
 */
export function loanPayment(principal: Agorot, annual: number, kind: RateKind, months: number): { payment: Agorot; total: Agorot; interest: Agorot } {
  assertAgorot(principal, 'principal');
  if (!Number.isInteger(months) || months <= 0) throw new Error('months must be a positive integer');
  const r = monthlyRate(annual, kind);
  const exact = r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months));
  const payment = roundAgorot(exact);
  // run the schedule so the total is exact to the agora
  let bal = principal;
  let total = 0;
  for (let k = 1; k <= months; k++) {
    const interest = roundAgorot(bal * r);
    const pay = k === months ? bal + interest : payment;
    bal = bal + interest - pay;
    total += pay;
  }
  return { payment, total, interest: total - principal };
}

export type DebtStatus = 'decreasing' | 'not-decreasing' | 'missing-rate' | 'paid';

export interface DebtProjection {
  status: DebtStatus;
  /** month-by-month balances (only when the rate is known) */
  balances: Agorot[];
  /** months to payoff, or null when there is no honest end date */
  monthsToPayoff: number | null;
  note: string;
}

/**
 * Simple monthly projection: new balance = old balance + interest + fees − payment.
 * If the payment does not cover what is added each month, there is no payoff date.
 * An unknown rate is NOT treated as 0%.
 */
export function projectDebt(opts: { balance: Agorot; monthlyRate: number | null; monthlyFees?: Agorot; payment: Agorot; horizon?: number }): DebtProjection {
  const { balance, payment } = opts;
  const fees = opts.monthlyFees ?? 0;
  assertAgorot(balance, 'balance');
  assertAgorot(payment, 'payment');
  if (balance <= 0) return { status: 'paid', balances: [0], monthsToPayoff: 0, note: 'החוב סגור.' };
  if (opts.monthlyRate === null) return { status: 'missing-rate', balances: [], monthsToPayoff: null, note: 'הריבית לא ידועה. אי אפשר לחשב מתי החוב ייסגר. כדאי לבדוק אותה בדף החשבון או בהסכם.' };
  const horizon = opts.horizon ?? 600;
  const balances: Agorot[] = [balance];
  let bal = balance;
  for (let k = 1; k <= horizon; k++) {
    const added = roundAgorot(bal * opts.monthlyRate) + fees;
    if (k === 1 && payment <= added) {
      return {
        status: 'not-decreasing',
        balances: [balance, bal + added - payment],
        monthsToPayoff: null,
        note: 'התשלום החודשי לא מכסה את הריבית והעמלות, ולכן החוב לא קטן ואין תאריך סגירה.',
      };
    }
    bal = Math.max(0, bal + added - payment);
    balances.push(bal);
    if (bal === 0) return { status: 'decreasing', balances, monthsToPayoff: k, note: '' };
  }
  return { status: 'decreasing', balances, monthsToPayoff: null, note: 'החוב יורד, אבל לא ייסגר בטווח שנבדק.' };
}

/** A month with fixed additions (interest + fees already known in shekels), as in worked example ו. */
export function debtAfterMonth(balance: Agorot, additions: Agorot, payment: Agorot): { balance: Agorot; decreasing: boolean } {
  [balance, additions, payment].forEach((a) => assertAgorot(a));
  return { balance: balance + additions - payment, decreasing: payment > additions };
}
