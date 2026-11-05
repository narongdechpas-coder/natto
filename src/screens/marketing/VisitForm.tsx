import { Check, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { Sentiment, SevenP, Severity, User, VisitOutcome, VisitStatus } from '../../domain/types';
import { SEVEN_P } from '../../domain/types';
import {
  OUTCOME_LABEL, SENTIMENT_LABEL, SEVEN_P_LABEL, SEVEN_P_THAI, SEVERITY_LABEL, VISIT_STATUS_LABEL, fmtDate,
} from '../../domain/labels';
import { suggest7P } from '../../engine/classify';
import { currentRecForPartner, partnerById, scopePartners } from '../../state/selectors';
import { useStore } from '../../state/store';
import { Note, PageHeader, PartnerIcon, PriorityBadge, StateView } from '../../ui/common';
import { ThaiDateInput } from '../../ui/ThaiDateInput';
import { navigate } from '../../ui/router';
import { useExplanation } from './shared';

type Rating = Sentiment | 'skip';
interface PState { rating: Rating; severity: Severity; detail: string; ai: boolean; aiPrev?: Omit<PState, 'aiPrev'> }
const EMPTY_P: Omit<PState, 'aiPrev'> = { rating: 'skip', severity: 'medium', detail: '', ai: false };
interface Action { action: string; ownerName: string; dueDate: string; p: SevenP | null }

const OWNERS = ['ตัวฉันเอง', 'ทีม Product', 'ทีม Underwriting', 'ทีม Claims', 'ทีม Operations', 'ทีม Marketing', 'ทีม Training'];
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);

