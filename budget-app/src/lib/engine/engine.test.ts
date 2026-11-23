/**
 * Worked examples א–ז from the product spec (section 10), plus edge cases:
 * rounding, zero, negative values, missing fields, month ends and 29 February.
 * All figures are invented demo numbers.
 */
import { describe, expect, it } from 'vitest';
import { formatAgorot, parseShekels, shekels } from './money';
import { annualCostAllocation, monthlyBudget } from './budget';
import { forecastCash } from './cashflow';
import { allocateGoals, goalPlan, inflate } from './goals';
import { debtAfterMonth, loanPayment, monthlyRate, projectDebt } from './debt';
import { addMonths, countMonthlyDeposits } from './dates';

const ils = shekels;

describe('דוגמה א - תקציב', () => {
  it('leaves 1,200 ₪ before savings and nothing after allocating it', () => {
    const r = monthlyBudget({ netIncome: ils(17000), expenses: [ils(14200)], debtService: [ils(1600)], reserves: [ils(500)], goals: [ils(700)] });
    expect(r.operatingSurplus).toBe(ils(2800));
    expect(r.beforeSavings).toBe(ils(1200));
    expect(r.unallocated).toBe(0);
  });
  it('counts debt service once, not again as an expense', () => {
    const r = monthlyBudget({ netIncome: ils(17000), expenses: [ils(14200)], debtService: [ils(1600)], reserves: [], goals: [] });
    expect(r.expenses + r.debtService).toBe(ils(15800));
  });
  it('shows a negative remainder when over-allocated', () => {
    const r = monthlyBudget({ netIncome: ils(17000), expenses: [ils(14200)], debtService: [ils(1600)], reserves: [ils(800)], goals: [ils(700)] });
    expect(r.unallocated).toBe(ils(-300));
  });
});

describe('דוגמה ב - תזרים', () => {
  const f = forecastCash('2026-03-01', ils(1000), [
    { date: '2026-03-05', amount: ils(-2500), label: 'תשלום' },
    { date: '2026-03-10', amount: ils(4000), label: 'משכורת' },
  ], '2026-03-31');
  it('finds the shortfall on the 5th even though the month ends positive', () => {
    expect(f.firstShortfall?.date).toBe('2026-03-05');
    expect(f.firstShortfall?.low).toBe(ils(-1500));
    expect(f.end).toBe(ils(2500));
  });
  it('updates when the opening balance changes', () => {
    const g = forecastCash('2026-03-01', ils(3000), [{ date: '2026-03-05', amount: ils(-2500), label: 'תשלום' }], '2026-03-31');
    expect(g.firstShortfall).toBeNull();
  });
  it('applies outflows first on a mixed day and flags the order as uncertain', () => {
    const g = forecastCash('2026-03-01', ils(100), [
      { date: '2026-03-02', amount: ils(500), label: 'in' },
      { date: '2026-03-02', amount: ils(-300), label: 'out' },
    ], '2026-03-03');
    expect(g.days[1].low).toBe(ils(-200));
    expect(g.days[1].orderUncertain).toBe(true);
    expect(g.firstShortfall?.date).toBe('2026-03-02');
  });
});

describe('דוגמה ג - יעד אחד', () => {
  it('needs 1,000 ₪ a month for 96 deposits', () => {
    expect(goalPlan(ils(120000), ils(24000), 96).required).toBe(ils(1000));
  });
  it('shows the gap at 700 ₪ a month without assuming any return', () => {
    const p = goalPlan(ils(120000), ils(24000), 96, ils(700));
    expect(p.status).toBe('gap');
    expect(p.monthlyGap).toBe(ils(300));
    expect(p.projectedEnd).toBe(ils(91200));
    expect(p.shortfall).toBe(ils(28800));
  });
  it('rounds the required deposit up so the target is met', () => {
    expect(goalPlan(ils(100), 0, 3).required).toBe(3334);
  });
  it('handles a passed date, zero deposits and no date without dividing by zero', () => {
    expect(goalPlan(ils(1000), 0, 0).status).toBe('needs-attention');
    expect(goalPlan(ils(1000), 0, null).status).toBe('no-date');
    expect(goalPlan(ils(1000), ils(1200), 5).status).toBe('reached');
  });
});

