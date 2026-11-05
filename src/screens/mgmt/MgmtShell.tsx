import { BarChart3, CalendarDays, User as UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { User } from '../../domain/types';
import { fmtMonth } from '../../domain/labels';
import { BottomNav, type NavItem } from '../../ui/common';
import { MGMT_MONTHS } from '../../state/mgmt';

const ITEMS: NavItem[] = [
  { to: '/', label: 'ภาพรวม', icon: BarChart3, match: (p) => p === '/' || p.startsWith('/org') || p.startsWith('/team') || p.startsWith('/partner') || p.startsWith('/recs') },
  { to: '/visits', label: 'การเข้าพบ', icon: CalendarDays, match: (p) => p.startsWith('/visits') },
  { to: '/profile', label: 'โปรไฟล์', icon: UserIcon, match: (p) => p.startsWith('/profile') },
];

export function MgmtShell({ user, path, children }: { user: User; path: string; children: ReactNode }) {
  return (
    <>
      <div className="mgmt-shell">
        <div className="mgmt-top">
          <div className="brand">นัด<span>โตะ</span></div>
          <span className="badge info">{user.role === 'manager' ? 'Manager' : 'ผู้บริหาร'} · {user.name}</span>
          <nav aria-label="เมนูผู้บริหาร">
            {ITEMS.map((i) => <a key={i.to} href={`#${i.to}`} className={i.match(path) ? 'active' : ''}>{i.label}</a>)}
          </nav>
        </div>
        {children}
      </div>
      <BottomNav path={path} items={ITEMS} className="mgmt-bottom" />
    </>
  );
}

export function MonthSelect({ value, onChange, today }: { value: string; onChange: (m: string) => void; today: string }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="เดือน">
      {[...MGMT_MONTHS].reverse().map((m) => (
        <option key={m} value={m}>เดือน: {fmtMonth(m)}{today.startsWith(m) ? ` (ถึง ${Number(today.slice(8))} ${fmtMonth(m).split(' ')[0]})` : ''}</option>
      ))}
    </select>
  );
}

/** Change vs previous period. Small bases (<10) show the absolute comparison instead of a misleading %. */
export function Delta({ cur, prev, suffix = '' }: { cur: number; prev: number; suffix?: string }) {
  if (prev < 10) return <span className="d muted">ช่วงเดียวกันเดือนก่อน {prev} ครั้ง</span>;
  const g = (cur - prev) / prev;
  return <span className={`d ${g < 0 ? 'down' : 'up'}`}>{g > 0 ? '+' : g < 0 ? '−' : ''}{Math.abs(g * 100).toFixed(0)}%{suffix}</span>;
}
