import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '../lib/store';
import type { AppData } from '../lib/types';

export default function SettingsPage() {
  const { data, setData, replaceAll, categoryById } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const download = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const backup = () => download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `גיבוי-תקציב-${new Date().toISOString().slice(0, 10)}.json`);

  const exportExcel = () => {
    const rows = [...data.transactions]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((t) => {
        const c = categoryById(t.categoryId);
        return { תאריך: t.date, תיאור: t.description, קבוצה: c?.group ?? '', קטגוריה: c?.name ?? '', סוג: t.direction === 'in' ? 'הכנסה' : 'הוצאה', סכום: t.amount, מקור: t.source, הערה: t.note ?? '' };
      });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 11 }, { wch: 34 }, { wch: 22 }, { wch: 26 }, { wch: 8 }, { wch: 10 }, { wch: 9 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, ws, 'תנועות');
    const bud = XLSX.utils.json_to_sheet(data.categories.map((c) => ({ קבוצה: c.group, קטגוריה: c.name, 'תקציב חודשי': data.budget[c.id] ?? '' })));
    XLSX.utils.book_append_sheet(wb, bud, 'תקציב');
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.writeFile(wb, `תקציב-משפחתי-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const restore = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as AppData;
      if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.categories)) throw new Error('bad');
      if (confirm(`לשחזר גיבוי עם ${parsed.transactions.length} תנועות? הנתונים הנוכחיים יוחלפו.`)) replaceAll(parsed);
    } catch {
      alert('קובץ הגיבוי לא תקין.');
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>הגדרות וגיבוי</h1>
          <p>הנתונים נשמרים רק בדפדפן הזה. כדי לעבור למחשב או לטלפון אחר, או סתם לשמור על הנתונים, ייצאו גיבוי.</p>
        </div>
      </div>
      <div className="grid half">
        <div className="card">
          <h2>גיבוי ושחזור</h2>
          <div className="row">
            <button className="btn primary" onClick={backup}>הורדת גיבוי (JSON)</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>שחזור מגיבוי</button>
            <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          </div>
          <h2 style={{ marginTop: 20 }}>ייצוא לאקסל</h2>
          <p className="small muted">כל התנועות עם קטגוריות, וגיליון נפרד עם התקציב.</p>
          <button className="btn" onClick={exportExcel}>הורדת קובץ Excel</button>
        </div>
        <div className="card">
          <h2>כללי זיהוי שנלמדו</h2>
          <p className="small muted">{data.rules.length} כללים. נוצרים כשמשייכים תנועה לקטגוריה.</p>
          <div style={{ maxHeight: 260, overflow: 'auto' }}>
            <table>
              <tbody>
                {data.rules.map((r) => (
                  <tr key={r.keyword}>
                    <td>{r.keyword}</td>
                    <td className="small">{categoryById(r.categoryId)?.name ?? '—'}</td>
                    <td><button className="btn ghost sm danger" onClick={() => setData((d) => ({ ...d, rules: d.rules.filter((x) => x.keyword !== r.keyword) }))}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2 style={{ marginTop: 20 }}>שם המשפחה</h2>
          <input className="input" value={data.familyName} onChange={(e) => setData((d) => ({ ...d, familyName: e.target.value }))} placeholder="משפחת…" />
          <h2 style={{ marginTop: 20, color: 'var(--bad)' }}>איפוס</h2>
          <button className="btn danger" onClick={() => { if (confirm('למחוק את כל הנתונים מהדפדפן? מומלץ להוריד גיבוי קודם.')) { localStorage.clear(); location.reload(); } }}>מחיקת כל הנתונים</button>
        </div>
      </div>
    </>
  );
}
