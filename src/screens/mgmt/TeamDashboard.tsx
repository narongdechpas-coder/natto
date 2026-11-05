import { AlertTriangle, CalendarX, ChevronRight, Info, MessageSquareWarning } from 'lucide-react';
import { useState } from 'react';
import type { User } from '../../domain/types';
import { SEVEN_P } from '../../domain/types';
import { DECISION_REASON_LABEL, SEVEN_P_LABEL, fmtMB, fmtMonth, fmtMonthShort, fmtPct } from '../../domain/labels';
import type { DecisionReason } from '../../domain/types';
import {
  MGMT_MONTHS, decisionReasons, exceptionsFor, feedbackBy7P, partnersOfUsers, periodOf, statsFor, teamMembers, visitsByMonth,
} from '../../state/mgmt';
import { CURRENT_BATCH } from '../../state/selectors';
import { useStore } from '../../state/store';
import { BarChart, Donut, SERIES } from '../../ui/charts';
import { StateView } from '../../ui/common';
import { navigate } from '../../ui/router';
import { Delta, MonthSelect } from './MgmtShell';

const TREND = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

export default function TeamDashboard({ viewer, teamId }: { viewer: User; teamId: string }) {
  const { data, today } = useStore();
  const [month, setMonth] = useState(CURRENT_BATCH);
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return <StateView kind="empty" title="ไม่พบทีม" />;
  if (viewer.role === 'manager' && viewer.teamId !== teamId) return <StateView kind="error" title="ไม่มีสิทธิ์เข้าถึง" text="Manager ดูได้เฉพาะทีมของตัวเอง" />;
  const members = teamMembers(data, teamId);
  const partners = partnersOfUsers(data, members.map((m) => m.id));
  const per = periodOf(month, today);
  const s = statsFor(data, partners, month, today);
  const manager = data.users.find((u) => u.id === team.managerId)!;
  const from3 = `${MGMT_MONTHS[Math.max(0, MGMT_MONTHS.indexOf(month) - 2)]}-01`;
  const fb = feedbackBy7P(data, partners, from3, per.to);
  const fbTotal = fb.reduce((a, x) => a + x.total, 0);
  const exc = exceptionsFor(data, partners, today);
  const reasons = decisionReasons(data, partners, MGMT_MONTHS);
  const trend = visitsByMonth(data, partners, TREND, today);

  return (
    <>
      {viewer.role === 'executive' && (
        <div className="breadcrumb"><a href="#/">ภาพรวมองค์กร</a> › <span>{team.name}</span></div>
      )}
      <div className="mgmt-title">
        <div>
          <h1>ภาพรวมทีม · {team.name}</h1>
          <div className="small muted">Manager: {manager.name} · Marketing {members.length} คน · Partner {partners.length} ราย</div>
        </div>
        <div className="filters"><MonthSelect value={month} onChange={setMonth} today={today} /></div>
      </div>
      {per.isCurrent && <p className="xs muted" style={{ marginTop: -6 }}>เดือนปัจจุบันนับถึงวันที่ {Number(today.slice(8))} และเทียบกับช่วงวันเดียวกันของ {fmtMonth(per.prev.month)}</p>}

      <div className="kpi-row">
        <div className="kpi"><span className="l">การเข้าพบ</span><span className="v num">{s.visits} ครั้ง</span><Delta cur={s.visits} prev={s.visitsPrev} suffix=" เทียบเดือนก่อน" /></div>
        <div className="kpi"><span className="l">Partner ที่เข้าพบใน 90 วัน</span><span className="v num">{fmtPct(s.coverage90, 0)}</span><span className="d muted">จาก {s.partners} ราย</span></div>
        <div className="kpi"><span className="l">คำแนะนำที่ดำเนินการ</span><span className="v num">{s.recs ? `${Math.round((s.acted / s.recs) * 100)}%` : '—'}</span><span className="d muted">{s.acted} จาก {s.recs} · รอ {s.pending}</span></div>
        <div className="kpi"><span className="l">โอกาสจากการเข้าพบ (ประมาณการ/ปี)</span><span className="v num">{s.oppValue ? `≈${fmtMB(s.oppValue)}` : '—'}</span><span className="d muted">{s.oppCount} โอกาส</span></div>
      </div>

      <div className="card section">
        <div className="row between"><h2 style={{ fontSize: 17, color: 'var(--navy)' }}>ผลงาน Marketing ({fmtMonth(month)})</h2><span className="xs muted">คลิกชื่อเพื่อดูรายละเอียด</span></div>
        <div className="table-scroll">
          <table className="table" style={{ marginTop: 6, minWidth: 640 }}>
            <thead><tr><th>Marketing</th><th className="r">แนะนำ</th><th className="r">ดำเนินการ</th><th className="r">เข้าพบ</th><th className="r">Feedback</th><th className="r">งานค้าง (เกินกำหนด)</th><th className="r">Partner เข้าพบใน 90 วัน</th><th className="r">โอกาส (ประมาณการ)</th><th /></tr></thead>
            <tbody>
              {members.map((m) => {
                const ms = statsFor(data, partnersOfUsers(data, [m.id]), month, today);
                return (
                  <tr key={m.id} className="click" onClick={() => navigate(`/team/${m.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/team/${m.id}`)}>
                    <td><b>{m.name}</b><div className="xs muted">{ms.partners} Partner</div></td>
                    <td className="r num">{ms.recs}</td>
                    <td className="r num">{ms.acted}</td>
                    <td className="r num">{ms.visits}</td>
                    <td className="r num">{ms.feedback}{ms.negative ? <span className="xs down"> ({ms.negative} ต้องปรับ)</span> : ''}</td>
                    <td className="r num">{ms.openActions}{ms.overdue ? <span className="xs down"> ({ms.overdue})</span> : ''}</td>
                    <td className="r num">{fmtPct(ms.coverage90, 0)}</td>
                    <td className="r num">{ms.oppValue ? `≈${fmtMB(ms.oppValue)}` : '—'}</td>
                    <td><ChevronRight size={16} className="muted" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="note" style={{ marginTop: 10 }}><Info size={16} /><div>ไม่ควรวัด Marketing จากจำนวนการเข้าพบอย่างเดียว ให้ดูความครอบคลุม Partner, การปิดงานติดตาม และโอกาสที่เกิดขึ้นประกอบกัน</div></div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="chart-title">จำนวนการเข้าพบรายเดือน (ครั้ง)</div>
          <div className="chart-sub">มิ.ย. – พ.ย. 2026{per.isCurrent ? ` · พ.ย. นับถึงวันที่ ${Number(today.slice(8))}` : ''}</div>
          <BarChart data={trend.map((x) => ({ label: fmtMonthShort(x.month), sub: fmtMonth(x.month), value: x.value }))} fmt={(v) => `${v} ครั้ง`} fmtAxis={(v) => `${Math.round(v)}`} ariaLabel="กราฟจำนวนการเข้าพบรายเดือนของทีม" />
        </div>
        <div className="card">
          <div className="chart-title">Feedback แยกตาม 7P</div>
          <div className="chart-sub">{fmtMonth(from3.slice(0, 7))} – {fmtMonth(month)} · ทั้งหมด {fbTotal} ประเด็น (ข้อมูลน้อย อย่าสรุปเกินจริง)</div>
          {fbTotal ? (
            <div className="row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <Donut items={fb.map((x, i) => ({ label: SEVEN_P_LABEL[x.key], value: x.total, color: SERIES[i] }))} center={String(fbTotal)} sub="ประเด็น" size={140} />
              <div className="grow">
                <table className="table">
                  <thead><tr><th>หมวด</th><th className="r">ทั้งหมด</th><th className="r">ต้องปรับ</th></tr></thead>
                  <tbody>{fb.map((x, i) => (
                    <tr key={x.key}><td><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: SERIES[i], marginRight: 6 }} />{SEVEN_P_LABEL[x.key]}</td><td className="r num">{x.total}</td><td className={`r num ${x.negative ? 'down' : ''}`}>{x.negative}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ) : <p className="small muted">ยังไม่มี Feedback ในช่วงนี้</p>}
        </div>
      </div>

      <div className="grid-3 section">
        <div className="card">
          <div className="row between"><h2 style={{ fontSize: 17, color: 'var(--navy)' }}>ประเด็นที่ต้องติดตาม</h2><span className="badge bad">{exc.length}</span></div>
          {exc.length ? exc.slice(0, 10).map((e, i) => (
            <a key={i} className="exc" href={e.href}>
              {e.kind === 'overdue' ? <CalendarX size={18} color="var(--red)" /> : e.kind === 'high_negative' ? <MessageSquareWarning size={18} color="var(--amber)" /> : <AlertTriangle size={18} color="var(--amber)" />}
              <div className="grow small"><b>{e.text}</b><div className="xs muted">{e.sub}</div></div>
              <ChevronRight size={16} className="muted" />
            </a>
          )) : <p className="small muted">ไม่มีประเด็นค้าง</p>}
          {exc.length > 10 && <p className="xs muted">แสดง 10 จาก {exc.length} รายการ</p>}
        </div>
        <div className="card">
          <div className="chart-title">เหตุผลที่ยังไม่รับคำแนะนำ</div>
          <div className="chart-sub">รวม 4 รอบล่าสุด · ใช้ปรับปรุงคุณภาพคำแนะนำ</div>
          {reasons.length ? (
            <table className="table" style={{ marginTop: 6 }}><tbody>
              {reasons.map(([r, n]) => <tr key={r}><td>{DECISION_REASON_LABEL[r as DecisionReason]}</td><td className="r num">{n}</td></tr>)}
            </tbody></table>
          ) : <p className="small muted">ยังไม่มีข้อมูล</p>}
        </div>
      </div>
      <p className="xs muted section">7P ที่ใช้: {SEVEN_P.map((k) => SEVEN_P_LABEL[k]).join(', ')} · ข้อมูลจำลองทั้งหมด</p>
    </>
  );
}
