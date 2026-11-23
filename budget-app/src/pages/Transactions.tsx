import React, { useMemo, useState } from 'react';
import { CategorySelect, Money } from '../components/ui';
import { monthKey, monthLabel } from '../lib/format';
import { useStore } from '../lib/store';
import type { Source } from '../lib/types';
import QuickAdd from '../components/QuickAdd';

const SOURCE_LABEL: Record<Source, string> = { manual: 'ידני', excel: 'אקסל', bank: 'בנק', credit: 'אשראי', whatsapp: 'וואטסאפ', pdf: 'PDF' };

export default function Transactions() {
  const { data, updateTransaction, deleteTransaction, categoryById } = useStore();
  const months = useMemo(() => [...new Set(data.transactions.map((t) => monthKey(t.date)))].sort().reverse(), [data.transactions]);
  const [month, setMonth] = useState<string>('');
  const [q, setQ] = useState('');
  const [onlyUncat, setOnlyUncat] = useState(false);
  const [source, setSource] = useState<Source | ''>('');
  const [cat, setCat] = useState<string | null>(null);
  const [limit, setLimit] = useState(200);

  const activeMonth = month || months[0] || '';
  const rows = useMemo(() => {
    const ql = q.trim();
    return data.transactions
      .filter((t) => (activeMonth === 'all' ? true : monthKey(t.date) === activeMonth))
      .filter((t) => (!onlyUncat ? true : !t.categoryId))
      .filter((t) => (!source ? true : t.source === source))
      .filter((t) => (!cat ? true : t.categoryId === cat))
      .filter((t) => (!ql ? true : t.description.includes(ql) || (t.note ?? '').includes(ql)))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [data.transactions, activeMonth, onlyUncat, source, cat, q]);

  const uncatCount = data.transactions.filter((t) => !t.categoryId).length;
  const sumIn = rows.filter((r) => r.direction === 'in').reduce((s, r) => s + r.amount, 0);
  const sumOut = rows.filter((r) => r.direction === 'out').reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>תנועות</h1>
          <p>כל ההכנסות וההוצאות ממקור אחד. שינוי קטגוריה מלמד את המערכת לזהות את בית העסק בפעם הבאה.</p>
        </div>
      </div>

      <QuickAdd />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <select className="input" value={activeMonth} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">כל החודשים</option>
            {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
          <input className="input" placeholder="חיפוש…" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: '1 1 160px' }} />
          <select className="input" value={source} onChange={(e) => setSource(e.target.value as Source | '')}>
            <option value="">כל המקורות</option>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <CategorySelect cats={data.categories} value={cat} onChange={setCat} />
          <label className="row small" style={{ gap: 4 }}>
            <input type="checkbox" checked={onlyUncat} onChange={(e) => setOnlyUncat(e.target.checked)} />
            רק בלי קטגוריה {uncatCount > 0 && <span className="pill">{uncatCount}</span>}
          </label>
        </div>
        <div className="row small muted" style={{ marginBottom: 8 }}>
          <span>{rows.length} תנועות</span>·<span>נכנס <Money v={sumIn} /></span>·<span>יצא <Money v={sumOut} /></span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>תאריך</th>
                <th>תיאור</th>
                <th>קטגוריה</th>
                <th>מקור</th>
                <th className="n">סכום</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((t) => {
                const c = categoryById(t.categoryId);
                return (
                  <tr key={t.id}>
                    <td className="num small">{t.date.split('-').reverse().join('/')}</td>
                    <td>
                      {t.description}
                      {t.note && <div className="small muted">{t.note}</div>}
                    </td>
                    <td style={{ minWidth: 170 }}>
                      <CategorySelect cats={data.categories} value={t.categoryId} onChange={(id) => updateTransaction(t.id, { categoryId: id }, t.source !== 'excel')} />
                      {c?.kind === 'transfer' && <div className="small muted">לא נספר בהוצאות</div>}
                    </td>
                    <td><span className="pill">{SOURCE_LABEL[t.source]}</span></td>
                    <td className="n">
                      <span style={{ color: t.direction === 'in' ? 'var(--good)' : undefined, fontWeight: 600 }}>
                        <Money v={t.direction === 'in' ? t.amount : -t.amount} />
                      </span>
                    </td>
                    <td>
                      <button className="btn ghost sm danger" title="מחיקה" onClick={() => deleteTransaction(t.id)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > limit && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button className="btn" onClick={() => setLimit(limit + 300)}>הצג עוד</button>
          </div>
        )}
        {rows.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>אין תנועות להצגה.</p>}
      </div>
    </>
  );
}
