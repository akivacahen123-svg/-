import type { Category, Rule, Transaction } from './types';
import { CREDIT_CARD_PAYMENT, MERCHANT_HINTS } from './defaults';

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[0-9]{3,}/g, ' ') // reference / card numbers
    .replace(/["'׳״.,\-_*#/\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Short stable key for learning a rule from a description (first 3 words). */
export function ruleKeyFor(description: string): string {
  return normalize(description).split(' ').filter(Boolean).slice(0, 3).join(' ');
}

function findCategoryByHints(cats: Category[], hints: string[], direction: 'in' | 'out'): Category | undefined {
  const pool = cats.filter((c) => (direction === 'in' ? c.kind === 'income' : c.kind !== 'income'));
  for (const h of hints) {
    const hit = pool.find((c) => c.name.includes(h));
    if (hit) return hit;
  }
  return undefined;
}

export function suggestCategory(
  t: Pick<Transaction, 'description' | 'direction' | 'source'>,
  cats: Category[],
  rules: Rule[]
): string | null {
  const norm = normalize(t.description);
  if (!norm) return null;

  // 1. learned rules – longest keyword wins
  const learned = rules
    .filter((r) => r.keyword && norm.includes(r.keyword))
    .sort((a, b) => b.keyword.length - a.keyword.length)[0];
  if (learned && cats.some((c) => c.id === learned.categoryId)) return learned.categoryId;

  // 2. card payment on the bank statement is a transfer, not an expense
  if (t.source === 'bank' && t.direction === 'out' && CREDIT_CARD_PAYMENT.test(t.description)) {
    const tr = cats.find((c) => c.kind === 'transfer');
    if (tr) return tr.id;
  }

  // 3. merchant hints
  for (const [re, hints] of MERCHANT_HINTS) {
    if (re.test(t.description)) {
      const c = findCategoryByHints(cats, hints, t.direction);
      if (c) return c.id;
    }
  }
  // 4. category names appearing in the text (good for WhatsApp notes like "סופר 350")
  const pool = cats.filter((c) => (t.direction === 'in' ? c.kind === 'income' : c.kind !== 'income'));
  const byName = pool
    .map((c) => ({ c, word: normalize(c.name).split(' ')[0] }))
    .filter((x) => x.word.length >= 3 && norm.includes(x.word))
    .sort((a, b) => b.word.length - a.word.length)[0];
  if (byName) return byName.c.id;

  return null;
}

export function upsertRule(rules: Rule[], description: string, categoryId: string): Rule[] {
  const keyword = ruleKeyFor(description);
  if (!keyword || keyword.length < 2) return rules;
  return [...rules.filter((r) => r.keyword !== keyword), { keyword, categoryId }];
}
