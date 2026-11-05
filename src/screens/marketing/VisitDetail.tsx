import { CheckCircle2, Circle, Clock, FileText } from 'lucide-react';
import { useState } from 'react';
import type { FollowUpStatus, User } from '../../domain/types';
import {
  FOLLOWUP_STATUS_LABEL, OUTCOME_LABEL, SENTIMENT_LABEL, SEVEN_P_LABEL, SEVEN_P_THAI, SEVERITY_LABEL, VISIT_STATUS_LABEL, fmtDate,
} from '../../domain/labels';
import { SEVEN_P } from '../../domain/types';
import { followUpsOfVisit, isOverdue, partnerById, scopePartners, userById } from '../../state/selectors';
import { useStore } from '../../state/store';
import { MASCOTS, PageHeader, PartnerIcon, StateView, Tabs } from '../../ui/common';
import { navigate, useRoute } from '../../ui/router';
import { TrackBadge } from './History';

type T = 'summary' | 'feedback' | 'plan';

export default function VisitDetail({ id, user }: { id: string; user: User }) {
  const { data, today, setFollowUpStatus, showToast } = useStore();
  const [tab, setTab] = useState<T>('summary');
  const saved = useRoute().query.get('saved') === '1';
  const v = data.visits.find((x) => x.id === id);
  if (!v) return <><PageHeader title="รายละเอียดการเข้าพบ" backTo="/visits" /><StateView kind="empty" title="ไม่พบรายการนี้" /></>;
  const p = partnerById(data, v.partnerId)!;
  if (!scopePartners(data, user).some((x) => x.id === p.id)) return <><PageHeader title="รายละเอียดการเข้าพบ" /><StateView kind="error" title="ไม่มีสิทธิ์เข้าถึง" /></>;
  const fb = data.feedback.filter((f) => f.visitId === v.id);
  const fus = followUpsOfVisit(data, v.id);
  const canEdit = user.role === 'marketing';
  const update = (fid: string, s: FollowUpStatus) => { setFollowUpStatus(fid, s); showToast(`อัปเดตสถานะเป็น "${FOLLOWUP_STATUS_LABEL[s]}"`); };

  return (
    <>
      <PageHeader title="รายละเอียดการเข้าพบ" backTo="/visits" />
      <div className="page">
        {saved && (
          <div className="card row" style={{ background: 'var(--green-soft)', marginBottom: 10 }}>
            <img src={MASCOTS.success} alt="" style={{ width: 64 }} />
            <div className="grow small"><b>บันทึกการเข้าพบเรียบร้อย</b><div>Feedback และงานติดตามจะขึ้นใน Dashboard ของ Manager และผู้บริหาร</div></div>
          </div>
        )}
        <div className="card p-card">
          <PartnerIcon type={p.type} />
          <div className="grow">
            <div className="row between"><a className="p-name" href={`#/partner/${p.id}`} style={{ textDecoration: 'none' }}>{p.name}</a><TrackBadge v={v} /></div>
            <div className="small muted">ประเภท: {p.type} · ผลิตภัณฑ์หลัก: {p.mainLine}</div>
          </div>
        </div>
        <div className="section"><Tabs value={tab} onChange={setTab} items={[{ key: 'summary', label: 'สรุปการเข้าพบ' }, { key: 'feedback', label: 'Feedback 7P' }, { key: 'plan', label: 'แผนติดตาม' }]} /></div>

        {tab === 'summary' && (
          <div className="card section small stack">
            <div><span className="muted">วันที่:</span> {fmtDate(v.date)}</div>
            <div><span className="muted">สถานะ:</span> {VISIT_STATUS_LABEL[v.status]}{v.outcome ? ` · ${OUTCOME_LABEL[v.outcome]}` : ''}</div>
            <div><span className="muted">ผู้บันทึก:</span> {userById(data, v.marketingId).name}</div>
            <div><span className="muted">วัตถุประสงค์:</span> {v.objective}</div>
            <div><span className="muted">สรุปการพูดคุย:</span> {v.summary || '—'}</div>
            {v.recommendationId && <div><span className="muted">มาจากคำแนะนำ:</span> <a href={`#/recs/${v.recommendationId}`}>ดูคำแนะนำ</a></div>}
            {/* PDF only for visits that actually happened and have a recorded result */}
            {canEdit && v.status === 'visited' && <a className="btn secondary block" href={`#/summary/${p.id}`}><FileText size={17} /> สรุปการเข้าพบ {p.name} (PDF)</a>}
            {v.status === 'planned' && canEdit && (
              <button className="btn primary block" onClick={() => navigate(`/visit/new/${p.id}?plan=${v.id}${v.recommendationId ? `&rec=${v.recommendationId}` : ''}`)}>บันทึกผลการเข้าพบ</button>
            )}
          </div>
        )}

        {tab === 'feedback' && (
          <div className="card section" style={{ padding: '4px 12px' }}>
            {fb.length === 0 && <StateView kind="empty" title="ไม่มี Feedback" text={v.status === 'visited' ? 'การเข้าพบนี้ไม่ได้บันทึก Feedback' : 'ยังไม่ได้เข้าพบ'} />}
            {fb.length > 0 && SEVEN_P.map((k) => {
              const f = fb.find((x) => x.category === k);
              return (
                <div key={k} className="p7-row" style={{ alignItems: 'start' }}>
                  <div>
                    <b className="small">{SEVEN_P_LABEL[k]}</b> <span className="xs muted">({SEVEN_P_THAI[k]})</span>
                    {f && <div className="small">{f.detail}</div>}
                  </div>
                  {f ? <span className={`badge ${f.sentiment === 'negative' ? 'bad' : f.sentiment === 'positive' ? 'good' : 'warn'}`}>
                    {SENTIMENT_LABEL[f.sentiment]}{f.severity ? ` · ${SEVERITY_LABEL[f.severity]}` : ''}</span> : <span className="xs muted">ไม่ได้คุย</span>}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'plan' && (
          <div className="section stack">
            {fus.length === 0 && <StateView kind="empty" title="ไม่มีงานติดตาม" />}
            {fus.map((f) => (
              <div key={f.id} className="card small">
                <div className="row">
                  {f.status === 'done' ? <CheckCircle2 size={18} color="var(--green)" /> : f.status === 'in_progress' ? <Clock size={18} color="var(--amber)" /> : <Circle size={18} color="var(--ink-3)" />}
                  <b className="grow">{f.action}</b>
                </div>
                <div className="muted" style={{ marginTop: 4 }}>ผู้รับผิดชอบ: {f.ownerName} · กำหนด {fmtDate(f.dueDate)}
                  {isOverdue(f, today) && <span className="badge bad" style={{ marginLeft: 6 }}>เกินกำหนด</span>}</div>
                <div className="row" style={{ marginTop: 6 }}>
                  <span className={`badge ${f.status === 'done' ? 'good' : f.status === 'in_progress' ? 'warn' : 'neutral'}`}>{FOLLOWUP_STATUS_LABEL[f.status]}</span>
                  {canEdit && f.status !== 'done' && (
                    <>
                      {f.status === 'open' && <button className="btn ghost sm" onClick={() => update(f.id, 'in_progress')}>เริ่มดำเนินการ</button>}
                      <button className="btn secondary sm" onClick={() => update(f.id, 'done')}>ทำเสร็จแล้ว</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
