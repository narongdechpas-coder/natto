import type { DecisionType, User } from '../../domain/types';
import { SEVEN_P } from '../../domain/types';
import { DECISION_LABEL, SEVEN_P_LABEL, STAGE_LABEL, fmtMillion, fmtMonth, fmtMonthShort } from '../../domain/labels';
import { CURRENT_BATCH, decisionFor, recsFor, scopePartners } from '../../state/selectors';
import { useStore } from '../../state/store';
import { BarChart, Donut, Legend, SERIES } from '../../ui/charts';
import { PageHeader } from '../../ui/common';

const LAST6 = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

export default function MyReport({ user }: { user: User }) {
  const { data, today } = useStore();
  const ids = new Set(scopePartners(data, user).map((p) => p.id));
  const recs = recsFor(data, ids);
  const dec = (k: DecisionType | 'none') => recs.filter((r) => (decisionFor(data, r.id)?.decision ?? 'none') === k).length;
  const visits = data.visits.filter((v) => ids.has(v.partnerId) && v.status === 'visited');
  const vIds = new Set(visits.map((v) => v.id));
  const fb = data.feedback.filter((f) => vIds.has(f.visitId));
  const opps = data.opportunities.filter((o) => ids.has(o.partnerId));
  return (
    <>
      <PageHeader title="รายงานของฉัน" backTo="/" />
      <div className="page stack">
        <div className="card">
          <div className="chart-title">การจัดการคำแนะนำ รอบ {fmtMonth(CURRENT_BATCH)} ({recs.length} ราย)</div>
          <table className="table" style={{ marginTop: 6 }}><tbody>
            {(['prepare', 'plan_contact', 'not_now', 'not_relevant'] as DecisionType[]).map((k) => <tr key={k}><td>{DECISION_LABEL[k]}</td><td className="r num">{dec(k)}</td></tr>)}
            <tr><td>ยังไม่ดำเนินการ</td><td className="r num">{dec('none')}</td></tr>
          </tbody></table>
        </div>
        <div className="card">
          <div className="chart-title">จำนวนการเข้าพบรายเดือน (ครั้ง)</div>
          <div className="chart-sub">มิ.ย. – พ.ย. 2026 · พ.ย. นับถึง {today.slice(8)} พ.ย.</div>
          <BarChart data={LAST6.map((m) => ({ label: fmtMonthShort(m), sub: fmtMonth(m), value: visits.filter((v) => v.date.startsWith(m)).length }))}
            fmt={(v) => `${v} ครั้ง`} fmtAxis={(v) => `${Math.round(v)}`} ariaLabel="กราฟจำนวนการเข้าพบรายเดือน" />
        </div>
        <div className="card">
          <div className="chart-title">Feedback แยกตาม 7P (ทั้งหมด {fb.length} ประเด็น)</div>
          {fb.length ? (
            <div className="row" style={{ alignItems: 'center', marginTop: 6 }}>
              <Donut items={SEVEN_P.map((k, i) => ({ label: SEVEN_P_LABEL[k], value: fb.filter((f) => f.category === k).length, color: SERIES[i] }))} center={String(fb.length)} sub="ประเด็น" size={130} />
              <Legend items={SEVEN_P.map((k, i) => ({ label: SEVEN_P_LABEL[k], color: SERIES[i], value: String(fb.filter((f) => f.category === k).length) }))} />
            </div>
          ) : <p className="small muted">ยังไม่มี Feedback</p>}
        </div>
        <div className="card">
          <div className="chart-title">โอกาสทางธุรกิจที่เกิดจากการเข้าพบ</div>
          <table className="table" style={{ marginTop: 6 }}><tbody>
            {(Object.keys(STAGE_LABEL) as (keyof typeof STAGE_LABEL)[]).map((s) => {
              const xs = opps.filter((o) => o.stage === s);
              return <tr key={s}><td>{STAGE_LABEL[s]}</td><td className="r num">{xs.length}</td><td className="r num">{xs.length ? `≈${fmtMillion(xs.reduce((a, o) => a + (o.estimatedValue ?? 0), 0))}` : '—'}</td></tr>;
            })}
          </tbody></table>
          <p className="xs muted">มูลค่าเป็นประมาณการจากสูตรของคำแนะนำ ไม่ใช่รายได้จริง</p>
        </div>
      </div>
    </>
  );
}
