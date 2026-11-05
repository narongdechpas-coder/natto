import { Download, Loader2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { DATA_AS_OF } from '../../data/config';
import type { User } from '../../domain/types';
import {
  FOLLOWUP_STATUS_LABEL, OUTCOME_LABEL, PRIORITY_LABEL, SENTIMENT_LABEL, SEVEN_P_LABEL, SEVEN_P_THAI, SEVERITY_LABEL,
  VISIT_STATUS_LABEL, fmtDate, fmtMB, fmtMonthShort, fmtPct, fmtPp, fmtSignedPct,
} from '../../domain/labels';
import { scopePartners } from '../../state/selectors';
import { MAX_ACTION_ROWS, buildPartnerSummary } from '../../state/summary';
import { useStore } from '../../state/store';
import { PageHeader, StateView } from '../../ui/common';
import { A4_PX, exportA4Pdf } from '../../ui/exportPdf';
import { useExplanation } from './shared';

const sentClass = (s: string) => (s === 'negative' ? 'neg' : s === 'positive' ? 'pos' : 'neu');

/** Visit summary per Partner (Marketing only) laid out on one A4 portrait page, exportable to PDF. */
export default function VisitSummary({ partnerId, user }: { partnerId: string; user: User }) {
  const { data, today, showToast } = useStore();
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(1);
  const [fit, setFit] = useState(1);
  const [busy, setBusy] = useState(false);
  const s = buildPartnerSummary(data, partnerId, today);
  const e = useExplanation(s?.rec);

  // Preview scale (sheet → screen width) and fit-to-page scale (content → one A4 page)
  useLayoutEffect(() => {
    const measure = () => {
      if (wrapRef.current) setPreview(Math.min(1, wrapRef.current.clientWidth / A4_PX.w));
      const c = contentRef.current;
      // scrollHeight is the untransformed layout height at the current (compensated) width; converges in 1–2 passes
      // keep a small safety margin so tiny text-metric differences in the PDF renderer cannot push content off the page
      if (c) setFit((f) => { const next = Math.min(1, (A4_PX.h - 12) / c.scrollHeight); return Math.abs(next - f) > 0.005 ? next : f; });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s?.visits.length, s?.openActions.length]);

  if (user.role !== 'marketing') return <><PageHeader title="สรุปการเข้าพบ" /><StateView kind="error" title="สำหรับ Marketing เท่านั้น" text="สรุปการเข้าพบรายเจ้าเป็นเครื่องมือของ Marketing ผู้ดูแลคู่ค้า" /></>;
  if (!s) return <><PageHeader title="สรุปการเข้าพบ" /><StateView kind="empty" title="ไม่พบคู่ค้า" /></>;
  if (!scopePartners(data, user).some((x) => x.id === partnerId)) return <><PageHeader title="สรุปการเข้าพบ" /><StateView kind="error" title="ไม่มีสิทธิ์เข้าถึง" text="คู่ค้านี้ไม่อยู่ในความดูแลของคุณ" /></>;

  const p = s.partner;
  const k = s.kpis;
  const filename = `NATTO-Visit-Summary-${p.name.replace(/\s+/g, '-')}-${today}.pdf`;
  const download = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      await exportA4Pdf(sheetRef.current, filename, `สรุปการเข้าพบ ${p.name}`);
      showToast('ดาวน์โหลด PDF แล้ว (A4 แนวตั้ง 1 หน้า)');
    } catch {
      showToast('สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="สรุปการเข้าพบ" backTo={`/partner/${p.id}`} />
      <div className="page">
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="grow small muted">ตัวอย่างเอกสาร A4 แนวตั้ง 1 หน้า · {p.name}</div>
          <button className="btn primary sm" onClick={download} disabled={busy} aria-busy={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Download size={16} />} {busy ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
          </button>
        </div>
        <div ref={wrapRef} className="a4-wrap" style={{ height: A4_PX.h * preview }}>
          <div style={{ transform: `scale(${preview})`, transformOrigin: 'top left', width: A4_PX.w }}>
            <div ref={sheetRef} className="a4" aria-label={`เอกสารสรุปการเข้าพบ ${p.name}`}>
              <div ref={contentRef} className="a4-content" style={{ transform: `scale(${fit})`, width: `${100 / fit}%` }}>
                <header className="a4-head">
                  <div>
                    <div className="a4-brand">นัด<span>โตะ</span> <small>NATTO</small></div>
                    <div className="a4-doc">สรุปการเข้าพบคู่ค้า (Visit Summary)</div>
                  </div>
                  <div className="a4-meta">
                    <span className="a4-demo">DEMO DATA · ข้อมูลจำลอง</span>
                    <div>จัดทำ {fmtDate(today)} · โดย {user.name}</div>
                    <div>ข้อมูลผลงานรายเดือน ณ {fmtDate(DATA_AS_OF)}</div>
                  </div>
                </header>

                <section className="a4-partner">
                  <div>
                    <h1>{p.name}</h1>
                    <div className="a4-sub">{p.type} · พอร์ตหลัก {p.mainLine} · {p.region} · ผู้ดูแล {s.owner}</div>
                  </div>
                  <div className="a4-rec">
                    {s.rec && e ? (<>
                      <span className={`a4-pri ${s.rec.priority}`}>ความสำคัญ{PRIORITY_LABEL[s.rec.priority]}</span>
                      <div><b>คำแนะนำรอบปัจจุบัน:</b> {e.headline}</div>
                    </>) : <div className="a4-muted">รอบนี้ไม่มีคำแนะนำจากนัดโตะ</div>}
                  </div>
                </section>

                <section className="a4-kpis">
                  <div><span>เบี้ยประกัน YTD ({k.ytdMonths} เดือน)</span><b>{fmtMB(k.ytd)}</b></div>
                  <div><span>เบี้ยประกัน {fmtMonthShort(k.month)} เทียบเดือนก่อน</span><b>{fmtMB(k.prem, 2)}</b><em className={(k.premMoM ?? 0) < 0 ? 'neg' : 'pos'}>{fmtSignedPct(k.premMoM)}</em></div>
                  <div><span>Renewal Rate {fmtMonthShort(k.month)}</span><b>{fmtPct(k.rr)}</b><em className={(k.rrPp ?? 0) < 0 ? 'neg' : 'pos'}>{k.rrPp == null ? '—' : fmtPp(k.rrPp)}</em></div>
                  <div><span>การเข้าพบทั้งหมดในระบบ</span><b>{s.counts.visited} ครั้ง</b><em>เลื่อน {s.counts.rescheduled} · ไม่ได้พบ {s.counts.notVisited}</em></div>
                </section>

                <div className="a4-cols">
                  <section className="a4-box">
                    <h2>การเข้าพบล่าสุด</h2>
                    {s.latest ? (<>
                      <div className="a4-line"><b>{fmtDate(s.latest.date)}</b> · {s.latest.outcome ? OUTCOME_LABEL[s.latest.outcome] : VISIT_STATUS_LABEL[s.latest.status]}</div>
                      <div className="a4-line"><span className="a4-muted">วัตถุประสงค์:</span> {s.latest.objective}</div>
                      <div className="a4-line"><span className="a4-muted">สรุปการพูดคุย:</span> {s.latest.summary || '—'}</div>
                      <div className="a4-line" style={{ marginTop: 6 }}><span className="a4-muted">Feedback ครั้งนี้:</span></div>
                      {s.latestFeedback.length ? (
                        <ul className="a4-list">{s.latestFeedback.map((f) => (
                          <li key={f.id}><span className={`a4-tag ${sentClass(f.sentiment)}`}>{SEVEN_P_LABEL[f.category]} · {SENTIMENT_LABEL[f.sentiment]}{f.severity ? ` · ${SEVERITY_LABEL[f.severity]}` : ''}</span> {f.detail}</li>
                        ))}</ul>
                      ) : <div className="a4-muted">ไม่มี Feedback</div>}
                    </>) : <div className="a4-muted">ยังไม่มีการเข้าพบที่บันทึกผล</div>}
                  </section>
                  <section className="a4-box">
                    <h2>Feedback แยกตาม 7P (ทั้งหมด {s.counts.feedback} ประเด็น)</h2>
                    <table className="a4-table">
                      <thead><tr><th>หมวด</th><th className="r">ทั้งหมด</th><th className="r">ต้องปรับ</th><th>ล่าสุด</th></tr></thead>
                      <tbody>{s.sevenP.map((x) => (
                        <tr key={x.key}>
                          <td style={{ whiteSpace: 'nowrap' }} title={SEVEN_P_THAI[x.key]}>{SEVEN_P_LABEL[x.key]}</td>
                          <td className="r">{x.total || '—'}</td>
                          <td className={`r ${x.negative ? 'neg' : ''}`}>{x.total ? x.negative : '—'}</td>
                          <td>{x.latest ? <span className={`a4-tag ${sentClass(x.latest.sentiment)}`}>{SENTIMENT_LABEL[x.latest.sentiment]}</span> : <span className="a4-muted">ไม่ได้คุย</span>}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </section>
                </div>

                <section className="a4-box">
                  <h2>ประวัติการเข้าพบ{s.visits.length > s.shownVisits.length ? ` (${s.shownVisits.length} ครั้งล่าสุดจาก ${s.visits.length})` : ''}</h2>
                  {s.shownVisits.length ? (
                    <table className="a4-table">
                      <thead><tr><th style={{ width: 92 }}>วันที่</th><th style={{ width: 110 }}>สถานะ / ผล</th><th>วัตถุประสงค์</th><th style={{ width: 200 }}>Feedback 7P</th></tr></thead>
                      <tbody>{s.shownVisits.map((v) => {
                        const tags = data.feedback.filter((f) => f.visitId === v.id);
                        return (
                          <tr key={v.id}>
                            <td>{fmtDate(v.date)}</td>
                            <td>{v.outcome ? OUTCOME_LABEL[v.outcome] : VISIT_STATUS_LABEL[v.status]}</td>
                            <td>{v.objective}</td>
                            <td>{tags.length ? tags.map((f) => <span key={f.id} className={`a4-tag ${sentClass(f.sentiment)}`}>{SEVEN_P_LABEL[f.category]}</span>) : <span className="a4-muted">—</span>}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  ) : <div className="a4-muted">ยังไม่มีประวัติการเข้าพบ</div>}
                </section>

                <section className="a4-box">
                  <h2>งานติดตามที่ยังเปิด ({s.openActions.length}{s.openActions.length > MAX_ACTION_ROWS ? ` · แสดง ${MAX_ACTION_ROWS} รายการเร่งด่วนที่สุด` : ''}) · เสร็จแล้ว {s.doneActions} รายการ</h2>
                  {s.openActions.length ? (
                    <table className="a4-table">
                      <thead><tr><th>Action</th><th style={{ width: 130 }}>ผู้รับผิดชอบ</th><th style={{ width: 92 }}>กำหนดเสร็จ</th><th style={{ width: 110 }}>สถานะ</th></tr></thead>
                      <tbody>{s.openActions.slice(0, MAX_ACTION_ROWS).map((f) => (
                        <tr key={f.id}>
                          <td>{f.action}</td><td>{f.ownerName}</td><td>{fmtDate(f.dueDate)}</td>
                          <td className={f.overdue ? 'neg' : ''}>{f.overdue ? 'เกินกำหนด' : FOLLOWUP_STATUS_LABEL[f.status]}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  ) : <div className="a4-muted">ไม่มีงานติดตามค้าง</div>}
                </section>

                <section className="a4-next">
                  <b>การเข้าพบครั้งถัดไป:</b>{' '}
                  {s.nextPlan ? `${fmtDate(s.nextPlan.date)} · ${s.nextPlan.objective}` : 'ยังไม่มีแผนเข้าพบครั้งถัดไป'}
                  {e && e.talkingPoints.length > 0 && <div><b>ประเด็นที่นัดโตะแนะนำ:</b> {e.talkingPoints.map((t) => t.topic).join(' · ')}</div>}
                </section>

                <footer className="a4-foot">
                  <span>จัดทำจากนัดโตะ (NATTO) · ข้อมูลจำลองเพื่อการสาธิต ไม่ใช่ข้อมูลจริง · ตัวเลขเบี้ยและ Renewal มาจากข้อมูลรายเดือนชุดเดียวกับแอป</span>
                  <span>หน้า 1/1</span>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
