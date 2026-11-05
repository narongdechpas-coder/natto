import { CalendarDays, CheckCircle2, Clock, Search, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import type { User, Visit } from '../../domain/types';
import { SEVEN_P_LABEL, VISIT_STATUS_LABEL, fmtDate, fmtMonth } from '../../domain/labels';
import { partnerById, scopePartners, visitTrack } from '../../state/selectors';
import { useStore } from '../../state/store';
import { Chips, MASCOT, PageHeader, PartnerIcon, StateView } from '../../ui/common';
import { useRoute } from '../../ui/router';

type T = 'all' | 'done' | 'follow' | 'planned';

export function TrackBadge({ v }: { v: Visit }) {
  const { data } = useStore();
  const t = visitTrack(data, v);
  if (t === 'done') return <span className="badge good"><CheckCircle2 size={13} /> เสร็จสิ้น</span>;
  if (t === 'follow') return <span className="badge warn"><Clock size={13} /> ติดตามต่อ</span>;
  if (t === 'planned') return <span className="badge info"><CalendarDays size={13} /> วางแผนแล้ว</span>;
  return <span className="badge neutral">{VISIT_STATUS_LABEL[v.status]}</span>;
}

export default function History({ user }: { user: User }) {
  const { data, today } = useStore();
  const { query } = useRoute();
  const [tab, setTab] = useState<T>((query.get('tab') as T) || 'all');
  const [month, setMonth] = useState('all');
  const [q, setQ] = useState('');
  const [mk, setMk] = useState('all');
  const members = data.users.filter((u) => u.role === 'marketing' && (user.role === 'executive' || u.teamId === user.teamId));
  const ids = new Set(scopePartners(data, user).map((p) => p.id));
  const mine = data.visits.filter((v) => ids.has(v.partnerId)).sort((a, b) => b.date.localeCompare(a.date));
  const months = [...new Set(mine.map((v) => v.date.slice(0, 7)))].sort().reverse();
  const count = (t: T) => mine.filter((v) => t === 'all' || visitTrack(data, v) === t).length;
  const list = mine.filter((v) => {
    if (tab !== 'all' && visitTrack(data, v) !== tab) return false;
    if (month !== 'all' && !v.date.startsWith(month)) return false;
    if (mk !== 'all' && v.marketingId !== mk) return false;
    if (q && !partnerById(data, v.partnerId)!.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const year = today.slice(0, 4);
  const ytd = mine.filter((v) => v.status === 'visited' && v.date.startsWith(year));
  const vIds = new Set(mine.map((v) => v.id));
  const fus = data.followUps.filter((f) => vIds.has(f.visitId));
  const closeRate = fus.length ? Math.round((fus.filter((f) => f.status === 'done').length / fus.length) * 100) : null;

  return (
    <>
      <PageHeader title={user.role === 'marketing' ? 'ประวัติการเข้าพบ' : user.role === 'manager' ? 'การเข้าพบของทีม' : 'การเข้าพบทั้งองค์กร'} backTo="/" />
      <div className="page">
        <div className="card row" style={{ background: 'linear-gradient(160deg,#fff,var(--sky))' }}>
          <img src={MASCOT} alt="" style={{ width: 64 }} />
          <div className="grow"><b style={{ color: 'var(--navy)' }}>ประวัติการเข้าพบและงานติดตาม</b><div className="xs muted">ดูว่าคุยอะไรกับคู่ค้าไปแล้ว และยังมีอะไรต้องตาม</div></div>
        </div>
        <div className="section"><Chips value={tab} onChange={setTab} items={[
          { key: 'all', label: `ทั้งหมด (${count('all')})` }, { key: 'done', label: `เสร็จสิ้น (${count('done')})` },
          { key: 'follow', label: `ติดตามต่อ (${count('follow')})` }, { key: 'planned', label: `วางแผน (${count('planned')})` },
        ]} /></div>
        <div className="row" style={{ marginTop: 8 }}>
          <div className="search grow"><Search size={16} /><input className="input" placeholder="ค้นหาคู่ค้า" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาคู่ค้า" /></div>
          <select className="select" style={{ width: 130 }} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="เดือน">
            <option value="all">ทุกเดือน</option>{months.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
        </div>

        {user.role !== 'marketing' && (
          <select className="select" style={{ marginTop: 8 }} value={mk} onChange={(e) => setMk(e.target.value)} aria-label="Marketing">
            <option value="all">Marketing ทุกคน</option>{members.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <div className="section stack">
          {list.length ? list.map((v) => {
            const p = partnerById(data, v.partnerId)!;
            const tags = data.feedback.filter((f) => f.visitId === v.id);
            return (
              <a key={v.id} className="card p-card" href={`#/visits/${v.id}`}>
                <PartnerIcon type={p.type} />
                <div className="grow">
                  <div className="row between"><span className="p-name">{p.name}</span><TrackBadge v={v} /></div>
                  <div className="small muted">{v.status === 'planned' ? 'แผนเข้าพบ' : 'เข้าพบ'} {fmtDate(v.date)} · {v.objective}{user.role !== 'marketing' ? ` · ${data.users.find((u) => u.id === v.marketingId)!.name}` : ''}</div>
                  {tags.length > 0 && (
                    <div className="row" style={{ flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {tags.map((f) => <span key={f.id} className={`badge ${f.sentiment === 'negative' ? 'bad' : f.sentiment === 'positive' ? 'good' : 'neutral'}`}>{SEVEN_P_LABEL[f.category]}</span>)}
                    </div>
                  )}
                </div>
              </a>
            );
          }) : <StateView kind="empty" title="ไม่พบประวัติการเข้าพบ" text={mine.length ? 'ลองเปลี่ยนตัวกรอง' : 'เมื่อบันทึกการเข้าพบ ประวัติจะแสดงที่นี่'} />}
        </div>

        <div className="section">
          <div className="section-title"><h2>สรุปการเข้าพบปี {year}</h2></div>
          <div className="kpi-grid">
            <div className="kpi"><CalendarDays size={18} /><span className="v num">{ytd.length}</span><span className="l">เข้าพบ</span></div>
            <div className="kpi"><CheckCircle2 size={18} /><span className="v num">{ytd.filter((v) => visitTrack(data, v) === 'done').length}</span><span className="l">เสร็จสิ้น</span></div>
            <div className="kpi"><Clock size={18} /><span className="v num">{ytd.filter((v) => visitTrack(data, v) === 'follow').length}</span><span className="l">ติดตามต่อ</span></div>
            <div className="kpi"><TrendingUp size={18} /><span className="v num">{closeRate == null ? '—' : `${closeRate}%`}</span><span className="l">อัตราปิดงานติดตาม</span></div>
          </div>
          <p className="xs muted">อัตราปิดงาน = งานติดตามที่เสร็จ ÷ งานติดตามทั้งหมดของการเข้าพบที่คุณดูแล</p>
        </div>
      </div>
    </>
  );
}