export default function VisitForm({ partnerId, user, recId, planId }: { partnerId: string; user: User; recId: string | null; planId: string | null }) {
  const { data, today, saveVisit, showToast } = useStore();
  const p = partnerById(data, partnerId);
  const rec = recId ? data.recommendations.find((r) => r.id === recId) : currentRecForPartner(data, partnerId);
  const e = useExplanation(rec);
  const plan = planId ? data.visits.find((v) => v.id === planId) : undefined;
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(plan && plan.date <= today ? plan.date : today);
  const [status, setStatus] = useState<VisitStatus>('visited');
  const [outcome, setOutcome] = useState<VisitOutcome>('met_objective');
  const [summary, setSummary] = useState('');
  const [newDate, setNewDate] = useState('');
  const [ps, setPs] = useState<Record<SevenP, PState>>(() => Object.fromEntries(SEVEN_P.map((k) => [k, { ...EMPTY_P }])) as Record<SevenP, PState>);
  const [actions, setActions] = useState<Action[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState('');
  const [aiMsg, setAiMsg] = useState('');

  if (!p) return <><PageHeader title="บันทึกการเข้าพบ" /><StateView kind="empty" title="ไม่พบคู่ค้า" /></>;
  if (!scopePartners(data, user).some((x) => x.id === p.id)) return <><PageHeader title="บันทึกการเข้าพบ" /><StateView kind="error" title="ไม่มีสิทธิ์เข้าถึง" /></>;

  const rated = SEVEN_P.filter((k) => ps[k].rating !== 'skip');
  const visited = status === 'visited';
  const steps = ['บันทึกผล', 'Feedback 7P', 'สรุปและติดตาม'];

  const setP = (k: SevenP, patch: Partial<PState>) => setPs((s) => ({ ...s, [k]: { ...s[k], ...patch } }));
  const restore = (st: PState): PState => ({ ...(st.aiPrev ?? EMPTY_P), ai: false });
  const pendingAI = SEVEN_P.filter((k) => ps[k].ai);

  /**
   * AI suggestion: each category gets only the clause(s) that mention it.
   * Categories the user already set by hand are never overwritten. Re-running replaces earlier AI suggestions only.
   */
  const runAI = () => {
    const sug = suggest7P(summary);
    const manual = SEVEN_P.filter((k) => !ps[k].ai && ps[k].rating !== 'skip');
    setPs((s) => {
      const n = { ...s };
      for (const k of SEVEN_P) if (n[k].ai) n[k] = restore(n[k]); // drop previous AI suggestions
      for (const x of sug) {
        if (manual.includes(x.category)) continue;
        const prev = { ...n[x.category] };
        delete prev.aiPrev;
        n[x.category] = { ...prev, rating: x.sentiment, ai: true, detail: x.clauses.join(' / ').slice(0, 200), aiPrev: prev };
      }
      return n;
    });
    const applied = sug.filter((x) => !manual.includes(x.category));
    const skipped = sug.filter((x) => manual.includes(x.category));
    if (!sug.length) { setAiMsg('นัดโตะยังจับหมวดจากข้อความนี้ไม่ได้ กรุณาเลือกเอง'); return; }
    setAiMsg(`นัดโตะแนะนำ ${applied.length} หมวด: ${applied.map((x) => `${SEVEN_P_LABEL[x.category]} (${SENTIMENT_LABEL[x.sentiment]})`).join(', ') || '—'}`
      + (skipped.length ? ` · ข้ามหมวดที่คุณเลือกเองแล้ว: ${skipped.map((x) => SEVEN_P_LABEL[x.category]).join(', ')}` : '')
      + ' · กดเลือกระดับเพื่อยืนยัน หรือกด ✕ เพื่อปิดคำแนะนำ');
  };
  const dismissAI = (k: SevenP) => setPs((s) => ({ ...s, [k]: restore(s[k]) }));
  const dismissAllAI = () => { setPs((s) => Object.fromEntries(SEVEN_P.map((k) => [k, s[k].ai ? restore(s[k]) : s[k]])) as Record<SevenP, PState>); setAiMsg(''); };
  const acceptAllAI = () => { setPs((s) => Object.fromEntries(SEVEN_P.map((k) => [k, { ...s[k], ai: false, aiPrev: undefined }])) as Record<SevenP, PState>); setAiMsg(''); };

  const next = () => {
    setErr('');
    if (step === 0) {
      if (!date) return setErr('กรุณาเลือกวันที่เข้าพบ');
      if (date > today) return setErr('วันที่เข้าพบต้องไม่เกินวันนี้ ถ้ายังไม่ได้ไปพบ ให้บันทึกเป็นแผนเข้าพบแทน');
      if (!summary.trim()) return setErr(visited ? 'กรุณาสรุปการพูดคุย' : 'กรุณาระบุเหตุผลหรือรายละเอียด');
      if (status === 'rescheduled' && newDate && newDate < today) return setErr('วันนัดใหม่ต้องไม่ย้อนหลัง');
      if (!visited) { setStep(2); return; }
    }
    if (step === 1) {
      if (!rated.length) return setErr('กรุณาบันทึก Feedback อย่างน้อย 1 หมวด');
      const missing = rated.find((k) => ps[k].rating === 'negative' && !ps[k].detail.trim());
      if (missing) return setErr(`กรุณาระบุรายละเอียดของหมวด ${SEVEN_P_LABEL[missing]} ที่ต้องปรับ`);
      if (!actions.length) {
        setActions(rated.filter((k) => ps[k].rating === 'negative').map((k) => ({
          action: `ติดตามประเด็น ${SEVEN_P_LABEL[k]}: ${ps[k].detail.slice(0, 60)}`, ownerName: 'ตัวฉันเอง', dueDate: addDays(today, 14), p: k,
        })));
      }
    }
    setStep((s) => s + 1);
  };

  const save = () => {
    setErr('');
    const bad = actions.find((a) => !a.action.trim() || !a.dueDate);
    if (bad) return setErr('กรุณากรอก Action และวันกำหนดเสร็จให้ครบ');
    if (actions.some((a) => a.dueDate < date)) return setErr('วันกำหนดเสร็จต้องไม่ก่อนวันเข้าพบ');
    if (!confirmed) return setErr('กรุณาติ๊กยืนยันว่าตรวจสอบข้อมูลแล้ว');
    const fbKeys = visited ? rated : [];
    const id = saveVisit({
      visit: {
        id: plan?.id, partnerId: p.id, marketingId: p.ownerId, date, status, outcome: visited ? outcome : null,
        objective: plan?.objective || e?.visitObjective || 'เข้าพบคู่ค้า', summary: summary.trim(), recommendationId: rec?.id ?? null,
      },
      feedback: fbKeys.map((k) => ({
        category: k, sentiment: ps[k].rating as Sentiment, severity: ps[k].rating === 'negative' ? ps[k].severity : null,
        detail: ps[k].detail.trim() || summary.trim().slice(0, 140), productLine: null, responsibleDept: null,
      })),
      actions: actions.map((a) => ({ action: a.action.trim(), ownerName: a.ownerName, dueDate: a.dueDate, feedbackIndex: a.p ? fbKeys.indexOf(a.p) : null })),
    });
    if (status === 'rescheduled' && newDate) {
      saveVisit({ visit: { partnerId: p.id, marketingId: p.ownerId, date: newDate, status: 'planned', outcome: null, objective: plan?.objective || 'นัดใหม่หลังเลื่อน', summary: '', recommendationId: rec?.id ?? null }, feedback: [], actions: [] });
    }
    showToast('บันทึกการเข้าพบแล้ว ข้อมูลจะขึ้นใน Dashboard ของ Manager');
    navigate(`/visits/${id}?saved=1`);
  };

  return (
    <>
      <PageHeader title="บันทึกการเข้าพบ" />
      <div className="page">
        <div className="stepper" aria-label="ขั้นตอน">
          {steps.map((s, i) => (
            <div key={s} style={{ display: 'contents' }}>
              <div className={`step ${i < step ? 'done' : i === step ? 'current' : ''}`}><span className="dot">{i < step ? <Check size={16} /> : i + 1}</span>{s}</div>
              {i < steps.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        <div className="card p-card">
          <PartnerIcon type={p.type} />
          <div className="grow">
            <div className="row between"><span className="p-name">{p.name}</span>{rec && <PriorityBadge p={rec.priority} />}</div>
            <div className="small muted">{p.type} · {p.mainLine}{plan ? ` · แผนเดิม ${fmtDate(plan.date)}` : ''}</div>
          </div>
        </div>

        {step === 0 && (
          <div className="section">
            <div className="field"><label htmlFor="vdate">วันที่เข้าพบ</label><ThaiDateInput id="vdate" max={today} today={today} value={date} onChange={setDate} /></div>
            <div className="field"><label>สถานะการเข้าพบ</label>
              {(['visited', 'rescheduled', 'not_visited'] as VisitStatus[]).map((s) => (
                <button key={s} className={`option ${status === s ? 'active' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
                  <span className="badge" style={{ width: 16, height: 16, padding: 0, borderRadius: '50%', border: '2px solid var(--cobalt)', background: status === s ? 'var(--cobalt)' : '#fff' }} />
                  {VISIT_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {visited && (
              <div className="field"><label>ผลลัพธ์เทียบวัตถุประสงค์</label>
                <div className="chips">{(Object.keys(OUTCOME_LABEL) as VisitOutcome[]).map((o) => (
                  <button key={o} className={`chip ${outcome === o ? 'active' : ''}`} aria-pressed={outcome === o} onClick={() => setOutcome(o)}>{OUTCOME_LABEL[o]}</button>
                ))}</div>
              </div>
            )}
            {status === 'rescheduled' && (
              <div className="field"><label htmlFor="ndate">วันนัดใหม่ (ถ้ามี)</label><ThaiDateInput id="ndate" min={today} today={today} value={newDate} onChange={setNewDate} allowClear placeholder="ยังไม่กำหนด" /></div>
            )}
            <div className="field"><label htmlFor="sum">{visited ? 'สรุปการพูดคุย' : 'เหตุผล / รายละเอียด'}</label>
              <textarea id="sum" className="textarea" placeholder={visited ? 'เช่น Partner บอกว่าเบี้ยประเภท 1 แพงกว่าคู่แข่ง และออกกรมธรรม์ช้า' : 'เช่น Partner ขอเลื่อนเพราะติดประชุม'} value={summary} onChange={(ev) => setSummary(ev.target.value)} />
            </div>
            {e && visited && <Note>เป้าหมายจากการเตรียมเข้าพบ: {plan?.objective || e.visitObjective}</Note>}
          </div>
        )}

        {step === 1 && (
          <div className="section">
            <div className="row between">
              <h2 style={{ fontSize: 17, color: 'var(--navy)' }}>Feedback ตาม 7P</h2>
              <span className="badge good">บันทึกแล้ว {rated.length}/7</span>
            </div>
            <button className="btn secondary block sm" style={{ marginTop: 8 }} onClick={runAI}><Sparkles size={16} /> ให้นัดโตะช่วยจัดหมวดจากสรุปการพูดคุย</button>
            {aiMsg && (
              <div className="note" style={{ marginTop: 8, flexDirection: 'column', gap: 6 }} role="status">
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <Sparkles size={16} style={{ flex: 'none', marginTop: 2 }} />
                  <div className="grow">{aiMsg}</div>
                  <button className="icon-btn" style={{ width: 28, height: 28 }} aria-label="ปิดข้อความ" onClick={() => setAiMsg('')}><X size={14} /></button>
                </div>
                {pendingAI.length > 0 && (
                  <div className="row">
                    <button className="btn secondary sm" onClick={acceptAllAI}><Check size={14} /> ยอมรับทั้งหมด</button>
                    <button className="btn ghost sm" onClick={dismissAllAI}><X size={14} /> ยกเลิกคำแนะนำทั้งหมด</button>
                  </div>
                )}
              </div>
            )}
            <div className="p7-list">
              {SEVEN_P.map((k) => (
                <section key={k} className={`p7-block p7-${ps[k].rating}`} aria-label={`หมวด ${SEVEN_P_LABEL[k]}`}>
                  <div className="p7-head">
                    <div className="p7-name">
                      <b>{SEVEN_P_LABEL[k]}</b> <span className="xs muted">{SEVEN_P_THAI[k]}</span>
                      {ps[k].ai && (
                        <span className="badge info" style={{ marginLeft: 6, paddingRight: 4 }}>AI แนะนำ
                          <button onClick={() => dismissAI(k)} aria-label={`ปิดคำแนะนำ ${SEVEN_P_LABEL[k]}`} title="ปิดคำแนะนำนี้"
                            style={{ border: 0, background: 'transparent', color: 'inherit', padding: '0 2px', display: 'inline-flex', cursor: 'pointer' }}><X size={13} /></button>
                        </span>
                      )}
                    </div>
                    <div className="seg" role="radiogroup" aria-label={`ประเมิน ${SEVEN_P_LABEL[k]}`}>
                      {(['positive', 'neutral', 'negative', 'skip'] as Rating[]).map((r) => (
                        <button key={r} role="radio" aria-checked={ps[k].rating === r} className={ps[k].rating === r ? `on-${r}` : ''} onClick={() => setP(k, { rating: r, ai: false, aiPrev: undefined })}>
                          {r === 'skip' ? 'ไม่ได้คุย' : SENTIMENT_LABEL[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {ps[k].rating !== 'skip' && (
                    <div className="p7-body">
                      <label className="p7-label" htmlFor={`d-${k}`}>รายละเอียด{ps[k].rating === 'negative' ? ' (จำเป็น)' : ''}</label>
                      <textarea id={`d-${k}`} className="textarea" rows={2} style={{ minHeight: 60 }} placeholder={`Partner พูดถึงเรื่อง ${SEVEN_P_LABEL[k]} ว่าอย่างไร`}
                        value={ps[k].detail} onChange={(ev) => setP(k, { detail: ev.target.value, ai: false, aiPrev: undefined })} aria-label={`รายละเอียด ${SEVEN_P_LABEL[k]}`} />
                      {ps[k].rating === 'negative' && (
                        <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                          <span className="p7-label" style={{ margin: 0 }}>ความรุนแรง</span>
                          <div className="chips">{(['high', 'medium', 'low'] as Severity[]).map((sv) => (
                            <button key={sv} className={`chip ${ps[k].severity === sv ? 'active' : ''}`} aria-pressed={ps[k].severity === sv} onClick={() => setP(k, { severity: sv })}>{SEVERITY_LABEL[sv]}</button>
                          ))}</div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="section">
            <h2 style={{ fontSize: 17, color: 'var(--navy)' }}>การดำเนินการต่อ (Next Action)</h2>
            {actions.map((a, i) => (
              <div key={i} className="card">
                <div className="field"><label htmlFor={`a${i}`}>Action</label><input id={`a${i}`} className="input" value={a.action} onChange={(ev) => setActions(actions.map((x, j) => (j === i ? { ...x, action: ev.target.value } : x)))} /></div>
                <div className="row">
                  <div className="field grow"><label htmlFor={`o${i}`}>ผู้รับผิดชอบ</label>
                    <select id={`o${i}`} className="select" value={a.ownerName} onChange={(ev) => setActions(actions.map((x, j) => (j === i ? { ...x, ownerName: ev.target.value } : x)))}>
                      {OWNERS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="field grow"><label htmlFor={`d${i}`}>กำหนดเสร็จ</label><ThaiDateInput id={`d${i}`} min={date} today={today} value={a.dueDate} onChange={(nv) => setActions(actions.map((x, j) => (j === i ? { ...x, dueDate: nv } : x)))} /></div>
                </div>
                <button className="btn ghost sm" onClick={() => setActions(actions.filter((_, j) => j !== i))}><Trash2 size={15} /> ลบ</button>
              </div>
            ))}
            <button className="btn secondary sm" style={{ marginTop: 8 }} onClick={() => setActions([...actions, { action: '', ownerName: 'ตัวฉันเอง', dueDate: addDays(today, 14), p: null }])}><Plus size={15} /> เพิ่ม Action</button>

            <div className="card section small">
              <b>ตรวจสอบก่อนบันทึก</b>
              <div>วันที่: {fmtDate(date)} · สถานะ: {VISIT_STATUS_LABEL[status]}{visited ? ` · ${OUTCOME_LABEL[outcome]}` : ''}</div>
              {status === 'rescheduled' && newDate && <div>นัดใหม่: {fmtDate(newDate)}</div>}
              <div>สรุป: {summary}</div>
              {visited && <div>Feedback: {rated.map((k) => `${SEVEN_P_LABEL[k]} (${SENTIMENT_LABEL[ps[k].rating as Sentiment]}${ps[k].rating === 'negative' ? `, ${SEVERITY_LABEL[ps[k].severity]}` : ''})`).join(', ')}</div>}
              <div>Action: {actions.length ? `${actions.length} รายการ` : 'ไม่มี'}</div>
              <label className="row" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={confirmed} onChange={(ev) => setConfirmed(ev.target.checked)} />
                ฉันตรวจสอบข้อมูลและหมวด 7P ที่ AI แนะนำแล้ว
              </label>
            </div>
          </div>
        )}

        {err && <p className="error-text" role="alert">{err}</p>}
        <div className="row section">
          {step > 0 && <button className="btn secondary grow" onClick={() => { setErr(''); setStep(step === 2 && !visited ? 0 : step - 1); }}>ย้อนกลับ</button>}
          {step < 2 ? <button className="btn primary grow" onClick={next}>ถัดไป</button>
            : <button className="btn primary grow" onClick={save}><Check size={18} /> ตรวจสอบและบันทึก</button>}
        </div>
      </div>
    </>
  );
}