describe('דוגמה ד - יעדים מקבילים', () => {
  it('does not mark all three goals as funded', () => {
    const r = allocateGoals(ils(1200), [
      { id: 'a', required: ils(700) },
      { id: 'b', required: ils(500) },
      { id: 'c', required: ils(300) },
    ]);
    expect(r.totalRequired).toBe(ils(1500));
    expect(r.gap).toBe(ils(300));
    expect(r.allocations.filter((x) => x.fullyFunded).map((x) => x.id)).toEqual(['a', 'b']);
    expect(r.allocations.reduce((s, x) => s + x.allocated, 0)).toBe(ils(1200));
  });
});

describe('דוגמה ה - תקופת הלוואה', () => {
  it('at 0% and no fees, 12 or 24 payments cost the same in total', () => {
    const a = loanPayment(ils(12000), 0, 'nominal', 12);
    const b = loanPayment(ils(12000), 0, 'nominal', 24);
    expect(a.payment).toBe(ils(1000));
    expect(b.payment).toBe(ils(500));
    expect(a.total).toBe(b.total);
  });
  it('with interest, the longer term costs more and the total is computed', () => {
    const a = loanPayment(ils(12000), 0.06, 'nominal', 12);
    const b = loanPayment(ils(12000), 0.06, 'nominal', 24);
    expect(a.payment).toBe(103280); // 12,000·0.005 / (1 − 1.005^−12) = 1,032.797 → 1,032.80 ₪
    expect(b.total).toBeGreaterThan(a.total);
  });
  it('keeps nominal and effective rates apart', () => {
    expect(monthlyRate(0.12, 'nominal')).toBeCloseTo(0.01, 10);
    expect(monthlyRate(0.12, 'effective')).toBeCloseTo(0.0094888, 6);
  });
});

describe('דוגמה ו - חוב שאינו יורד', () => {
  it('grows to 10,020 ₪ and has no payoff date', () => {
    const r = debtAfterMonth(ils(10000), ils(120), ils(100));
    expect(r.balance).toBe(ils(10020));
    expect(r.decreasing).toBe(false);
    const p = projectDebt({ balance: ils(10000), monthlyRate: 0, monthlyFees: ils(120), payment: ils(100) });
    expect(p.status).toBe('not-decreasing');
    expect(p.monthsToPayoff).toBeNull();
  });
});

describe('דוגמה ז - מידע חסר', () => {
  it('an unknown rate is not treated as 0%', () => {
    const p = projectDebt({ balance: ils(5000), monthlyRate: null, payment: ils(500) });
    expect(p.status).toBe('missing-rate');
    expect(p.monthsToPayoff).toBeNull();
  });
  it('a goal without a date gets no invented end date', () => {
    expect(goalPlan(ils(5000), 0, null).required).toBeNull();
  });
});

describe('מקרי קצה', () => {
  it('parses shekel strings into whole agorot', () => {
    expect(parseShekels('1,234.5')).toBe(123450);
    expect(parseShekels('-50')).toBe(-5000);
    expect(parseShekels('abc')).toBeNull();
    expect(parseShekels('0.1')).toBe(10);
  });
  it('formats agorot for Hebrew', () => {
    expect(formatAgorot(123450)).toBe('1,234.50 ₪');
    expect(formatAgorot(-5000)).toBe('-50 ₪');
  });
  it('rejects non-integer agorot', () => {
    expect(() => monthlyBudget({ netIncome: 10.5, expenses: [], debtService: [], reserves: [], goals: [] })).toThrow();
  });
  it('clamps month ends and 29 February', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28');
  });
  it('counts deposits from real dates', () => {
    expect(countMonthlyDeposits('2026-01-15', '2026-04-10', 10)).toBe(3); // Feb, Mar, Apr 10
    expect(countMonthlyDeposits('2026-01-05', '2026-01-31', 10)).toBe(1);
    expect(countMonthlyDeposits('2026-03-01', '2026-02-01', 10)).toBe(0);
  });
  it('spreads an annual bill over the months left, not over 12', () => {
    expect(annualCostAllocation(ils(1200), 0, 12).monthly).toBe(ils(100));
    expect(annualCostAllocation(ils(1200), 0, 3).monthly).toBe(ils(400));
    expect(annualCostAllocation(ils(1200), ils(1200), 3).status).toBe('covered');
    expect(annualCostAllocation(ils(1200), ils(300), 0).monthly).toBe(ils(900));
  });
  it('inflation is a separate scenario', () => {
    expect(inflate(ils(100000), 0.03, 2)).toBe(ils(106090));
  });
});
