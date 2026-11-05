import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DecisionReason, DecisionType, Recommendation } from '../../domain/types';
import {
  DECISION_LABEL, DECISION_REASON_LABEL, OPPORTUNITY_LABEL, fmtMillion,
} from '../../domain/labels';
import { explain } from '../../engine/explain';
import { renewalRate, totalPremium, fuelShare } from '../../engine/metrics';
import { decisionFor, partnerById, seriesOf, type Data } from '../../state/selectors';
import { useStore } from '../../state/store';
import { Sparkline } from '../../ui/charts';
import { PartnerIcon, PriorityBadge, Sheet } from '../../ui/common';

export function overdueAtIssue(d: Data, r: Recommendation) {
  const issue = `${r.batchMonth}-01`;
  const ids = new Set(d.visits.filter((v) => v.partnerId === r.partnerId).map((v) => v.id));
  return d.followUps.filter((f) => ids.has(f.visitId) && f.createdDate < issue && f.dueDate < issue && !(f.completedDate && f.completedDate < issue));
}

export function useExplanation(r: Recommendation | undefined) {
  const { data } = useStore();
  return useMemo(() => {
    if (!r) return null;
    const p = partnerById(data, r.partnerId)!;
    return explain(r, p, overdueAtIssue(data, r));
  }, [r, data]);
}

/** Series that best illustrates the primary signal (for sparkline / evidence chart). */
export function primarySeries(d: Data, r: Recommendation) {
  const rows = seriesOf(d, r.partnerId);
  if (r.primarySignal === 'renewal') return { label: 'Renewal Rate', values: rows.map(renewalRate) };
  if (r.primarySignal === 'segment') return { label: 'สัดส่วนรถ EV', values: rows.map((x) => fuelShare(x, 'EV')) };
  return { label: 'เบี้ยประกัน', values: rows.map(totalPremium) };
}

export function decisionBadge(dec: DecisionType | undefined) {
  if (!dec) return <span className="badge neutral">ยังไม่ดำเนินการ</span>;
  const tone = dec === 'prepare' || dec === 'plan_contact' ? 'info' : 'neutral';
  return <span className={`badge ${tone}`}>{DECISION_LABEL[dec]}</span>;
}

export function RecCard({ r, compact }: { r: Recommendation; compact?: boolean }) {
  const { data } = useStore();
  const p = partnerById(data, r.partnerId)!;
  const e = useExplanation(r)!;
  const s = primarySeries(data, r);
  const dec = decisionFor(data, r.id)?.decision;
  const down = r.primarySignal === 'renewal' || r.primarySignal === 'sales';
  return (
    <a className="card p-card" href={`#/recs/${r.id}`} aria-label={`${p.name} ความสำคัญ ${r.priority}`}>
      <PartnerIcon type={p.type} />
      <div className="grow">
        <div className="row between">
          <span className="p-name ellipsis">{p.name}</span>
          <PriorityBadge p={r.priority} />
        </div>
        <div className="reason">{e.headline}</div>
        {!compact && (
          <div className="row between" style={{ marginTop: 4 }}>
            <span className="xs muted">
              {r.opportunity.value != null ? `${OPPORTUNITY_LABEL[r.opportunity.type]} ≈ ${fmtMillion(r.opportunity.value)}/ปี (ประมาณการ)` : OPPORTUNITY_LABEL[r.opportunity.type]}
            </span>
          </div>
        )}
        {!compact && (
          <div className="row between" style={{ marginTop: 6 }}>
            {decisionBadge(dec)}
            <span title={s.label}><Sparkline values={s.values.slice(-6)} down={down} /></span>
          </div>
        )}
        {compact && r.opportunity.value != null && (
          <div className="xs muted">โอกาสโดยประมาณ ≈ {fmtMillion(r.opportunity.value)}/ปี</div>
        )}
      </div>
      <ChevronRight size={18} className="muted" />
    </a>
  );
}

const REASONS: DecisionReason[] = ['recently_visited', 'already_discussed', 'partner_not_ready', 'relationship_context', 'data_mismatch', 'other'];

export function DecisionSheet({ open, onClose, rec, kind }: { open: boolean; onClose: () => void; rec: Recommendation; kind: 'not_now' | 'not_relevant' }) {
  const { decide, showToast } = useStore();
  const [reason, setReason] = useState<DecisionReason | null>(null);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (!reason) { setErr('กรุณาเลือกเหตุผล'); return; }
    if (reason === 'other' && !comment.trim()) { setErr('กรุณาระบุรายละเอียดเพิ่มเติม'); return; }
    decide({ recommendationId: rec.id, decision: kind, reason, comment: comment.trim() || null });
    showToast(`บันทึก "${DECISION_LABEL[kind]}" แล้ว ข้อมูลนี้ใช้ปรับปรุงคุณภาพคำแนะนำ`);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={kind === 'not_now' ? 'ไม่ใช่ตอนนี้ เพราะอะไร' : 'ไม่เกี่ยวข้อง เพราะอะไร'}>
      {REASONS.map((x) => (
        <button key={x} className={`option ${reason === x ? 'active' : ''}`} onClick={() => { setReason(x); setErr(''); }} aria-pressed={reason === x}>
          {DECISION_REASON_LABEL[x]}
        </button>
      ))}
      <div className="field">
        <label htmlFor="dcomment">รายละเอียดเพิ่มเติม{reason === 'other' ? ' (จำเป็น)' : ' (ถ้ามี)'}</label>
        <textarea id="dcomment" className="textarea" style={{ minHeight: 70 }} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      {err && <p className="error-text" role="alert">{err}</p>}
      <div className="row">
        <button className="btn secondary grow" onClick={onClose}>ยกเลิก</button>
        <button className="btn primary grow" onClick={submit}>บันทึก</button>
      </div>
    </Sheet>
  );
}
