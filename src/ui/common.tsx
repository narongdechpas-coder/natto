import {
  AlertTriangle, BarChart3, Building2, CalendarDays, Car, ChevronLeft, Clock, Home, Info, Landmark, Target, User as UserIcon,
} from 'lucide-react';
import { Component, useEffect, useRef, type ReactNode } from 'react';
import type { PartnerType, Priority } from '../domain/types';
import { PRIORITY_LABEL, fmtDate } from '../domain/labels';
import { back } from './router';

export const MASCOT = './assets/mascot-natto.webp';

export function DemoRibbon() {
  return <div className="demo-ribbon" role="note">DEMO DATA · ข้อมูลจำลองทั้งหมด ไม่ใช่ข้อมูลจริง</div>;
}

export function PageHeader({ title, right, backTo }: { title: string; right?: ReactNode; backTo?: string }) {
  return (
    <div className="page-header">
      <button className="icon-btn" aria-label="ย้อนกลับ" onClick={() => back(backTo)}><ChevronLeft size={20} /></button>
      <h1>{title}</h1>
      {right}
    </div>
  );
}

export function PriorityBadge({ p }: { p: Priority }) {
  return <span className={`badge ${p}`}>{PRIORITY_LABEL[p]}</span>;
}

export function PartnerIcon({ type, size = 22 }: { type: PartnerType; size?: number }) {
  const I = type === 'Broker' ? Building2 : type === 'Dealer' ? Car : Landmark;
  return <span className="p-avatar" aria-hidden><I size={size} /></span>;
}

export function AsOf({ date, label = 'ข้อมูล ณ' }: { date: string; label?: string }) {
  return <div className="asof"><Clock size={12} /> {label} {fmtDate(date)}</div>;
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'bad' }) {
  const I = tone === 'info' ? Info : AlertTriangle;
  return <div className={`note ${tone === 'info' ? '' : tone}`}><I size={16} /><div>{children}</div></div>;
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { key: T; label: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the active tab visible when the tab row scrolls horizontally on small screens.
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('.tab.active');
    const box = ref.current;
    if (el && box) box.scrollLeft = el.offsetLeft - (box.clientWidth - el.clientWidth) / 2;
  }, [value]);
  return (
    <div className="tabs" role="tablist" ref={ref}>
      {items.map((i) => (
        <button key={i.key} role="tab" aria-selected={value === i.key} className={`tab ${value === i.key ? 'active' : ''}`} onClick={() => onChange(i.key)}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { key: T; label: string }[] }) {
  return (
    <div className="chips">
      {items.map((i) => (
        <button key={i.key} className={`chip ${value === i.key ? 'active' : ''}`} aria-pressed={value === i.key} onClick={() => onChange(i.key)}>{i.label}</button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function StateView({ kind, title, text, action }: { kind: 'empty' | 'error' | 'loading'; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="state" role={kind === 'error' ? 'alert' : 'status'}>
      <img src={MASCOT} alt="" style={kind === 'error' ? { filter: 'grayscale(.6)' } : undefined} />
      <h3>{title}</h3>
      {text && <p className="small" style={{ margin: '0 0 12px' }}>{text}</p>}
      {action}
    </div>
  );
}

export function SkeletonList({ n = 3 }: { n?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="กำลังโหลด">
      {Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" style={{ height: 86 }} />)}
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) {
      return (
        <StateView kind="error" title="เกิดข้อผิดพลาด" text="หน้านี้แสดงผลไม่ได้ ลองกลับไปหน้าหลักหรือรีเซ็ตข้อมูล demo"
          action={<button className="btn primary" onClick={() => { this.setState({ err: false }); window.location.hash = '/'; }}>กลับหน้าหลัก</button>} />
      );
    }
    return this.props.children;
  }
}

const NAV = [
  { to: '/', label: 'หน้าหลัก', icon: Home, match: (p: string) => p === '/' },
  { to: '/recs', label: 'แนะนำ', icon: Target, match: (p: string) => p.startsWith('/recs') || p.startsWith('/scenario') || p.startsWith('/partner') },
  { to: '/visits', label: 'เข้าพบ', icon: CalendarDays, match: (p: string) => p.startsWith('/visit') },
  { to: '/report', label: 'รายงาน', icon: BarChart3, match: (p: string) => p.startsWith('/report') },
  { to: '/profile', label: 'โปรไฟล์', icon: UserIcon, match: (p: string) => p.startsWith('/profile') },
];

export function BottomNav({ path }: { path: string }) {
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {NAV.map((n) => {
        const I = n.icon;
        const active = n.match(path);
        return (
          <a key={n.to} href={`#${n.to}`} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
            <I size={22} strokeWidth={active ? 2.4 : 1.8} />{n.label}
          </a>
        );
      })}
    </nav>
  );
}

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <div className="toast" role="status">{msg}</div>;
}

export const dateLabel = fmtDate;
