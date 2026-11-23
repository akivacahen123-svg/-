import React, { useState } from 'react';
import { Money } from '../components/ui';
import { todayISO, uid } from '../lib/format';
import { useStore } from '../lib/store';

export default function WealthPage() {
  const { data, setData } = useStore();
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [isDebt, setIsDebt] = useState(false);

  const assets = data.holdings.filter((h) => h.value > 0);
  const debts = data.holdings.filter((h) => h.value < 0);
  const totalA = assets.reduce((s, h) => s + h.value, 0);
  const totalD = debts.reduce((s, h) => s + h.value, 0);

  const update = (id: string, v: number) => setData((d) => ({ ...d, holdings: d.holdings.map((h) => (h.id === id ? { ...h, value: v } : h)), holdingsDate: todayISO() }));
  const remove = (id: string) => setData((d) => ({ ...d, holdings: d.holdings.filter((h) => h.id !== id) }));

  const List = ({ items, sign }: { items: typeof assets; sign: 1 | -1 }) => (
    <table>
      <tbody>
        {items.map((h) => (
          <tr key={h.id}>
            <td>{h.name}</td>
            <td className="n">
              <input className="input num" style={{ width: 120, textAlign: 'end' }} inputMode="decimal" defaultValue={Math.abs(h.value)}
                onBlur={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) update(h.id, sign * Math.abs(v)); }} aria-label={h.name} />
            </td>
            <td><button className="btn ghost sm danger" onClick={() => remove(h.id)} title="מחיקה">✕</button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">התמונה הגדולה</div>
          <h1>הון משפחתי</h1>
          <p>תמונת מצב של נכסים וחובות. כדאי לעדכן פעם ברבעון.{data.holdingsDate && ` עודכן לאחרונה: ${data.holdingsDate}`}</p>
        </div>
      </div>

      <div className="grid k3 rise" style={{ marginBottom: 16 }}>
        <div className="card stat"><div className="bar" style={{ background: 'var(--saving)' }} /><div className="label">נכסים</div><div className="value"><Money v={totalA} /></div></div>
        <div className="card stat"><div className="bar" style={{ background: 'var(--expense)' }} /><div className="label">חובות</div><div className="value"><Money v={-totalD} /></div></div>
        <div className="card stat"><div className="bar" style={{ background: 'var(--accent)' }} /><div className="label">שווי נקי</div><div className="value"><Money v={totalA + totalD} /></div></div>
      </div>

      <div className="grid half">
        <div className="card"><h2>נכסים</h2>{assets.length ? <List items={assets} sign={1} /> : <p className="muted">אין עדיין נכסים.</p>}</div>
        <div className="card"><h2>חובות והלוואות</h2>{debts.length ? <List items={debts} sign={-1} /> : <p className="muted">אין חובות רשומים.</p>}</div>
      </div>

      <form className="card row" style={{ marginTop: 16 }} onSubmit={(e) => {
        e.preventDefault();
        const v = parseFloat(value.replace(/,/g, ''));
        if (!name.trim() || isNaN(v)) return;
        setData((d) => ({ ...d, holdings: [...d.holdings, { id: uid(), name: name.trim(), value: (isDebt ? -1 : 1) * Math.abs(v) }], holdingsDate: todayISO() }));
        setName(''); setValue('');
      }}>
        <div className="seg">
          <button type="button" className={!isDebt ? 'on' : ''} onClick={() => setIsDebt(false)}>נכס</button>
          <button type="button" className={isDebt ? 'on' : ''} onClick={() => setIsDebt(true)}>חוב</button>
        </div>
        <input className="input" placeholder={isDebt ? 'למשל: יתרת משכנתא' : 'למשל: קרן השתלמות'} value={name} onChange={(e) => setName(e.target.value)} style={{ flex: '1 1 200px' }} />
        <input className="input" placeholder="סכום ₪" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 130 }} />
        <button className="btn primary" type="submit">הוספה</button>
      </form>
    </>
  );
}
