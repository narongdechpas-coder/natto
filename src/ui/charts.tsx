// Small SVG chart kit. One y-axis per chart (no dual axis), thin marks, hover tooltips, legends for ≥2 series.
import { useState, type ReactNode } from 'react';

export const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

interface Pt { label: string; value: number | null; sub?: string }

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

const W = 340, H = 170, PAD = { l: 40, r: 8, t: 12, b: 24 };

function Frame({ max, min = 0, fmtAxis, children, labels }: { max: number; min?: number; fmtAxis: (v: number) => string; children: ReactNode; labels: string[] }) {
  const ticks = [0, 0.5, 1].map((f) => min + (max - min) * f);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const step = (W - PAD.l - PAD.r) / labels.length;
  return (
    <>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e8ecf4" strokeWidth={1} />
          <text x={PAD.l - 6} y={y(t) + 4} fontSize={10} textAnchor="end" fill="#7d87a3">{fmtAxis(t)}</text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={i} x={PAD.l + step * (i + 0.5)} y={H - 6} fontSize={10} textAnchor="middle" fill="#7d87a3">{l}</text>
      ))}
      {children}
    </>
  );
}

export function BarChart({ data, fmt, fmtAxis, color = 'var(--s1)', highlight, ariaLabel }: {
  data: Pt[]; fmt: (v: number) => string; fmtAxis: (v: number) => string; color?: string; highlight?: number[]; ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value ?? 0)));
  const step = (W - PAD.l - PAD.r) / data.length;
  const bw = Math.min(22, step * 0.62);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const base = H - PAD.b;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        <Frame max={max} fmtAxis={fmtAxis} labels={data.map((d) => d.label)}>
          {data.map((d, i) => {
            const x = PAD.l + step * i + (step - bw) / 2;
            if (d.value == null) {
              return <text key={i} x={x + bw / 2} y={base - 6} fontSize={9} textAnchor="middle" fill="#b0b7c9">n/a</text>;
            }
            const top = y(d.value);
            const h = Math.max(1, base - top);
            const r = Math.min(4, h);
            const hl = !highlight || highlight.includes(i);
            return (
              <path key={i}
                d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z`}
                fill={color} opacity={hover == null ? (hl ? 1 : 0.45) : hover === i ? 1 : 0.4} />
            );
          })}
          {data.map((_, i) => (
            <rect key={i} x={PAD.l + step * i} y={PAD.t} width={step} height={H - PAD.t - PAD.b} fill="transparent"
              onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
          ))}
        </Frame>
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: `${((PAD.l + step * (hover + 0.5)) / W) * 100}%`, top: `${(PAD.t / H) * 100 + 8}%` }}>
          {data[hover].sub ?? data[hover].label}: {data[hover].value == null ? 'ไม่มีข้อมูล' : fmt(data[hover].value!)}
        </div>
      )}
    </div>
  );
}

export function LineChart({ data, fmt, fmtAxis, min, max, color = 'var(--s1)', ariaLabel, emphasizeFrom }: {
  data: Pt[]; fmt: (v: number) => string; fmtAxis: (v: number) => string; min: number; max: number; color?: string; ariaLabel: string; emphasizeFrom?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const step = (W - PAD.l - PAD.r) / data.length;
  const x = (i: number) => PAD.l + step * (i + 0.5);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  // break the line at missing values
  const segs: string[] = [];
  let cur = '';
  data.forEach((d, i) => {
    if (d.value == null) { if (cur) segs.push(cur); cur = ''; return; }
    cur += `${cur ? 'L' : 'M'}${x(i)},${y(d.value)} `;
  });
  if (cur) segs.push(cur);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        <Frame max={max} min={min} fmtAxis={fmtAxis} labels={data.map((d) => d.label)}>
          {emphasizeFrom != null && (
            <rect x={PAD.l + step * emphasizeFrom} y={PAD.t} width={step * (data.length - emphasizeFrom)} height={H - PAD.t - PAD.b} fill="#fff4d6" />
          )}
          {segs.map((s, i) => <path key={i} d={s} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />)}
          {data.map((d, i) => d.value == null ? null : (
            <circle key={i} cx={x(i)} cy={y(d.value)} r={hover === i ? 5 : 4} fill={color} stroke="#fff" strokeWidth={2} />
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#9aa6c4" strokeDasharray="3 3" />}
          {data.map((_, i) => (
            <rect key={i} x={PAD.l + step * i} y={PAD.t} width={step} height={H - PAD.t - PAD.b} fill="transparent"
              onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
          ))}
        </Frame>
      </svg>
      {hover != null && (
        <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%`, top: '10%' }}>
          {data[hover].sub ?? data[hover].label}: {data[hover].value == null ? 'ไม่มีข้อมูล' : fmt(data[hover].value!)}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, color = 'var(--s1)', down }: { values: (number | null)[]; color?: string; down?: boolean }) {
  const v = values.filter((x): x is number => x != null);
  if (v.length < 2) return null;
  const lo = Math.min(...v), hi = Math.max(...v);
  const w = 90, h = 30;
  const pts = values.map((x, i) => (x == null ? null : `${(i / (values.length - 1)) * (w - 6) + 3},${h - 3 - ((x - lo) / (hi - lo || 1)) * (h - 6)}`)).filter(Boolean);
  const last = pts[pts.length - 1]!.split(',');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={down ? 'var(--red)' : color} />
    </svg>
  );
}

export interface Slice { label: string; value: number; color: string }

export function Donut({ items, center, sub, size = 150 }: { items: Slice[]; center: string; sub: string; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const r = 52, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={`${sub} ${center}`} onMouseLeave={() => setHover(null)}>
      <g transform="rotate(-90 70 70)">
        {items.map((s, i) => {
          const len = (s.value / total) * c;
          const gap = items.length > 1 ? 2 : 0;
          const el = (
            <circle key={i} cx={70} cy={70} r={r} fill="none" stroke={s.color} strokeWidth={hover === i ? 22 : 18}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-acc} onMouseEnter={() => setHover(i)}>
              <title>{`${s.label}: ${s.value} (${Math.round((s.value / total) * 100)}%)`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
      </g>
      <text x={70} y={68} textAnchor="middle" fontSize={22} fontFamily="Mitr" fill="#15357d">{hover == null ? center : items[hover].value}</text>
      <text x={70} y={86} textAnchor="middle" fontSize={10} fill="#7d87a3">{hover == null ? sub : items[hover].label}</text>
    </svg>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => <span key={i.label}><i style={{ background: i.color }} />{i.label}{i.value ? ` ${i.value}` : ''}</span>)}
    </div>
  );
}

/** 100% stacked horizontal bar: one row per entity (e.g. Partner vs peer median). */
export function ShareBar({ parts, height = 14 }: { parts: { label: string; value: number; color: string }[]; height?: number }) {
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div style={{ display: 'flex', gap: 2, height, borderRadius: 6, overflow: 'hidden' }} role="img"
      aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
      {parts.map((p) => (
        <div key={p.label} title={`${p.label} ${((p.value / total) * 100).toFixed(1)}%`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
      ))}
    </div>
  );
}
