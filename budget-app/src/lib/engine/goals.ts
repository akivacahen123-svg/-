import { type Agorot, assertAgorot, ceilDiv, roundAgorot } from './money';

export type GoalStatus = 'reached' | 'on-track' | 'gap' | 'needs-attention' | 'no-date';

export interface GoalPlan {
  required: Agorot | null;
  status: GoalStatus;
  /** set when capacity is given */
  monthlyGap?: Agorot;
  projectedEnd?: Agorot;
  shortfall?: Agorot;
  note: string;
}

/**
 * Monthly deposit needed for a goal, with NO assumed return.
 * required = max(target − current, 0) ÷ deposits left. A goal with no date, or whose date has
 * passed / leaves no deposit, gets a status to handle — never a division by zero or an invented date.
 */
export function goalPlan(target: Agorot, current: Agorot, depositsLeft: number | null, capacity?: Agorot): GoalPlan {
  assertAgorot(target, 'target');
  assertAgorot(current, 'current');
  const missing = Math.max(0, target - current);
  if (missing === 0) return { required: 0, status: 'reached', note: 'היעד כבר מכוסה.' };
  if (depositsLeft === null) return { required: null, status: 'no-date', note: 'אין מועד ליעד, ולכן אין חישוב הפקדה חודשית.' };
  if (depositsLeft <= 0) return { required: null, status: 'needs-attention', note: 'מועד היעד עבר או שלא נותרה הפקדה. צריך לבחור מועד, סכום או סדר עדיפות חדשים.' };
  const required = ceilDiv(missing, depositsLeft);
  if (capacity === undefined) return { required, status: 'on-track', note: '' };
  assertAgorot(capacity, 'capacity');
  const projectedEnd = current + capacity * depositsLeft;
  const shortfall = Math.max(0, target - projectedEnd);
  const monthlyGap = Math.max(0, required - capacity);
  return {
    required,
    status: shortfall > 0 ? 'gap' : 'on-track',
    monthlyGap,
    projectedEnd,
    shortfall,
    note: shortfall > 0 ? 'בקצב הזה היעד לא יושג במועד. אפשר לשנות סכום, מועד או סדר עדיפות.' : '',
  };
}

export interface GoalDemand {
  id: string;
  /** monthly amount the goal needs */
  required: Agorot;
}

export interface Allocation {
  id: string;
  required: Agorot;
  allocated: Agorot;
  fullyFunded: boolean;
}

/**
 * Split one monthly capacity across goals in priority order. Each shekel is used once:
 * the same balance is never counted for two goals.
 */
export function allocateGoals(capacity: Agorot, demands: GoalDemand[]): { allocations: Allocation[]; totalRequired: Agorot; gap: Agorot } {
  assertAgorot(capacity, 'capacity');
  let left = capacity;
  const allocations = demands.map((g) => {
    const allocated = Math.min(left, g.required);
    left -= allocated;
    return { id: g.id, required: g.required, allocated, fullyFunded: allocated === g.required };
  });
  const totalRequired = demands.reduce((s, g) => s + g.required, 0);
  return { allocations, totalRequired, gap: Math.max(0, totalRequired - capacity) };
}

/** Inflation scenario only: cost in today's shekels → future shekels. Never applied to a goal already set in future shekels. */
export function inflate(costToday: Agorot, annualRate: number, years: number): Agorot {
  return roundAgorot(costToday * Math.pow(1 + annualRate, years));
}
