import { CalendarCheck, CheckCircle2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { Evidence, User } from '../../domain/types';
import {
  DECISION_LABEL, DECISION_REASON_LABEL, PRODUCT_LABEL, SIGNAL_LABEL, fmtDate, fmtMB, fmtMillion, fmtMonth, fmtMonthShort, fmtPct, fmtPp, fmtSignedPct, fmtInt,
} from '../../domain/labels';
import type { ProductCategory } from '../../domain/types';
import { renewalRate, totalPremium } from '../../engine/metrics';
import { decisionFor, partnerById, partnerKpis, scopePartners, seriesOf } from '../../state/selectors';
import { useStore } from '../../state/store';
import { BarChart, LineChart } from '../../ui/charts';
import { AsOf, Note, PageHeader, PriorityBadge, StateView, Tabs } from '../../ui/common';
import { navigate } from '../../ui/router';
import { DecisionSheet, useExplanation } from './shared';

type T = 'overview' | 'trend' | 'why';

const METRIC_LABEL = (m: string) => {
  if (m === 'renewal_rate') return 'Renewal Rate';
  if (m === 'renewal_premium_due_3m') return 'เบี้ยต่ออายุครบกำหนด (3 เดือน)';
  if (m === 'premium_mom') return 'เบี้ยประกันรายเดือน';
  if (m === 'premium_qoq') return 'เบี้ยประกัน 3 เดือน';
  if (m === 'ev_share_vehicles') return 'สัดส่วนรถ EV';
  if (m === 'days_since_last_visit') return 'วันที่ไม่ได้เข้าพบ';
  if (m === 'overdue_follow_ups') return 'งานติดตามเกินกำหนด';
  const cat = m.replace(/^share_/, '').replace(/_(vs_peer|change)$/, '') as ProductCategory;
  return `สัดส่วน ${PRODUCT_LABEL[cat] ?? cat}${m.endsWith('vs_peer') ? ' เทียบค่ากลางกลุ่ม' : ''}`;
};
const fmtEv = (e: Evidence, v: number | null) =>
  v == null ? '—' : e.unit === 'pct' ? fmtPct(v) : e.unit === 'thb' ? fmtMillion(v, 2) : e.unit === 'days' ? `${v} วัน` : fmtInt(v);
const changeOf = (e: Evidence) =>
  e.changePp != null ? fmtPp(e.changePp) : e.changePct != null ? fmtSignedPct(e.changePct) : '';

export default function RecommendationDetail({ id, user }: { id: string; user: User }) {
  const { data, decide, showToast } = useStore();
  const r = data.recommendations.find((x) => x.id === id);
  const e = useExplanation(r);
  const [tab, setTab] = useState<T>('overview');
  const [sheet, setSheet] = useState<null | 'not_now' | 'not_relevant'>(null);
  if (!r || !e) return <><PageHeader title="คำแนะนำ" backTo="/recs" /><StateView kind="empty" title="ไม่พบคำแนะนำนี้" /></>;
  const p = partnerById(data, r.partnerId)!;
  if (!scopePartners(data, user).some((x) => x.id === p.id)) {
    return <><PageHeader title="คำแนะนำ" backTo="/recs" /><StateView kind="error" title="ไม่มีสิทธิ์เข้าถึง" text="คู่ค้านี้ไม่อยู่ในความดูแลของคุณ" /></>;
  }
  const k = partnerKpis(data, p.id);
  const rows = seriesOf(data, p.id);
  const dec = decisionFor(data, r.id);
  const evidence = r.signals.filter((s) => s.triggered).flatMap((s) => s.evidence.map((ev) => ({ s: s.key, ev })));

  const prepare = () => {
    decide({ recommendationId: r.id, decision: 'prepare', reason: null, comment: null });
    navigate(`/partner/${p.id}?tab=talk&rec=${r.id}`);
  };
  const planContact = () => {
    decide({ recommendationId: r.id, decision: 'plan_contact', reason: null, comment: null });
    showToast('บันทึก "วางแผนติดต่อ" แล้ว นัดโตะไม่ได้จองนัดให้');
  };

  const premData = rows.map((x) => ({ label: fmtMonthShort(x.month), sub: fmtMonth(x.month), value: totalPremium(x) }));
  const rrData = rows.map((x) => ({ label: fmtMonthShort(x.month), sub: fmtMonth(x.month), value: renewalRate(x) }));
  const rrVals = rrData.map((x) => x.value).filter((v): v is number => v != null);

  return (
    <>
      <PageHeader title={p.name} backTo="/recs" right={<PriorityBadge p={r.priority} />} />
      <div className="page">
        <div className="row between small muted" style={{ marginBottom: 8 }}>
          <span>{p.type} · {p.region} · คะแนน {r.score}/100</span>
          <span>รอบ {fmtMonth(r.batchMonth)}</span>
        </div>
        <Tabs value={tab} onChange={setTab} items={[{ key: 'overview', label: 'ภาพรวม' }, { key: 'trend', label: 'แนวโน้ม' }, { key: 'why', label: 'เหตุผล AI' }]} />

        {tab === 'overview' && (
          <div className="section">
            <div className="kpi-grid three">
              <div className="kpi"><span className="l">เบี้ยประกัน YTD ({k.ytdMonths} เดือน)</span><span className="v num">{fmtMB(k.ytd)}</span>
                <span className={`d ${(k.premMoM ?? 0) < 0 ? 'down' : 'up'}`}>{fmtSignedPct(k.premMoM)} MoM</span></div>
              <div className="kpi"><span className="l">Renewal Rate ({fmtMonthShort(k.month)})</span><span className="v num">{fmtPct(k.rr, 0)}</span>
                <span className={`d ${(k.rrPp ?? 0) < 0 ? 'down' : 'up'}`}>{k.rrPp == null ? '—' : fmtPp(k.rrPp)} MoM</span></div>
              <div className="kpi"><span className="l">โอกาส (ประมาณการ/ปี)</span><span className="v num">{r.opportunity.value != null ? `≈${fmtMB(r.opportunity.value)}` : '—'}</span>
                <span className="d muted">{e.opportunity.label}</span></div>
            </div>
            <div className="ai-box section">
              <h3><Sparkles size={16} /> สรุปเหตุผลที่แนะนำ</h3>
              <ul>{e.reasons.slice(0, 4).map((x) => <li key={x}><CheckCircle2 size={15} />{x}</li>)}</ul>
            </div>
            <div className="card section small"><b>ทำไมต้องตอนนี้</b><div>{e.whyNow}</div></div>
            {r.confidence !== 'high' && <div className="section"><Note tone="warn">ความเชื่อมั่นของข้อมูล: {e.confidence.level} — {e.confidence.notes.join(' ')}</Note></div>}
            <div className="row between section"><AsOf date={r.dataAsOf} /><span className="xs muted">ความเชื่อมั่น: {e.confidence.level}</span></div>
          </div>
        )}

        {tab === 'trend' && (
          <div className="section stack">
            <div className="card">
              <div className="chart-title">เบี้ยประกันรายเดือน (ล้านบาท)</div>
              <div className="chart-sub">{fmtMonth(rows[0].month)} – {fmtMonth(rows[rows.length - 1].month)} · แท่งเข้มคือ 3 เดือนล่าสุด</div>
              <BarChart data={premData} fmt={(v) => fmtMillion(v, 2)} fmtAxis={(v) => (v / 1e6).toFixed(1)} highlight={[9, 10, 11]} ariaLabel="กราฟเบี้ยประกันรายเดือน" />
            </div>
            <div className="card">
              <div className="chart-title">Renewal Rate รายเดือน (%)</div>
              <div className="chart-sub">กรมธรรม์ที่ต่ออายุ ÷ กรมธรรม์ที่ครบกำหนด · พื้นเหลืองคือช่วงที่เปรียบเทียบ</div>
              <LineChart data={rrData} fmt={(v) => fmtPct(v)} fmtAxis={(v) => `${Math.round(v * 100)}`}
                min={Math.floor(Math.min(...rrVals) * 10) / 10 - 0.05} max={Math.min(1, Math.ceil(Math.max(...rrVals) * 10) / 10 + 0.05)}
                ariaLabel="กราฟ Renewal Rate รายเดือน" emphasizeFrom={8} />
            </div>
            <div className="card">
              <div className="chart-title">หลักฐานที่ใช้คำนวณ</div>
              <table className="table">
                <thead><tr><th>ตัวชี้วัด</th><th className="r">ล่าสุด</th><th className="r">เทียบ</th><th className="r">เปลี่ยน</th></tr></thead>
                <tbody>
                  {evidence.map(({ ev }, i) => (
                    <tr key={i}>
                      <td>{METRIC_LABEL(ev.metric)}<div className="xs muted">{ev.currentPeriod ? fmtMonth(ev.currentPeriod) : ''}{ev.comparisonPeriod && ev.comparisonPeriod !== ev.currentPeriod ? ` vs ${fmtMonth(ev.comparisonPeriod)}` : ''}</div></td>
                      <td className="r num">{fmtEv(ev, ev.currentValue)}</td>
                      <td className="r num">{fmtEv(ev, ev.comparisonValue)}</td>
                      <td className="r num">{changeOf(ev)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'why' && (
          <div className="section stack">
            <div className="card">
              <div className="chart-title">ที่มาของคะแนน {r.score}/100</div>
              {r.signals.map((s) => (
                <div key={s.key} style={{ marginTop: 8 }}>
                  <div className="row between small"><span>{SIGNAL_LABEL[s.key]} {s.triggered && <span className="badge info">เข้าเงื่อนไข</span>}</span><span className="num">{s.points} / {s.maxPoints}</span></div>
                  <div className="progress"><div style={{ width: `${(s.points / s.maxPoints) * 100}%`, background: s.triggered ? 'var(--cobalt)' : '#b7c3de' }} /></div>
                </div>
              ))}
              <p className="xs muted" style={{ marginBottom: 0 }}>น้ำหนักและเกณฑ์เป็นสมมติฐานสำหรับ demo ยังไม่ได้รับอนุมัติ</p>
            </div>
            <div className="card">
              <div className="chart-title">เหตุผลทั้งหมด</div>
              <ul className="bullets" style={{ marginTop: 6 }}>{e.reasons.map((x) => <li key={x}><CheckCircle2 size={15} />{x}</li>)}</ul>
            </div>
            <div className="card">
              <div className="chart-title">โอกาสทางธุรกิจ: {e.opportunity.label}</div>
              <div className="small" style={{ margin: '4px 0' }}><b>{e.opportunity.valueText}</b></div>
              {e.opportunity.formula && (
                <details className="disclose" open>
                  <summary>ดูสูตรและสมมติฐาน</summary>
                  <div className="small" style={{ marginTop: 6 }}>{e.opportunity.formula}</div>
                  <div className="small num" style={{ background: 'var(--bg)', padding: 8, borderRadius: 8, margin: '6px 0' }}>{e.opportunity.calc}</div>
                  <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>{e.opportunity.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
                </details>
              )}
            </div>
            <div className="card">
              <div className="chart-title">ประเด็นที่ควรคุย</div>
              <ol className="small" style={{ paddingLeft: 18, margin: '6px 0 0' }}>{e.talkingPoints.map((t) => <li key={t.topic}>{t.topic}</li>)}</ol>
            </div>
            <div className="card small"><b>ความเชื่อมั่นของข้อมูล: {e.confidence.level}</b><div>{e.confidence.notes.join(' ')}</div><AsOf date={r.dataAsOf} /></div>
          </div>
        )}

        <div className="section">
          {dec && (
            <div className="note" style={{ marginBottom: 10 }}>
              <CalendarCheck size={16} />
              <div>ตัดสินใจแล้ว: <b>{DECISION_LABEL[dec.decision]}</b>{dec.reason ? ` · ${DECISION_REASON_LABEL[dec.reason]}` : ''}{dec.comment ? ` · "${dec.comment}"` : ''} ({fmtDate(dec.date)}){user.role === 'marketing' ? ' — เปลี่ยนได้ด้านล่าง' : ''}</div>
            </div>
          )}
          {user.role === 'marketing' && <>
          <div className="row">
            <button className="btn secondary grow" onClick={() => setSheet('not_now')}>ไม่ใช่ตอนนี้</button>
            <button className="btn primary grow" onClick={prepare}><CalendarCheck size={18} /> เตรียมเข้าพบ</button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn ghost grow sm" onClick={planContact}>วางแผนติดต่อ</button>
            <button className="btn ghost grow sm" onClick={() => setSheet('not_relevant')}>ไม่เกี่ยวข้อง</button>
          </div>
          </>}
          {user.role !== 'marketing' && !dec && <div className="note">Marketing ผู้ดูแลยังไม่ได้ตัดสินใจกับคำแนะนำนี้</div>}
          <p className="xs muted" style={{ textAlign: 'center' }}>นัดโตะแค่แนะนำ ไม่จองนัดให้อัตโนมัติ</p>
        </div>
      </div>
      {sheet && <DecisionSheet open onClose={() => setSheet(null)} rec={r} kind={sheet} />}
    </>
  );
}
