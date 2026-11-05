import { ChevronRight, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import type { OpportunityStage, PartnerType, User } from '../../domain/types';
import { PRODUCT_LABEL, SEVEN_P_LABEL, STAGE_LABEL, fmtMB, fmtMillion, fmtMonth, fmtMonthShort, fmtPct, fmtPp } from '../../domain/labels';
import { fuelShare } from '../../engine/metrics';
import {
  MGMT_MONTHS, feedbackBy7P, partnersOfUsers, periodOf, segmentTrend, statsFor, teamMembers,
} from '../../state/mgmt';
import { CURRENT_BATCH, seriesOf } from '../../state/selectors';
import { useStore } from '../../state/store';
import { LineChart } from '../../ui/charts';
import { navigate } from '../../ui/router';
import { Delta, MonthSelect } from './MgmtShell';

const TYPES: PartnerType[] = ['Broker', 'Dealer', 'Bank'];
const STAGES: OpportunityStage[] = ['identified', 'qualified', 'in_progress', 'won', 'closed_lost'];

export default function ExecDashboard({ viewer }: { viewer: User }) {
  const { data, today } = useStore();
  const [month, setMonth] = useState(CURRENT_BATCH);
  const [unit, setUnit] = useState<'all' | string>('all');
  void viewer;
  const teams = unit === 'all' ? data.teams : data.teams.filter((t) => t.id === unit);
  const partners = partnersOfUsers(data, teams.flatMap((t) => teamMembers(data, t.id).map((m) => m.id)));
  const ids = new Set(partners.map((p) => p.id));
  const per = periodOf(month, today);
  const s = statsFor(data, partners, month, today);
  const opps = data.opportunities.filter((o) => ids.has(o.partnerId));
  const openOpps = opps.filter((o) => o.stage !== 'won' && o.stage !== 'closed_lost');
  const from3 = `${MGMT_MONTHS[Math.max(0, MGMT_MONTHS.indexOf(month) - 2)]}-01`;
  const fb = feedbackBy7P(data, partners, from3, per.to);
  const fbTotal = fb.reduce((a, x) => a + x.total, 0);
  const t = data.months.length - 1;

  // ---- Data-driven executive insights (What happened / Why / What to do) ----
  const segs = TYPES.map((type) => {
    const tr = segmentTrend(data, partners, type);
    const cur = tr[t].renewal, before = tr[t - 3].renewal;
    const recs = data.recommendations.filter((r) => r.batchMonth === CURRENT_BATCH && ids.has(r.partnerId) && r.primarySignal === 'renewal' && partners.find((p) => p.id === r.partnerId)!.type === type);
    return { type, tr, pp: cur != null && before != null ? (cur - before) * 100 : 0, recs };
  });
  const worst = [...segs].sort((a, b) => a.pp - b.pp)[0];
  const topRenewalRec = worst.recs.sort((a, b) => (b.opportunity.value ?? 0) - (a.opportunity.value ?? 0))[0];
  const negTop = [...fb].sort((a, b) => b.negative - a.negative)[0];
  const negFb = data.feedback.filter((f) => f.category === negTop?.key && f.sentiment === 'negative' && data.visits.some((v) => v.id === f.visitId && ids.has(v.partnerId) && v.date >= from3 && v.date <= per.to));
  const deptCount = new Map<string, number>();
  negFb.forEach((f) => f.responsibleDept && deptCount.set(f.responsibleDept, (deptCount.get(f.responsibleDept) ?? 0) + 1));
  const topDept = [...deptCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const evPartners = partners.filter((p) => (fuelShare(seriesOf(data, p.id)[t], 'EV') ?? 0) >= 0.15);
  const evVehicles = evPartners.reduce((a, p) => a + (seriesOf(data, p.id)[t].vehiclesByFuel?.EV ?? 0), 0);
  const nonmotorGap = data.recommendations.filter((r) => r.batchMonth === CURRENT_BATCH && ids.has(r.partnerId) && r.primarySignal === 'mix' && r.signals.find((x) => x.key === 'mix')!.facts.gapCat === 'NONMOTOR');

  return (
    <>
      <div className="mgmt-title">
        <div>
          <h1>ภาพรวมองค์กร · Business Partner</h1>
          <div className="small muted">{unit === 'all' ? 'ทั้งองค์กร' : teams[0].businessUnit} · Partner {partners.length} ราย · ข้อมูลรายเดือนถึง {fmtMonth(data.months[t])}</div>
        </div>
        <div className="filters">
          <MonthSelect value={month} onChange={setMonth} today={today} />
          <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="หน่วยงาน">
            <option value="all">หน่วยงาน: ทั้งองค์กร</option>
            {data.teams.map((tm) => <option key={tm.id} value={tm.id}>{tm.businessUnit}</option>)}
          </select>
        </div>
      </div>
      {per.isCurrent && <p className="xs muted" style={{ marginTop: -6 }}>เดือนปัจจุบันนับถึงวันที่ {Number(today.slice(8))} และเทียบกับช่วงวันเดียวกันของ {fmtMonth(per.prev.month)}</p>}

      <div className="kpi-row">
        <div className="kpi"><span className="l">Partner ที่ดูแล</span><span className="v num">{s.partners} ราย</span><span className="d muted">เข้าพบใน 90 วัน {fmtPct(s.coverage90, 0)}</span></div>
        <div className="kpi"><span className="l">การเข้าพบ ({fmtMonthShort(month)})</span><span className="v num">{s.visits} ครั้ง</span><Delta cur={s.visits} prev={s.visitsPrev} suffix=" เทียบเดือนก่อน" /></div>
        <div className="kpi"><span className="l">โอกาสที่ยังเปิด (ประมาณการ/ปี)</span><span className="v num">≈{fmtMB(openOpps.reduce((a, o) => a + (o.estimatedValue ?? 0), 0))}</span><span className="d muted">{openOpps.length} โอกาส · ไม่ใช่รายได้จริง</span></div>
        <div className="kpi"><span className="l">งานติดตามที่ยังเปิด</span><span className="v num">{s.openActions}</span><span className={`d ${s.overdue ? 'down' : 'muted'}`}>เกินกำหนด {s.overdue}</span></div>
      </div>

      <div className="card section">
        <h2 style={{ fontSize: 17, color: 'var(--navy)' }}>ผลงานแยกตาม Business Unit / ทีม ({fmtMonth(month)})</h2>
        <div className="table-scroll">
          <table className="table" style={{ marginTop: 6, minWidth: 680 }}>
            <thead><tr><th>ทีม</th><th className="r">Partner</th><th className="r">แนะนำ</th><th className="r">ดำเนินการ</th><th className="r">เข้าพบ</th><th className="r">เข้าพบใน 90 วัน</th><th className="r">Feedback ต้องปรับ</th><th className="r">งานเกินกำหนด</th><th className="r">โอกาส (ประมาณการ)</th><th /></tr></thead>
            <tbody>{data.teams.map((tm) => {
              const ps = partnersOfUsers(data, teamMembers(data, tm.id).map((m) => m.id));
              const ts = statsFor(data, ps, month, today);
              return (
                <tr key={tm.id} className="click" tabIndex={0} onClick={() => navigate(`/org/team/${tm.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/org/team/${tm.id}`)}>
                  <td><b>{tm.name}</b><div className="xs muted">Manager: {data.users.find((u) => u.id === tm.managerId)!.name}</div></td>
                  <td className="r num">{ts.partners}</td><td className="r num">{ts.recs}</td>
                  <td className="r num">{ts.recs ? `${Math.round((ts.acted / ts.recs) * 100)}%` : '—'}</td>
                  <td className="r num">{ts.visits}</td><td className="r num">{fmtPct(ts.coverage90, 0)}</td>
                  <td className="r num">{ts.feedback ? `${ts.negative}/${ts.feedback}` : '—'}</td>
                  <td className={`r num ${ts.overdue ? 'down' : ''}`}>{ts.overdue}</td>
                  <td className="r num">{ts.oppValue ? `≈${fmtMB(ts.oppValue)}` : '—'}</td>
                  <td><ChevronRight size={16} className="muted" /></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <h2 style={{ fontSize: 17, color: 'var(--navy)' }}>สัญญาณ Partner: Renewal Rate รวมรายกลุ่ม (%)</h2>
          <div className="chart-sub">{fmtMonth(data.months[0])} – {fmtMonth(data.months[t])} · กรมธรรม์ที่ต่ออายุ ÷ ครบกำหนด ของทุก Partner ในกลุ่ม · แต่ละกราฟใช้แกนของตัวเอง</div>
          <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 8 }}>
            {segs.map((g) => {
              const vals = g.tr.map((x) => x.renewal).filter((v): v is number => v != null);
              return (
                <div key={g.type}>
                  <div className="row between small"><b>{g.type}</b><span className={g.pp < 0 ? 'down' : 'up'}>{fmtPp(g.pp)} ใน 3 เดือน</span></div>
                  <LineChart data={g.tr.map((x) => ({ label: fmtMonthShort(x.month), sub: fmtMonth(x.month), value: x.renewal }))} fmt={(v) => fmtPct(v)} fmtAxis={(v) => `${Math.round(v * 100)}`}
                    min={Math.floor(Math.min(...vals) * 20) / 20 - 0.02} max={Math.ceil(Math.max(...vals) * 20) / 20 + 0.02} ariaLabel={`Renewal Rate กลุ่ม ${g.type}`} emphasizeFrom={8} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <h2 style={{ fontSize: 17, color: 'var(--navy)' }}>Feedback จาก Partner (7P)</h2>
          <div className="chart-sub">{fmtMonth(from3.slice(0, 7))} – {fmtMonth(month)} · {fbTotal} ประเด็น · แท่งแดงคือส่วนที่ "ต้องปรับ"</div>
          {fb.map((x) => {
            const max = Math.max(...fb.map((y) => y.total), 1);
            return (
              <div key={x.key} style={{ marginTop: 8 }}>
                <div className="row between small"><span>{SEVEN_P_LABEL[x.key]}</span><span className="num">{x.total} <span className="down">({x.negative} ต้องปรับ)</span></span></div>
                <div style={{ display: 'flex', gap: 2, height: 10 }} role="img" aria-label={`${SEVEN_P_LABEL[x.key]} ทั้งหมด ${x.total} ต้องปรับ ${x.negative}`}>
                  <div style={{ width: `${(x.negative / max) * 100}%`, background: 'var(--s8)', borderRadius: 4 }} />
                  <div style={{ width: `${((x.total - x.negative) / max) * 100}%`, background: 'var(--s1)', borderRadius: 4, opacity: 0.55 }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <h2 style={{ fontSize: 17, color: 'var(--navy)' }}>Opportunity Pipeline</h2>
          <div className="chart-sub">โอกาสที่เกิดจากการเข้าพบทั้งหมด · มูลค่าประมาณการต่อปี ไม่ใช่รายได้จริง</div>
          <div className="funnel" style={{ marginTop: 10 }}>
            {STAGES.map((st) => {
              const xs = opps.filter((o) => o.stage === st);
              return (
                <div key={st} style={st === 'won' ? { background: 'var(--green-soft)' } : st === 'closed_lost' ? { background: '#eef0f5' } : undefined}>
                  <b>{xs.length}</b><span className="xs">{STAGE_LABEL[st]}</span>
                  <div className="xs muted">{xs.length ? `≈${fmtMB(xs.reduce((a, o) => a + (o.estimatedValue ?? 0), 0))}` : '—'}</div>
                </div>
              );
            })}
          </div>
          <p className="xs muted">เฉพาะโอกาสที่มีสูตรประเมินมูลค่าได้ (Renewal / ยอดขาย / Product Mix) โอกาส EV ยังไม่มีฐานคำนวณ</p>
        </div>
      </div>

      <div className="card section">
        <h2 style={{ fontSize: 17, color: 'var(--navy)' }}><Lightbulb size={18} style={{ verticalAlign: -3 }} /> ประเด็นสำคัญสำหรับผู้บริหาร</h2>
        <p className="xs muted" style={{ marginTop: 2 }}>สรุปจากข้อมูลจำลองด้วยกติกาตายตัว เป็นข้อสังเกตเพื่อพิจารณา ไม่ใช่ข้อสรุปสุดท้าย</p>
        <div className="insight">
          <div className="q">เกิดอะไรขึ้น</div>
          <div className="small">Renewal Rate รวมของกลุ่ม {worst.type} เปลี่ยนไป <b className={worst.pp < 0 ? 'down' : 'up'}>{fmtPp(worst.pp)}</b> จาก {fmtMonth(data.months[t - 3])} ถึง {fmtMonth(data.months[t])} ซึ่งลดมากที่สุดในสามกลุ่ม</div>
          <div className="q" style={{ marginTop: 6 }}>เพราะอะไร</div>
          <div className="small">{worst.recs.length ? `${worst.recs.length} ราย ในกลุ่มนี้มีสัญญาณ Renewal เป็นเหตุผลหลักในรอบ ${fmtMonth(CURRENT_BATCH)}` : 'ยังไม่มี Partner รายใดที่ Renewal เป็นเหตุผลหลัก'}{topRenewalRec ? ` รายที่มูลค่าเสี่ยงสูงสุดคือ ${data.partners.find((p) => p.id === topRenewalRec.partnerId)!.name} (≈${fmtMillion(topRenewalRec.opportunity.value)}/ปี ประมาณการ)` : ''}</div>
          <div className="q" style={{ marginTop: 6 }}>ควรพิจารณาทำอะไร</div>
          <div className="small">ให้ทีมเข้าพบ Partner ที่มีฐานต่ออายุใหญ่ก่อน เพื่อหาสาเหตุ (ราคา คู่แข่ง หรือบริการ) แล้วนำผลมาทบทวนเงื่อนไขต่ออายุ{topRenewalRec && <> · <a href={`#/recs/${topRenewalRec.id}`}>ดูหลักฐาน</a></>}</div>
        </div>
        {negTop && negTop.negative > 0 && (
          <div className="insight">
            <div className="q">เกิดอะไรขึ้น</div>
            <div className="small">Feedback ด้าน <b>{SEVEN_P_LABEL[negTop.key]}</b> ถูกระบุว่า "ต้องปรับ" มากที่สุด {negTop.negative} จาก {negTop.total} ครั้ง ({fmtMonth(from3.slice(0, 7))} – {fmtMonth(month)})</div>
            <div className="q" style={{ marginTop: 6 }}>เพราะอะไร</div>
            <div className="small">ประเด็นที่พบบ่อย: {[...new Set(negFb.map((f) => f.detail))].slice(0, 2).join(' / ') || '—'}</div>
            <div className="q" style={{ marginTop: 6 }}>ควรพิจารณาทำอะไร</div>
            <div className="small">{topDept ? `มอบให้ทีม ${topDept[0]} ทบทวนและรายงานความคืบหน้า (${topDept[1]} ประเด็นเกี่ยวข้อง)` : 'กำหนดเจ้าของประเด็นและติดตามผลในรอบถัดไป'} · ตัวอย่างยังน้อย ควรเก็บเพิ่มก่อนสรุปเป็นนโยบาย</div>
          </div>
        )}
        <div className="insight">
          <div className="q">เกิดอะไรขึ้น</div>
          <div className="small">มี Partner {evPartners.length} รายที่รถ EV เกิน 15% ของพอร์ต รวม {evVehicles.toLocaleString('th-TH')} คัน ({fmtMonth(data.months[t])}){nonmotorGap.length ? ` และอีก ${nonmotorGap.length} รายที่ขาย ${PRODUCT_LABEL.NONMOTOR} ต่ำกว่ากลุ่มชัดเจน` : ''}</div>
          <div className="q" style={{ marginTop: 6 }}>ควรพิจารณาทำอะไร</div>
          <div className="small">ใช้หน้า "ค้นหาตามโจทย์ธุรกิจ" คัด Partner สำหรับผลิตภัณฑ์ EV และ Non-Motor ก่อนเปิดตัว · มูลค่าโอกาส EV ยังประเมินไม่ได้จนกว่าจะมีเบี้ยเฉลี่ยต่อคันที่อนุมัติ</div>
        </div>
      </div>
    </>
  );
}
