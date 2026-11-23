import React, { useState } from 'react';
import { CategorySelect } from './ui';
import { suggestCategory } from '../lib/categorize';
import { todayISO } from '../lib/format';
import { useStore } from '../lib/store';
import { upsertRule } from '../lib/categorize';

export default function QuickAdd({ inModal = false }: { inModal?: boolean }) {
  const { data, addTransactions, setData } = useStore();
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState('');

  const auto = !touched && description ? suggestCategory({ description, direction, source: 'manual' }, data.categories, data.rules) : null;
  const effectiveCat = touched ? categoryId : auto;
  const n = parseFloat(amount.replace(/,/g, ''));
  const valid = description.trim() && n > 0 && date;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    addTransactions([{ date, description: description.trim(), amount: n, direction, categoryId: effectiveCat, source: 'manual' }]);
    if (touched && effectiveCat) setData((d) => ({ ...d, rules: upsertRule(d.rules, description, effectiveCat) }));
    setDone(`נוסף: ${description.trim()} ${n} ₪`);
    setDescription('');
    setAmount('');
    setTouched(false);
    setCategoryId(null);
    setTimeout(() => setDone(''), 2500);
  };

  return (
    <form className={inModal ? 'quick-modal-form' : 'card'} onSubmit={submit}>
      {!inModal && <h2>הזנה מהירה</h2>}
      <div className="row">
        <div className="seg" role="radiogroup" aria-label="סוג">
          <button type="button" className={direction === 'out' ? 'on' : ''} onClick={() => setDirection('out')}>הוצאה</button>
          <button type="button" className={direction === 'in' ? 'on' : ''} onClick={() => setDirection('in')}>הכנסה</button>
        </div>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="תאריך" />
        <input className="input" placeholder="תיאור (למשל: רמי לוי)" value={description} onChange={(e) => setDescription(e.target.value)} style={{ flex: '2 1 180px' }} />
        <input className="input" autoFocus={inModal} placeholder="סכום ₪" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: 110 }} />
        <CategorySelect cats={data.categories} value={effectiveCat} onChange={(id) => { setTouched(true); setCategoryId(id); }} />
        <button className="btn primary" type="submit" disabled={!valid}>הוספה</button>
      </div>
      {auto && !touched && <div className="small muted" style={{ marginTop: 6 }}>זוהתה קטגוריה אוטומטית. אפשר לשנות אותה.</div>}
      {done && <div className="small" style={{ marginTop: 6, color: 'var(--good)' }}>✓ {done}</div>}
    </form>
  );
}
