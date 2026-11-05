// Thai date picker: always shows day-month-year in Thai, independent of the browser/OS locale.
// Value format stays ISO 'YYYY-MM-DD' so business logic is unchanged.
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { fmtDate } from '../domain/labels';
import { Sheet } from './common';

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const WEEKDAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const weekday = (v: string) => WEEKDAY_FULL[new Date(`${v}T00:00:00Z`).getUTCDay()];

export function ThaiDateInput({ id, value, onChange, min, max, today, placeholder = 'เลือกวันที่', allowClear }: {
  id?: string; value: string; onChange: (v: string) => void; min?: string; max?: string; today: string; placeholder?: string; allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const base = value || today;
  const [view, setView] = useState({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
  const openPicker = () => { const b = value || today; setView({ y: Number(b.slice(0, 4)), m: Number(b.slice(5, 7)) - 1 }); setOpen(true); };
  const shift = (n: number) => setView((v) => { const d = new Date(Date.UTC(v.y, v.m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const disabled = (d: string) => (min != null && d < min) || (max != null && d > max);
  const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const pick = (d: string) => { if (disabled(d)) return; onChange(d); setOpen(false); };

  return (
    <>
      <button type="button" id={id} className="input thai-date" onClick={openPicker} aria-haspopup="dialog">
        <span className={value ? '' : 'muted'}>{value ? <>{fmtDate(value)} <span className="xs muted">({weekday(value)})</span></> : placeholder}</span>
        <CalendarDays size={18} className="muted" />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="เลือกวันที่">
        <div className="row between" style={{ marginBottom: 8 }}>
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="เดือนก่อนหน้า"><ChevronLeft size={18} /></button>
          <b style={{ color: 'var(--navy)', fontFamily: 'var(--font-head)', fontWeight: 500 }}>{MONTHS[view.m]} {view.y}</b>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="เดือนถัดไป"><ChevronRight size={18} /></button>
        </div>
        <div className="cal-grid" role="grid" aria-label={`${MONTHS[view.m]} ${view.y}`}>
          {WEEKDAYS.map((w) => <div key={w} className="cal-wd">{w}</div>)}
          {cells.map((d, i) => {
            if (d == null) return <div key={`e${i}`} />;
            const v = iso(view.y, view.m, d);
            return (
              <button type="button" key={v} disabled={disabled(v)} onClick={() => pick(v)} aria-label={fmtDate(v)} aria-pressed={v === value}
                className={`cal-day ${v === value ? 'sel' : ''} ${v === today ? 'today' : ''}`}>{d}</button>
            );
          })}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          {!disabled(today) && <button type="button" className="btn secondary sm" onClick={() => pick(today)}>วันนี้ ({fmtDate(today)})</button>}
          {allowClear && value && <button type="button" className="btn ghost sm" onClick={() => { onChange(''); setOpen(false); }}>ล้างวันที่</button>}
          <button type="button" className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setOpen(false)}>ปิด</button>
        </div>
      </Sheet>
    </>
  );
}
