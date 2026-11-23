import { type Agorot, assertAgorot, ceilDiv, sum } from './money';

export interface BudgetInput {
  /** Planned net income for the month. A loan received is NOT income here. */
  netIncome: Agorot;
  /** Planned running expenses (housing, food, ...). */
  expenses: Agorot[];
  /** Planned minimum debt payments (principal + interest), counted once. */
  debtService: Agorot[];
  /** Planned allocations to reserves (emergency, annual costs). */
  reserves: Agorot[];
  /** Planned allocations to goals. */
  goals: Agorot[];
}

export interface BudgetResult {
  expenses: Agorot;
  debtService: Agorot;
  reserves: Agorot;
  goals: Agorot;
  /** Income minus running expenses, before debt and savings. */
  operatingSurplus: Agorot;
  /** What is left for reserves and goals after debt service. */
  beforeSavings: Agorot;
  /** What is left after every allocation. Negative = the plan is over-allocated. */
  unallocated: Agorot;
}

export function monthlyBudget(i: BudgetInput): BudgetResult {
  [i.netIncome, ...i.expenses, ...i.debtService, ...i.reserves, ...i.goals].forEach((a) => assertAgorot(a));
  const expenses = sum(i.expenses);
  const debtService = sum(i.debtService);
  const reserves = sum(i.reserves);
  const goals = sum(i.goals);
  const operatingSurplus = i.netIncome - expenses;
  const beforeSavings = operatingSurplus - debtService;
  return { expenses, debtService, reserves, goals, operatingSurplus, beforeSavings, unallocated: beforeSavings - reserves - goals };
}

/**
 * Monthly set-aside for a known annual (or periodic) cost.
 * In a full year it is cost / 12. If the bill is due sooner, what is still missing
 * is spread over the months that remain — not over 12.
 */
export function annualCostAllocation(cost: Agorot, reserved: Agorot, monthsUntilDue: number): { monthly: Agorot; status: 'ok' | 'covered' | 'due-now' } {
  assertAgorot(cost, 'cost');
  assertAgorot(reserved, 'reserved');
  const missing = Math.max(0, cost - reserved);
  if (missing === 0) return { monthly: 0, status: 'covered' };
  if (monthsUntilDue <= 0) return { monthly: missing, status: 'due-now' };
  return { monthly: ceilDiv(missing, Math.min(monthsUntilDue, 12)), status: 'ok' };
}
