import React, { useMemo, useRef, useState } from 'react';
import type { Page } from '../App';
import { CategorySelect, Icons, Money, useConfirm } from '../components/ui';
import QuickAdd from '../components/QuickAdd';
import { importBudgetWorkbook, looksLikeBudgetWorkbook, type BudgetWorkbookResult } from '../lib/excelBudgetImport';
import { detectTables, extractRows, readWorkbook, type ParsedTable, type StatementKind } from '../lib/statementImport';
import { parseNotes } from '../lib/whatsapp';
import { normalize, suggestCategory, upsertRule } from '../lib/categorize';
import { monthKey, monthLabel } from '../lib/format';
import { freshData, useStore } from '../lib/store';
import type { Source, Transaction } from '../lib/types';

type Mode = 'workbook' | 'bank' | 'credit' | 'pdf' | 'whatsapp';

const MODES: { id: Mode; title: string; text: string; icon: keyof typeof Icons; tint: string; ink: string }[] = [
  { id: 'workbook', title: 'קובץ התקציב שלי', text: 'אקסל עם גיליון לכל שנה ועמודה לכל חודש', icon: 'sheet', tint: 'var(--tint-teal)', ink: 'var(--income)' },
  { id: 'bank', title: 'עו"ש מהבנק', text: 'קובץ Excel / CSV שהורדתם מאתר הבנק', icon: 'bank', tint: 'var(--tint-violet)', ink: 'var(--saving)' },
  { id: 'credit', title: 'כרטיס אשראי', text: 'פירוט חיובים מישראכרט, מקס, כאל וכו׳', icon: 'card', tint: 'var(--tint-coral)', ink: 'var(--expense)' },
  { id: 'pdf', title: 'דוח PDF', text: 'סיכום עו"ש או חשבונית אשראי ב-PDF', icon: 'file', tint: 'var(--tint-butter)', ink: '#c08410' },
  { id: 'whatsapp', title: 'רישומי וואטסאפ', text: 'הדבקת הודעות או קובץ צ׳אט מיוצא', icon: 'chat', tint: 'var(--good-bg)', ink: 'var(--good)' },
];

interface Draft {
  key: number;
  include: boolean;
  date: string;
  description: string;
  amount: number;
  direction: 'in' | 'out';
  categoryId: string | null;
  dup: boolean;
  coveredByExcel: boolean;
}

