// Animated building blocks for the booth deck. Animations start when the element becomes visible
// (works for the active slide and for slides scrolled into view on phones). Reduced motion → final state.
import { useEffect, useRef, useState, type ReactNode } from 'react';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** True once the element has been visible (re-mounting the slide replays it). */
export function useVisible<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) { setVis(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, vis];
}

/** Number that counts up from 0 when visible. */
export function CountUp({ to, decimals = 0, prefix = '', suffix = '', ms = 1400, delay = 0 }: {
  to: number; decimals?: number; prefix?: string; suffix?: string; ms?: number; delay?: number;
}) {
  const [ref, vis] = useVisible<HTMLSpanElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!vis) return;
    if (reduced()) { setV(to); return; }
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / ms));
      setV(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vis, to, ms, delay]);
  return <span ref={ref} className="num">{prefix}{v.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}

/** Text typed out character by character when visible; calls onDone at the end. */
export function Typewriter({ text, cps = 28, onDone }: { text: string; cps?: number; onDone?: () => void }) {
  const [ref, vis] = useVisible<HTMLSpanElement>();
  const [n, setN] = useState(0);
  const chars = Array.from(text);
  useEffect(() => {
    if (!vis) return;
    if (reduced()) { setN(chars.length); onDone?.(); return; }
    let k = 0;
    const id = window.setInterval(() => {
      k += 1;
      setN(k);
      if (k >= chars.length) { window.clearInterval(id); onDone?.(); }
    }, 1000 / cps);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vis]);
  return <span ref={ref}>{chars.slice(0, n).join('')}<span className="caret" aria-hidden>{n < chars.length ? '|' : ''}</span></span>;
}

/** Wrapper that adds the `in` class when visible, so CSS can stagger children with --d delays. */
export function Reveal({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'ul' | 'section' }) {
  const [ref, vis] = useVisible<HTMLDivElement>();
  return <Tag ref={ref as never} className={`reveal ${vis ? 'in' : ''} ${className}`}>{children}</Tag>;
}

/** Line chart that draws itself; highlighted window shaded. Single series, single y-axis. */
export function DrawLine({ values, labels, min, max, highlightFrom, fmt, aria }: {
  values: (number | null)[]; labels: string[]; min: number; max: number; highlightFrom?: number; fmt: (v: number) => string; aria: string;
}) {
  const [ref, vis] = useVisible<SVGSVGElement>();
  const W = 640, H = 250, L = 44, R = 12, T = 14, B = 28;
  const step = (W - L - R) / (values.length - 1);
  const x = (i: number) => L + i * step;
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const pts = values.map((v, i) => (v == null ? null : [x(i), y(v)] as const)).filter(Boolean) as (readonly [number, number])[];
  const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ');
  const last = values.length - 1;
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={aria} className={`drawline ${vis ? 'in' : ''}`}>
      {[0, 0.5, 1].map((f) => {
        const v = min + (max - min) * f;
        return <g key={f}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e3e8f2" /><text x={L - 6} y={y(v) + 4} fontSize={12} textAnchor="end" fill="#7d87a3">{fmt(v)}</text></g>;
      })}
      {highlightFrom != null && <rect className="hl" x={x(highlightFrom)} y={T} width={x(last) - x(highlightFrom)} height={H - T - B} fill="#fff4d6" />}
      {labels.map((l, i) => <text key={i} x={x(i)} y={H - 8} fontSize={12} textAnchor="middle" fill="#7d87a3">{l}</text>)}
      <path d={d} pathLength={1} fill="none" stroke="var(--s1)" strokeWidth={3} strokeLinejoin="round" className="stroke" />
      {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={i === pts.length - 1 ? 6 : 4} fill={i === pts.length - 1 ? 'var(--red)' : 'var(--s1)'} stroke="#fff" strokeWidth={2} className="dot" style={{ ['--d' as string]: `${0.15 + (i / pts.length) * 1.3}s` }} />)}
      {values[last] != null && (
        <text x={x(last) - 6} y={y(values[last]!) + 24} fontSize={15} fontWeight={700} textAnchor="end" fill="var(--red)" className="endlabel">{fmt(values[last]!)}</text>
      )}
    </svg>
  );
}

/** Donut that fills its segments in sequence. */
export function DrawDonut({ items, center, sub, size = 220 }: { items: { label: string; value: number; color: string }[]; center: ReactNode; sub: string; size?: number }) {
  const [ref, vis] = useVisible<SVGSVGElement>();
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const r = 52, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 140 140" role="img" aria-label={sub} className={`drawdonut ${vis ? 'in' : ''}`}>
      <circle cx={70} cy={70} r={r} fill="none" stroke="#eef1f7" strokeWidth={18} />
      <g transform="rotate(-90 70 70)">
        {items.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={s.label} cx={70} cy={70} r={r} fill="none" stroke={s.color} strokeWidth={18}
              strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`} strokeDashoffset={-acc}
              style={{ ['--len' as string]: `${Math.max(0, len - 1.5)}`, ['--c' as string]: `${c}`, ['--d' as string]: `${0.1 + i * 0.12}s` }} className="seg">
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
      </g>
      <foreignObject x={30} y={46} width={80} height={50}><div className="donut-center">{center}<small>{sub}</small></div></foreignObject>
    </svg>
  );
}
