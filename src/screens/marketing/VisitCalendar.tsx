// Month calendar of the user's visits, shown under the dashboard hero as an accordion (closed by default).
// Days with visits get a coloured dot per visit; tapping a day lists that day's visits (today by default).
import { CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Visit, VisitStatus } from '../../domain/types';
import { VISIT_STATUS_LABEL, fmtDate, fmtMonth } from '../../domain/labels';
import { partnerById, type Data } from '../../state/selectors';

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const DOT: Record<VisitStatus, string> = {
  planned: 'var(--cobalt)', visited: 'var(--green)', rescheduled: 'var(--amber)', not_visited: 'var(--ink-3)',
};
const BADGE: Record<VisitStatus, string> = { planned: 'info', visited: 'good', rescheduled: 'warn', not_visited: 'neutral' };

export function VisitCalendar({ data, visits, today }: { data: Data; visits: Visit[]; today: string }) {
  const month = today.slice(0, 7);
  const [selected, setSelected] = useState(today);
  const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const iso = (d: number) => `${month}-${String(d).padStart(2, '0')}`;

  const inMonth = visits.filter((v) => v.date.startsWith(month)).sort((a, b) => (a.date + (a.plan?.time ?? '')).localeCompare(b.date + (b.plan?.time ?? '')));
  const byDay = new Map<string, Visit[]>();
  for (const v of inMonth) byDay.set(v.date, [...(byDay.get(v.date) ?? []), v]);
  const todayN = byDay.get(today)?.length ?? 0;
  const dayList = byDay.get(selected) ?? [];

  return (
    <details className="card vcal">
      <summary>
        <span className="p-avatar vcal-icon"><CalendarDays size={20} /></span>
        <span className="grow">
          <b>ปฏิทินนัดหมาย · {fmtMonth(month)}</b>
          <span className="small muted vcal-sub">วันนี้ {todayN ? `${todayN} นัด` : 'ไม่มีนัด'} · เดือนนี้ {inMonth.length} นัด</span>
        </span>
        <ChevronDown size={20} className="vcal-chev" />
      </summary>

      <div className="vcal-body">
        <div className="vcal-grid" role="grid" aria-label={`ปฏิทิน ${fmtMonth(month)}`}>
          {WEEKDAYS.map((w) => <span key={w} className="vcal-wd">{w}</span>)}
          {Array.from({ length: lead }, (_, k) => <span key={`x${k}`} />)}
          {Array.from({ length: days }, (_, k) => {
            const d = iso(k + 1);
            const vs = byDay.get(d) ?? [];
            const cls = ['vcal-day', d === today && 'today', d === selected && 'sel', vs.length && 'has'].filter(Boolean).join(' ');
            return (
              <button key={d} type="button" className={cls} onClick={() => setSelected(d)}
                aria-pressed={d === selected} aria-label={`${fmtDate(d)}${d === today ? ' (วันนี้)' : ''} ${vs.length ? `${vs.length} นัด` : 'ไม่มีนัด'}`}>
                <span>{k + 1}</span>
                <i className="vcal-dots">{vs.slice(0, 3).map((v) => <b key={v.id} style={{ background: DOT[v.status] }} />)}</i>
              </button>
            );
          })}
        </div>
        <div className="vcal-legend xs muted">
          {(['planned', 'visited', 'rescheduled'] as VisitStatus[]).map((s) => <span key={s}><b style={{ background: DOT[s] }} />{VISIT_STATUS_LABEL[s]}</span>)}
        </div>

        <div className="vcal-list">
          <div className="small"><b>{selected === today ? 'วันนี้ · ' : ''}{fmtDate(selected)}</b></div>
          {dayList.length ? dayList.map((v) => (
            <a key={v.id} className="vcal-item" href={`#/visits/${v.id}`}>
              <span className="vcal-time num">{v.plan?.time ?? 'ไม่ระบุเวลา'}</span>
              <span className="grow ellipsis"><b>{partnerById(data, v.partnerId)?.name ?? v.partnerId}</b>
                <span className="xs muted ellipsis" style={{ display: 'block' }}>{v.objective || 'ไม่ได้ระบุวัตถุประสงค์'}</span></span>
              <span className={`badge ${BADGE[v.status]}`}>{VISIT_STATUS_LABEL[v.status]}</span>
              <ChevronRight size={16} className="muted" />
            </a>
          )) : <div className="small muted">{selected === today ? 'ไม่มีนัดในวันนี้' : 'ไม่มีนัดในวันที่เลือก'}{inMonth.length ? ' · แตะวันที่มีจุดเพื่อดูนัด' : ''}</div>}
        </div>
      </div>
    </details>
  );
}