export default function ImportPage({ go }: { go: (p: Page) => void }) {
  const store = useStore();
  const ask = useConfirm();
  const { data } = store;
  const [mode, setMode] = useState<Mode>('workbook');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const [wbResult, setWbResult] = useState<BudgetWorkbookResult | null>(null);
  const [tables, setTables] = useState<ParsedTable[]>([]);
  const [tableIdx, setTableIdx] = useState(0);
  const [positiveIsExpense, setPositiveIsExpense] = useState(true);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [pdfKind, setPdfKind] = useState<StatementKind>('credit');
  const [pdfLines, setPdfLines] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [skipExcelMonths, setSkipExcelMonths] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const excelMonths = useMemo(() => new Set(data.transactions.filter((t) => t.source === 'excel').map((t) => monthKey(t.date))), [data.transactions]);
  const existingKeys = useMemo(
    () => new Set(data.transactions.map((t) => `${t.date}|${t.amount.toFixed(2)}|${t.direction}|${normalize(t.description)}`)),
    [data.transactions]
  );

  const reset = () => {
    setError(null);
    setWbResult(null);
    setTables([]);
    setDrafts(null);
    setPdfLines([]);
    setDone(null);
  };

  const sourceOf = (m: Mode): Source => (m === 'bank' ? 'bank' : m === 'credit' ? 'credit' : m === 'pdf' ? 'pdf' : m === 'whatsapp' ? 'whatsapp' : 'excel');

  const toDrafts = (rows: { date: string; description: string; amount: number; direction: 'in' | 'out' }[], src: Source, srcForRules: Source) =>
    rows.map((r, i) => {
      const dup = existingKeys.has(`${r.date}|${r.amount.toFixed(2)}|${r.direction}|${normalize(r.description)}`);
      const coveredByExcel = excelMonths.has(monthKey(r.date));
      return {
        key: i,
        include: !dup,
        ...r,
        categoryId: suggestCategory({ description: r.description, direction: r.direction, source: srcForRules }, data.categories, data.rules),
        dup,
        coveredByExcel,
      } satisfies Draft;
    });

  const buildFromTable = (t: ParsedTable, pie: boolean, m: Mode) => {
    const kind: StatementKind = m === 'credit' ? 'credit' : 'bank';
    const rows = extractRows(t, kind, t.map.amount >= 0 ? pie : false);
    setDrafts(toDrafts(rows, sourceOf(m), kind));
  };

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      if (/\.pdf$/i.test(file.name)) {
        const { parsePdfStatement } = await import('../lib/pdfImport');
        const kind = mode === 'bank' ? 'bank' : mode === 'credit' ? 'credit' : pdfKind;
        if (mode !== 'pdf') setMode('pdf');
        setPdfKind(kind);
        const res = await parsePdfStatement(buf, kind);
        setPdfLines(res.lines);
        if (!res.rows.length) setError('לא זוהו שורות עם תאריך וסכום ב-PDF. ייתכן שזה קובץ סרוק (תמונה). עדיף להוריד מהאתר קובץ Excel או CSV.');
        setDrafts(toDrafts(res.rows, 'pdf', kind));
        return;
      }
      if (/\.txt$/i.test(file.name)) {
        setMode('whatsapp');
        const text = new TextDecoder('utf-8').decode(buf);
        setNotes(text);
        setDrafts(toDrafts(parseNotes(text), 'whatsapp', 'whatsapp'));
        return;
      }
      const wb = readWorkbook(buf, file.name);
      if (mode === 'workbook' || looksLikeBudgetWorkbook(wb)) {
        if (looksLikeBudgetWorkbook(wb)) {
          setMode('workbook');
          setWbResult(importBudgetWorkbook(wb));
          return;
        }
      }
      const ts = detectTables(wb);
      if (!ts.length) {
        setError('לא מצאתי בקובץ טבלה עם עמודות "תאריך", "תיאור" ו"סכום". אפשר לנסות קובץ אחר או לייצא שוב מאתר הבנק.');
        return;
      }
      let m = mode;
      if (m === 'workbook' || m === 'pdf' || m === 'whatsapp') {
        m = ts[0].headers.some((h) => /חובה|זכות|יתרה/.test(h)) ? 'bank' : 'credit';
        setMode(m);
      }
      const pie = m === 'credit';
      setPositiveIsExpense(pie);
      setTables(ts);
      setTableIdx(0);
      buildFromTable(ts[0], pie, m);
    } catch (e) {
      console.error(e);
      setError(`לא הצלחתי לקרוא את הקובץ (${e instanceof Error ? e.message : 'שגיאה'}).`);
    } finally {
      setBusy(false);
    }
  }

  function commitWorkbook() {
    if (!wbResult) return;
    const r = wbResult;
    store.setData((d0) => {
      const d = d0.isDemo ? freshData() : d0;
      const keepIds = new Set(d.transactions.filter((t) => t.source !== 'excel' && t.categoryId).map((t) => t.categoryId!));
      const extra = d.categories.filter((c) => keepIds.has(c.id) || c.kind === 'transfer');
      const ids = new Set(r.categories.map((c) => c.id));
      const categories = [...r.categories, ...extra.filter((c) => !ids.has(c.id))];
      const batchId = `xl-${Date.now()}`;
      const txs: Transaction[] = r.transactions.map((t, i) => ({ ...t, id: `${batchId}-${i}`, batch: batchId }));
      return {
        ...d,
        familyName: d.familyName || r.familyName,
        categories,
        transactions: [...d.transactions.filter((t) => t.source !== 'excel'), ...txs],
        budget: { ...d.budget, ...r.budget },
        holdings: r.holdings.length ? r.holdings : d.holdings,
        holdingsDate: r.holdings.length ? r.holdingsDate : d.holdingsDate,
        batches: [...d.batches.filter((b) => b.source !== 'excel'), { id: batchId, label: fileName, source: 'excel', createdAt: new Date().toISOString(), count: txs.length }],
      };
    });
    setDone(`יובאו ${r.transactions.length.toLocaleString('he-IL')} סכומים חודשיים ב-${r.categories.length} קטגוריות.`);
    setWbResult(null);
  }

  function commitDrafts() {
    if (!drafts) return;
    const src = sourceOf(mode);
    const chosen = drafts.filter((d) => d.include && !(skipExcelMonths && d.coveredByExcel));
    store.addTransactions(
      chosen.map((d) => ({ date: d.date, description: d.description, amount: d.amount, direction: d.direction, categoryId: d.categoryId, source: src })),
      { label: fileName || MODES.find((m) => m.id === mode)!.title, source: src }
    );
    // learn from categories the user set during review
    store.setData((d) => {
      let rules = d.rules;
      for (const x of chosen) if (x.categoryId) rules = upsertRule(rules, x.description, x.categoryId);
      return { ...d, rules };
    });
    setDone(`נוספו ${chosen.length} תנועות.`);
    setDrafts(null);
    setTables([]);
  }

  const patch = (key: number, p: Partial<Draft>) => setDrafts((ds) => ds && ds.map((d) => (d.key === key ? { ...d, ...p } : d)));
  const included = drafts?.filter((d) => d.include && !(skipExcelMonths && d.coveredByExcel)) ?? [];
  const coveredCount = drafts?.filter((d) => d.coveredByExcel).length ?? 0;
  const uncategorized = included.filter((d) => !d.categoryId).length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">כל המקורות במקום אחד</div>
          <h1>הזנה וייבוא</h1>
          <p>כל המקורות במקום אחד. הקבצים נקראים בדפדפן שלכם ולא נשלחים לשום מקום.</p>
        </div>
      </div>

      <div className="choice" style={{ marginBottom: 16 }}>
        {MODES.map((m) => {
          const I = Icons[m.icon];
          return (
          <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => { setMode(m.id); reset(); }}>
            <span className="ch-ic" style={{ background: m.tint, color: m.ink }}><I /></span>
            <b>{m.title}</b>
            <span>{m.text}</span>
          </button>
          );
        })}
      </div>

      {done && (
        <div className="note good" style={{ marginBottom: 16 }}>
          <span className="ic">✓</span>
          <span>{done} <button className="btn sm" onClick={() => go('dashboard')}>לדשבורד</button> <button className="btn sm" onClick={() => go('transactions')}>לתנועות</button></span>
        </div>
      )}
      {error && <div className="note warn" style={{ marginBottom: 16 }}><span className="ic">!</span><span>{error}</span></div>}

      {mode === 'whatsapp' ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>רישומים מוואטסאפ</h2>
          <p className="sub">הדביקו הודעות, שורה לכל הוצאה, למשל: "סופר 350" או "23/11 דלק 200". סימן + בתחילת השורה, או המילים "הכנסה" או "קיבלתי", מסמנים הכנסה. אפשר גם להעלות קובץ צ׳אט מיוצא (בוואטסאפ: ⋮ ← עוד ← ייצוא צ׳אט ← ללא מדיה).</p>
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={'[20/11/2026, 18:02:11] עקיבא: סופר 412\n[21/11/2026, 09:15:40] שרה: ירקן 85, מאפייה 40\n+1200 החזר מס'} />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary" disabled={!notes.trim()} onClick={() => { setDone(null); setDrafts(toDrafts(parseNotes(notes), 'whatsapp', 'whatsapp')); }}>זיהוי הוצאות</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>העלאת קובץ ‎.txt</button>
          </div>
          <input ref={fileRef} type="file" accept=".txt" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <div
          className={`drop ${over ? 'over' : ''}`}
          style={{ marginBottom: 16 }}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <input ref={fileRef} type="file" accept={mode === 'pdf' ? '.pdf' : '.xlsx,.xls,.csv,.pdf,.txt'} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
          <div className="drop-ic"><Icons.upload /></div>
          <b className="display" style={{ fontSize: 18, fontWeight: 600 }}>{busy ? 'קורא את הקובץ…' : 'גררו לכאן קובץ, או לחצו לבחירה'}</b>
          <div className="small muted" style={{ marginTop: 4 }}>
            {mode === 'workbook' && 'Excel עם גיליונות שנתיים (כמו קובץ "תקציב וביצועים"). ייבוא חוזר מחליף את הנתונים הקודמים מהאקסל.'}
            {mode === 'bank' && 'באתר הבנק: עו"ש ← תנועות בחשבון ← ייצוא ל-Excel. חיובי כרטיסי האשראי מסומנים אוטומטית כ"העברה" כדי שלא ייספרו פעמיים.'}
            {mode === 'credit' && 'באתר חברת האשראי: פירוט חיובים ← ייצוא ל-Excel. עסקאות בתשלומים נקלטות לפי סכום החיוב החודשי.'}
            {mode === 'pdf' && 'PDF עם טקסט (לא סרוק). הזיהוי משוער, ולכן כל שורה מוצגת לבדיקה לפני השמירה.'}
          </div>
          {mode === 'pdf' && (
            <div className="row" style={{ justifyContent: 'center', marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
              <div className="seg">
                <button className={pdfKind === 'credit' ? 'on' : ''} onClick={() => setPdfKind('credit')}>חשבונית אשראי</button>
                <button className={pdfKind === 'bank' ? 'on' : ''} onClick={() => setPdfKind('bank')}>דוח עו"ש</button>
              </div>
            </div>
          )}
        </div>
      )}

      {wbResult && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>נמצא קובץ תקציב{wbResult.familyName ? ` – ${wbResult.familyName}` : ''}</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>גיליון</th><th className="n">חודשים</th><th className="n">סכומים</th><th>הערה</th></tr></thead>
              <tbody>
                {wbResult.sheets.map((s) => (
                  <tr key={s.name}><td>{s.name}</td><td className="n">{s.months}</td><td className="n">{s.cells}</td><td className="small">{s.yearFixed ? <span style={{ color: 'var(--warn)' }}>{s.yearFixed}</span> : ''}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            {wbResult.categories.length} קטגוריות, {wbResult.transactions.length.toLocaleString('he-IL')} סכומים חודשיים, תקציב חודשי ל-{Object.keys(wbResult.budget).length} קטגוריות
            {wbResult.holdings.length > 0 && `, ו-${wbResult.holdings.length} שורות של מצב נכסים וחובות (${wbResult.holdingsDate})`}.
          </p>
          <div className="row">
            <button className="btn primary" onClick={commitWorkbook}>ייבוא</button>
            <button className="btn" onClick={reset}>ביטול</button>
          </div>
        </div>
      )}

      {drafts && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>בדיקה לפני שמירה – {drafts.length} שורות</h2>
            <div className="row">
              <button className="btn primary" disabled={!included.length} onClick={commitDrafts}>שמירת {included.length} תנועות</button>
              <button className="btn" onClick={reset}>ביטול</button>
            </div>
          </div>

          {tables.length > 0 && (
            <details style={{ marginBottom: 10 }}>
              <summary className="small" style={{ cursor: 'pointer' }}>עמודות שזוהו (אפשר לתקן)</summary>
              <div className="row" style={{ marginTop: 8 }}>
                {tables.length > 1 && (
                  <label className="field">טבלה
                    <select className="input" value={tableIdx} onChange={(e) => { const i = +e.target.value; setTableIdx(i); buildFromTable(tables[i], positiveIsExpense, mode); }}>
                      {tables.map((t, i) => <option key={i} value={i}>{t.sheet}</option>)}
                    </select>
                  </label>
                )}
                {(['date', 'description', 'amount', 'debit', 'credit'] as const).map((k) => (
                  <label className="field" key={k}>
                    {{ date: 'תאריך', description: 'תיאור', amount: 'סכום', debit: 'חובה', credit: 'זכות' }[k]}
                    <select className="input" value={tables[tableIdx].map[k]} onChange={(e) => {
                      const t = { ...tables[tableIdx], map: { ...tables[tableIdx].map, [k]: +e.target.value } };
                      const ts = tables.slice(); ts[tableIdx] = t; setTables(ts); buildFromTable(t, positiveIsExpense, mode);
                    }}>
                      <option value={-1}>—</option>
                      {tables[tableIdx].headers.map((h, i) => <option key={i} value={i}>{h || `עמודה ${i + 1}`}</option>)}
                    </select>
                  </label>
                ))}
                {tables[tableIdx].map.amount >= 0 && (
                  <label className="row small" style={{ gap: 4 }}>
                    <input type="checkbox" checked={positiveIsExpense} onChange={(e) => { setPositiveIsExpense(e.target.checked); buildFromTable(tables[tableIdx], e.target.checked, mode); }} />
                    סכום חיובי = הוצאה
                  </label>
                )}
              </div>
            </details>
          )}

          {coveredCount > 0 && (
            <div className="note warn" style={{ marginBottom: 10 }}>
              <span className="ic">!</span>
              <span>
                ל-{coveredCount} שורות יש כבר סיכום חודשי מקובץ האקסל ({[...new Set(drafts.filter((d) => d.coveredByExcel).map((d) => monthLabel(monthKey(d.date))))].join(', ')}). אם תשמרו גם אותן, הן ייספרו פעמיים.
                <label className="row" style={{ gap: 4, marginTop: 4 }}>
                  <input type="checkbox" checked={skipExcelMonths} onChange={(e) => setSkipExcelMonths(e.target.checked)} /> לדלג על השורות האלה
                </label>
              </span>
            </div>
          )}
          {uncategorized > 0 && <p className="small muted">{uncategorized} שורות בלי קטגוריה. אפשר לשייך עכשיו או אחר כך במסך התנועות. כל שיוך נלמד לפעם הבאה.</p>}

          <div className="table-wrap">
            <table>
              <thead><tr><th></th><th>תאריך</th><th>תיאור</th><th>כיוון</th><th className="n">סכום</th><th>קטגוריה</th></tr></thead>
              <tbody>
                {drafts.map((d) => {
                  const skipped = skipExcelMonths && d.coveredByExcel;
                  return (
                    <tr key={d.key} style={{ opacity: d.include && !skipped ? 1 : 0.45 }}>
                      <td><input type="checkbox" checked={d.include} disabled={skipped} onChange={(e) => patch(d.key, { include: e.target.checked })} /></td>
                      <td className="num small">{d.date.split('-').reverse().join('/')}</td>
                      <td>{d.description}{d.dup && <span className="pill" style={{ marginInlineStart: 6 }}>כבר קיים</span>}</td>
                      <td>
                        <button className={`pill ${d.direction}`} style={{ border: 0, cursor: 'pointer' }} onClick={() => patch(d.key, { direction: d.direction === 'in' ? 'out' : 'in' })} title="החלפת כיוון">
                          {d.direction === 'in' ? 'הכנסה' : 'הוצאה'}
                        </button>
                      </td>
                      <td className="n"><Money v={d.amount} /></td>
                      <td style={{ minWidth: 170 }}><CategorySelect cats={data.categories} value={d.categoryId} onChange={(id) => patch(d.key, { categoryId: id })} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pdfLines.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary className="small" style={{ cursor: 'pointer' }}>הטקסט שחולץ מה-PDF</summary>
              <pre className="small" style={{ whiteSpace: 'pre-wrap', maxHeight: 260, overflow: 'auto', background: 'var(--surface-2)', padding: 10, borderRadius: 8 }}>{pdfLines.join('\n')}</pre>
            </details>
          )}
        </div>
      )}

      <QuickAdd />

      {data.batches.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>ייבואים קודמים</h2>
          <div className="table-wrap">
            <table>
              <tbody>
                {[...data.batches].reverse().map((b) => (
                  <tr key={b.id}>
                    <td>{b.label}</td>
                    <td className="small muted">{new Date(b.createdAt).toLocaleDateString('he-IL')}</td>
                    <td className="n">{b.count} שורות</td>
                    <td><button className="btn sm danger" onClick={async () => { if (await ask('לבטל את הייבוא הזה ולמחוק את התנועות שלו?', true)) store.undoBatch(b.id); }}>ביטול ייבוא</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

