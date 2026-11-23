import React, { useRef, useState } from 'react';
import { money, monthLabel, MONTHS_SHORT } from '../lib/format';
import type { Category } from '../lib/types';

const P = (d: string) => (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d={d} />
  </svg>
);
export const Icons = {
  dashboard: P('M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z'),
  list: P('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  upload: P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'),
  budget: P('M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'),
  course: P('M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'),
  wealth: P('M3 21h18M5 21V10l7-6 7 6v11M9 21v-6h6v6'),
  settings: P('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'),
  plus: P('M12 5v14M5 12h14'),
};

export function Money({ v, className }: { v: number; className?: string }) {
  return <span className={`num ${className ?? ''}`}>{money(v)}</span>;
}

export function CategorySelect({ cats, value, onChange, className, allowEmpty = true }: { cats: Category[]; value: string | null; onChange: (id: string | null) => void; className?: string; allowEmpty?: boolean }) {
  const groups = new Map<string, Category[]>();
  for (const c of cats) {
    if (c.archived && c.id !== value) continue;
    const g = groups.get(c.group) ?? [];
    g.push(c);
    groups.set(c.group, g);
  }
  return (
    <select className={`input ${className ?? ''}`} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      {allowEmpty && <option value="">— ללא קטגוריה —</option>}
      {[...groups.entries()].map(([g, cs]) => (
        <optgroup key={g} label={g}>
          {cs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export interface MonthBar {
  month: string;
  income: number;
  expense: number;
  saving: number;
}

/** Grouped bars per month: income vs. outflow (expenses + saving stacked). */
export function MonthlyChart({ data, selected, onSelect }: { data: MonthBar[]; selected?: string; onSelect?: (m: string) => void }) {
  const [tip, setTip] = useState<{ x: number; y: number; d: MonthBar } | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const W = 720;
  const H = 240;
  const padB = 24;
  const padT = 8;
  const padX = 44;
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense + d.saving)));
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const slot = (W - padX) / Math.max(1, data.length);
  const bw = Math.min(16, slot / 3);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // RTL: first month on the right
  const xOf = (i: number) => W - (i + 0.5) * slot;

  return (
    <div style={{ position: 'relative' }}>
      <div className="legend">
        <span><i style={{ background: 'var(--income)' }} />הכנסות</span>
        <span><i style={{ background: 'var(--expense)' }} />הוצאות</span>
        <span><i style={{ background: 'var(--saving)' }} />חיסכון</span>
      </div>
      <svg ref={ref} className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="הכנסות מול הוצאות לפי חודש">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={0} x2={W - padX + 30} y1={y(t)} y2={y(t)} transform={`translate(${padX - 30},0)`} />
            <text x={padX - 36} y={y(t) + 4} textAnchor="end" style={{ direction: 'ltr' }}>
              {t >= 1000 ? `${Math.round(t / 1000)}K` : t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = xOf(i);
          const [, m] = d.month.split('-').map(Number);
          const sel = selected === d.month;
          const r = 3;
          const bar = (x: number, v: number, base: number, color: string, roundTop: boolean) => {
            if (v <= 0) return null;
            const y0 = y(base);
            const y1 = y(base + v);
            const h = Math.max(1, y0 - y1);
            return roundTop ? (
              <path d={`M${x},${y0} V${y1 + r} q0,-${r} ${r},-${r} h${bw - 2 * r} q${r},0 ${r},${r} V${y0} Z`} fill={color} />
            ) : (
              <rect x={x} y={y1} width={bw} height={h} fill={color} />
            );
          };
          return (
            <g key={d.month} opacity={selected && !sel ? 0.55 : 1}>
              {bar(cx + 1, d.income, 0, 'var(--income)', true)}
              {bar(cx - bw - 1, d.expense, 0, 'var(--expense)', d.saving <= 0)}
              {d.saving > 0 && d.expense > 0 && <line x1={cx - bw - 1} x2={cx - 1} y1={y(d.expense)} y2={y(d.expense)} stroke="var(--surface)" strokeWidth={2} />}
              {bar(cx - bw - 1, d.saving, d.expense, 'var(--saving)', true)}
              <text x={cx} y={H - 6} textAnchor="middle" style={{ fontWeight: sel ? 700 : 400, fill: sel ? 'var(--text)' : undefined }}>
                {MONTHS_SHORT[m - 1]}
              </text>
              <rect
                className="hit"
                x={cx - slot / 2}
                y={0}
                width={slot}
                height={H}
                onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, d })}
                onMouseLeave={() => setTip(null)}
                onClick={() => onSelect?.(d.month)}
              />
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="tooltip" style={{ left: Math.min(tip.x + 12, window.innerWidth - 200), top: tip.y + 12 }}>
          <b>{monthLabel(tip.d.month)}</b>
          <div className="r"><span>הכנסות</span><Money v={tip.d.income} /></div>
          <div className="r"><span>הוצאות</span><Money v={tip.d.expense} /></div>
          <div className="r"><span>חיסכון</span><Money v={tip.d.saving} /></div>
          <div className="r" style={{ fontWeight: 700 }}><span>יתרה</span><Money v={tip.d.income - tip.d.expense - tip.d.saving} /></div>
        </div>
      )}
    </div>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return <div className="toast" role="status">{text}</div>;
}
