/** A made-up family so the app opens in a working state. Clearly marked as an example in the UI. */
import type { AppData, Transaction } from './types';
import { DEFAULT_CATEGORIES } from './defaults';
import { pad } from './format';

const PLAN: [string, number, number, string[]][] = [
  // category name, monthly base, variance (0..1), sample merchants for itemised months
  ['משכנתא / שכירות', 4200, 0, ['משכנתא טפחות']],
  ['ארנונה', 690, 0, ['עיריית ירושלים']],
  ['מים', 190, 0.25, ['הגיחון']],
  ['חשמל', 560, 0.35, ['חברת החשמל']],
  ['גז', 70, 0.4, ['אמישראגז']],
  ['תיקונים בבית, צורכי מטבח ורכישות שונות', 380, 0.6, ['ACE', 'הום סנטר']],
  ['ביטוח דירה / ביטוח משכנתא', 240, 0, ['הראל ביטוח']],
  ['סופר', 3300, 0.15, ['רמי לוי', 'שופרסל דיל', 'אושר עד']],
  ['השלמות (מכולת, ירקן)', 420, 0.3, ['ירקן השכונה', 'מכולת יוסי']],
  ['אוכל בחוץ', 260, 0.5, ['ארומה', 'פיצה האט']],
  ['ביגוד והנעלה', 750, 0.6, ['קסטרו', 'H&M']],
  ['איפור ופארם', 180, 0.5, ['סופר-פארם']],
  ['קופת חולים, ביטוח משלים וביקורי רופאים', 310, 0.05, ['מכבי שירותי בריאות']],
  ['תרופות וטיפולים', 260, 0.6, ['בית מרקחת']],
  ['מסגרות חינוך (ת"ת, בית ספר, גן)', 1650, 0, ['גן העירייה', 'תלמוד תורה']],
  ['צהרון', 700, 0.3, ['צהרון גפן']],
  ['חוגי ילדים', 320, 0.1, ['מתנ"ס קטמון']],
  ['דלק', 780, 0.2, ['פז', 'סונול']],
  ['רכב - ביטוח חובה', 310, 0, ['ביטוח ישיר']],
  ['שטיפת רכב, חניה וכבישי אגרה', 120, 0.5, ['פנגו']],
  ['טלפונים ניידים', 160, 0, ['פרטנר']],
  ['אינטרנט (תשתית וספק)', 120, 0, ['בזק']],
  ['מתנות לאירועים ולילדים', 420, 0.7, ['שקם אלקטריק', 'מתנה לחתונה']],
  ['תרומות בהוראת קבע', 600, 0.2, ['נדרים פלוס']],
  ['יהדות וחגים', 250, 0.8, ['חנות יודאיקה']],
  ['מנויים דיגיטליים', 75, 0, ['ספוטיפיי']],
  ['הוראת קבע לחיסכון', 1500, 0, ['הו"ק לחיסכון']],
  ['הלוואה לרכב', 950, 0, ['החזר הלוואה לרכב']],
  ['קוסמטיקה ותספורת', 90, 0.5, ['מספרת השכונה']],
  ['קייטנות וטיולים לילדים', 220, 0.9, ['קייטנת קיץ']],
  ['ספרי לימוד וציוד לבית ספר', 120, 0.9, ['סטימצקי']],
  ['רכב - טיפולים', 260, 0.8, ['מוסך']],
  ['עמלות בבנק ובכרטיסי אשראי', 35, 0.2, ['עמלת פעולה']],
  ['קרן לחגים ולהוצאות שנתיות', 600, 0, ['הו"ק קרן חגים']],
  ['משכורת 1', 14200, 0.03, ['משכורת']],
  ['משכורת 2', 9800, 0.03, ['משכורת']],
  ['קצבת ילדים', 590, 0, ['ביטוח לאומי קצבת ילדים']],
];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function demoData(): AppData {
  const r = rng(42);
  const cats = DEFAULT_CATEGORIES;
  const byName = new Map(cats.map((c) => [c.name, c]));
  const now = new Date();
  const txs: Transaction[] = [];
  const budget: Record<string, number> = {};
  let id = 0;
  const months: string[] = [];
  for (let k = 17; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  const lastMonth = months[months.length - 1];
  for (const [name, base, vari, merchants] of PLAN) {
    const c = byName.get(name);
    if (!c) continue;
    budget[c.id] = Math.round((base * (c.kind === 'expense' ? 0.95 : 1)) / 10) * 10;
    months.forEach((m, mi) => {
      const mo = Number(m.slice(5));
      let amt = base * (1 + (r() * 2 - 1) * vari) * (1 + mi * 0.004);
      if (name === 'חשמל' && mo % 2 === 0) amt = 0;
      if (name === 'חשמל' && mo % 2 === 1) amt *= 2;
      if (name === 'יהדות וחגים' && (mo === 4 || mo === 9)) amt *= 6;
      if (name === 'ביגוד והנעלה' && (mo === 3 || mo === 9)) amt *= 2.2;
      if (name === 'צהרון' && (mo === 7 || mo === 8)) amt *= 2.5;
      if (amt <= 0) return;
      const direction = c.kind === 'income' ? 'in' : 'out';
      if (m === lastMonth && merchants.length) {
        // the current month is itemised, like a real bank/credit import
        const parts = name === 'סופר' ? 4 : merchants.length;
        for (let p = 0; p < parts; p++) {
          const day = Math.min(28, 2 + Math.floor(r() * 20));
          txs.push({ id: `demo-${id++}`, date: `${m}-${pad(day)}`, amount: Math.round(amt / parts), direction, description: merchants[p % merchants.length], categoryId: c.id, source: name === 'סופר' || name === 'דלק' || name === 'ביגוד והנעלה' ? 'credit' : 'bank' });
        }
      } else {
        txs.push({ id: `demo-${id++}`, date: `${m}-01`, amount: Math.round(amt), direction, description: c.name, categoryId: c.id, source: 'excel', note: 'סיכום חודשי לדוגמה' });
      }
    });
  }
  // a couple of WhatsApp notes and one uncategorised line in the current month
  txs.push({ id: `demo-${id++}`, date: `${lastMonth}-12`, amount: 85, direction: 'out', description: 'ירקן', categoryId: byName.get('השלמות (מכולת, ירקן)')!.id, source: 'whatsapp' });
  txs.push({ id: `demo-${id++}`, date: `${lastMonth}-15`, amount: 140, direction: 'out', description: 'חנות כלבו', categoryId: null, source: 'credit' });

  return {
    version: 1,
    categories: cats,
    transactions: txs,
    budget,
    rules: [],
    batches: [],
    courseDone: ['m1l1', 'm1l2'],
    familyName: 'משפחת לוי (דוגמה)',
    holdings: [
      { id: 'h1', name: 'דירת מגורים', value: 2150000 },
      { id: 'h2', name: 'קרן השתלמות', value: 86000 },
      { id: 'h3', name: 'קרן חירום (פיקדון)', value: 24000 },
      { id: 'h4', name: 'רכב', value: 68000 },
      { id: 'h5', name: 'יתרת משכנתא', value: -940000 },
      { id: 'h6', name: 'הלוואה לרכב', value: -31000 },
    ],
    holdingsDate: '',
    isDemo: true,
  };
}
