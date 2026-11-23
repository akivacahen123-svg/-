import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  arrowUp: P('M7 17L17 7M8 7h9v9'),
  arrowDown: P('M17 7L7 17M16 17H7V8'),
  piggy: P('M19 9c1.5 0 2 1 2 2v2c0 1-.5 1.5-1.5 1.5L18 17v3h-3v-2H9v2H6v-3.5A6.5 6.5 0 0 1 9.5 5H14c2.2 0 4 1.5 5 4zM15 10h.01M3 10c0 1.5 1 2 2 2'),
  wallet: P('M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v12H5a2 2 0 0 1-2-2V5M16 13h.01'),
  bank: P('M3 21h18M4 10h16M5 10v8M9.5 10v8M14.5 10v8M19 10v8M12 3l9 5H3z'),
  card: P('M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20M6 15h4'),
  file: P('M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5'),
  chat: P('M21 12a8 8 0 0 1-11.8 7L3 21l2-6A8 8 0 1 1 21 12zM8 12h.01M12 12h.01M16 12h.01'),
  sheet: P('M4 4h16v16H4zM4 10h16M4 15h16M10 4v16'),
  lock: P('M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4'),
  chevL: P('M15 18l-6-6 6-6'),
  chevR: P('M9 18l6-6-6-6'),
  pause: P('M8 5v14M16 5v14'),
  play: P('M7 4l13 8-13 8z'),
  spark: P('M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z'),
};

/** Counts up to the value on first render and whenever it changes. */
export function AnimatedMoney({ v, className, duration = 900 }: { v: number; className?: string; duration?: number }) {
  const [shown, setShown] = useState(v);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(v); from.current = v; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(a + (v - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = v;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v, duration]);
  return <span className={`num ${className ?? ''}`}>{money(shown)}</span>;
}

/** Ring gauge: share of income already spent. */
export function Ring({ value, size = 132, stroke = 14, label, sub, track = 'rgba(255,255,255,.22)', color = '#fff' }: { value: number; size?: number; stroke?: number; label: string; sub?: string; track?: string; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [p, setP] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setP(Math.max(0, Math.min(1, value)))); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${sub ?? ''}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="47%" textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight={600}>{label}</text>
      {sub && <text x="50%" y="64%" textAnchor="middle" fill={color} fontSize={12} opacity={0.85}>{sub}</text>}
    </svg>
  );
}

export type Design = 'vivid' | 'calm';
export const DesignCtx = createContext<{ design: Design; setDesign: (d: Design) => void }>({ design: 'vivid', setDesign: () => {} });
export const useDesign = () => useContext(DesignCtx);

/** Scroll-snap carousel with dots, arrows and gentle autoplay (pauses on hover/focus). */
export function Carousel({ children, slide = '100%', autoplay = 6500, label }: { children: React.ReactNode[]; slide?: string; autoplay?: number; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const paused = useRef(false);
  const { design } = useDesign();
  // the calm design never moves on its own; in the vivid one the viewer can stop it (WCAG 2.2.2)
  const [stopped, setStopped] = useState(false);
  const auto = design === 'calm' || stopped ? 0 : autoplay;
  const count = children.length;
  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = (i + count) % count;
    const child = el.children[n] as HTMLElement | undefined;
    if (child) {
      // works in both directions: scroll the track so the slide's start edge lines up with the track's
      const tr = el.getBoundingClientRect();
      const cr = child.getBoundingClientRect();
      const rtl = getComputedStyle(el).direction === 'rtl';
      el.scrollBy({ left: rtl ? cr.right - tr.right : cr.left - tr.left, behavior: 'smooth' });
    }
    setIdx(n);
  }, [count]);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const kids = [...el.children] as HTMLElement[];
      const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
      let best = 0, bd = Infinity;
      kids.forEach((k, i) => { const r = k.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = i; } });
      setIdx(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!auto || count < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => { if (!paused.current) go(idx + 1); }, auto);
    return () => clearInterval(id);
  }, [auto, count, idx, go]);
  return (
    <div className="carousel" role="region" aria-roledescription="carousel" aria-label={label}
      onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)} onBlur={() => (paused.current = false)}>
      <div className="carousel-track" ref={track} style={{ ['--slide' as string]: slide }}>{children}</div>
      {count > 1 && (
        <div className="carousel-nav">
          {count > 6 ? (
            <span className="small muted num" aria-live="polite">{idx + 1} / {count}</span>
          ) : (
            <div className="dots">
              {children.map((_, i) => <button key={i} className={i === idx ? 'on' : ''} aria-label={`שקופית ${i + 1}`} onClick={() => go(i)} />)}
            </div>
          )}
          <div className="row" style={{ gap: 6 }}>
            {autoplay > 0 && design !== 'calm' && (
              <button className="btn icon sm" aria-label={stopped ? 'הפעלת החלפה אוטומטית' : 'עצירת החלפה אוטומטית'} aria-pressed={stopped} onClick={() => setStopped(!stopped)}>
                {stopped ? <Icons.play width={16} /> : <Icons.pause width={16} />}
              </button>
            )}
            <button className="btn icon sm" aria-label="הקודם" onClick={() => go(idx - 1)}><Icons.chevR width={18} /></button>
            <button className="btn icon sm" aria-label="הבא" onClick={() => go(idx + 1)}><Icons.chevL width={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

/** In-page confirm dialog (browser confirm() is unavailable in some embeds). */
const ConfirmCtx = createContext<(text: string, danger?: boolean) => Promise<boolean>>(async () => false);
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ text: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
  const ask = useCallback((text: string, danger?: boolean) => new Promise<boolean>((resolve) => setState({ text, danger, resolve })), []);
  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      {state && (
        <div className="modal-back" onClick={() => close(false)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <p>{state.text}</p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => close(false)}>ביטול</button>
              <button className={`btn ${state.danger ? 'danger solid' : 'primary'}`} autoFocus onClick={() => close(true)}>אישור</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmCtx);

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
          const r = 4;
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
            <g key={d.month} opacity={selected && !sel ? 0.5 : 1} className="bars" style={{ animationDelay: `${i * 40}ms` }}>
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
          <div className="r"><span><i style={{ background: 'var(--income)' }} />הכנסות</span><Money v={tip.d.income} /></div>
          <div className="r"><span><i style={{ background: 'var(--expense)' }} />הוצאות</span><Money v={tip.d.expense} /></div>
          <div className="r"><span><i style={{ background: 'var(--saving)' }} />חיסכון</span><Money v={tip.d.saving} /></div>
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
