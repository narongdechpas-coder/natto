import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { User } from '../../domain/types';
import { DECISION_LABEL, DECISION_REASON_LABEL, OPPORTUNITY_LABEL, PRIORITY_LABEL, fmtDate, fmtMB, fmtMonth, fmtPct } from '../../domain/labels';
import { canSeeUser, partnersOfUsers, statsFor } from '../../state/mgmt';
import { CURRENT_BATCH, decisionFor, lastVisit, openFollowUpsForPartner, partnerById, userById } from '../../state/selectors';
import { useStore } from '../../state/store';
import { StateView } from '../../ui/common';
import { navigate } from '../../ui/router';
import { TrackBadge } from '../marketing/History';
import { MonthSelect } from './MgmtShell';

export default function MarketingDetail({ viewer, userId }: { viewer: User; userId: string }) {
  const { data, today } = useStore();
  const [month, setMonth] = useState(CURRENT_BATCH);
  const m = data.users.find((u) => u.id === userId && u.role === 'marketing');
  if (!m) return <StateView kind="empty" title="ไม่พบผู้ใช้" />;
  if (!canSeeUser(viewer, m)) return <StateView kind="error" title="ไม่มีสิทธิ์เข้าถึง" text="ดูได้เฉพาะ Marketing ในทีมของคุณ" />;
  const team = data.teams.find((t) => t.id === m.teamId)!;
  const partners = partnersOfUsers(data, [m.id]);
  const ids = new Set(partners.map((p) => p.id));
  const s = statsFor(data, partners, month, today);
  const recs = data.recommendations.filter((r) => r.batchMonth === month && ids.has(r.partnerId));
  const visits = data.visits.filter((v) => ids.has(v.partnerId)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <>
      <div className="breadcrumb">
        {viewer.role === 'executive' && <><a href="#/">ภาพรวมองค์กร</a> ›</>}
        <a href={viewer.role === 'executive' ? `#/org/team/${team.id}` : '#/'}>{team.name}</a> › <span>{m.name}</span>
      </div>
      <div className="mgmt-title">
        <div><h1>{m.name}</h1><div className="small muted">Marketing · {team.name} · ดูแล Partner {partners.length} ราย · Manager: {userById(data, m.managerId!).name}</div></div>
        <div className="filters"><MonthSelect value={month} onChange={setMonth} today={today} /></div>
      </div>
      <div className="kpi-row">
        <div className="kpi"><span className="l">คำแนะนำที่ดำเนินการ</span><span className="v num">{s.acted}/{s.recs}</span><span className="d muted">ไม่รับ {s.deferred} · รอ {s.pending}</span></div>
        <div className="kpi"><span className="l">การเข้าพบ</span><span className="v num">{s.visits}</span><span className="d muted">Feedback {s.feedback} ประเด็น</span></div>
        <div className="kpi"><span className="l">Partner ที่เข้าพบใน 90 วัน</span><span className="v num">{fmtPct(s.coverage90, 0)}</span><span className="d muted">จาก {s.partners} ราย</span></div>
        <div className="kpi"><span className="l">งานติดตามที่ยังเปิด</span><span className="v num">{s.openActions}</span><span className={`d ${s.overdue ? 'down' : 'muted'}`}>เกินกำหนด {s.overdue}</span></div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <h2 style={{ fontSize: 17, color: 'var(--navy)' }}>คำแนะนำรอบ {fmtMonth(month)} และการตัดสินใจ</h2>
          {recs.length ? (
            <table className="table" style={{ marginTop: 6 }}>
              <thead><tr><th>Partner</th><th>ความสำคัญ</th><th>การตัดสินใจ</th></tr></thead>
              <tbody>{recs.map((r) => {
                const dcs = decisionFor(data, r.id);
                return (
                  <tr key={r.id} className="click" onClick={() => navigate(`/recs/${r.id}`)}>
                    <td><b>{partnerById(data, r.partnerId)!.name}</b><div className="xs muted">{OPPORTUNITY_LABEL[r.opportunity.type]}</div></td>
                    <td>{PRIORITY_LABEL[r.priority]} ({r.score})</td>
                    <td>{dcs ? DECISION_LABEL[dcs.decision] : <span className="muted">ยังไม่ดำเนินการ</span>}{dcs?.reason && <div className="xs muted">{DECISION_REASON_LABEL[dcs.reason]}</div>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          ) : <p className="small muted">ไม่มีคำแนะนำในรอบนี้</p>}
        </div>
        <div className="card">
          <h2 style={{ fontSize: 17, color: 'var(--navy)' }}>Partner ที่ดูแล</h2>
          <table className="table" style={{ marginTop: 6 }}>
            <thead><tr><th>Partner</th><th>เข้าพบล่าสุด</th><th className="r">งานค้าง</th></tr></thead>
            <tbody>{partners.map((p) => {
              const lv = lastVisit(data, p.id, today);
              return (
                <tr key={p.id} className="click" onClick={() => navigate(`/partner/${p.id}`)}>
                  <td><b>{p.name}</b><div className="xs muted">{p.type} · {p.region}</div></td>
                  <td>{lv ? fmtDate(lv.date) : <span className="down">ยังไม่เคย</span>}</td>
                  <td className="r num">{openFollowUpsForPartner(data, p.id).length}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>

      <div className="card section">
        <h2 style={{ fontSize: 17, color: 'var(--navy)' }}>การเข้าพบล่าสุด</h2>
        {visits.map((v) => (
          <a key={v.id} className="exc" href={`#/visits/${v.id}`}>
            <div className="grow small"><b>{partnerById(data, v.partnerId)!.name}</b> · {fmtDate(v.date)}<div className="xs muted">{v.objective}</div></div>
            <TrackBadge v={v} /><ChevronRight size={16} className="muted" />
          </a>
        ))}
        {!visits.length && <p className="small muted">ยังไม่มีการเข้าพบ</p>}
      </div>
      <p className="xs muted">โอกาสที่เกิดในเดือนนี้: {s.oppCount} รายการ {s.oppValue ? `(≈${fmtMB(s.oppValue)}/ปี ประมาณการ)` : ''}</p>
    </>
  );
}
