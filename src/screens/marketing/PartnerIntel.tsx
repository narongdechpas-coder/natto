import { ArrowDown, CalendarPlus, ClipboardEdit, Lightbulb, MessageCircle, Plus, Target, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DATA_AS_OF } from '../../data/config';
import type { FuelType, User } from '../../domain/types';
import { FUEL_TYPES, PRODUCT_CATEGORIES } from '../../domain/types';
import {
  FOLLOWUP_STATUS_LABEL, FUEL_LABEL, PRODUCT_LABEL, fmtDate, fmtInt, fmtMB, fmtMillion, fmtMonth, fmtMonthShort, fmtPct, fmtPp, fmtSignedPct,
} from '../../domain/labels';
import { computePeerStats, type EngineContext } from '../../engine/signals';
import { fuelShare, productShare, renewalRate, sumOrNull, totalPremium } from '../../engine/metrics';
import {
  currentRecForPartner, isOverdue, lastVisit, openFollowUpsForPartner, partnerById, partnerKpis, scopePartners, seriesOf, userById,
} from '../../state/selectors';
import { useStore } from '../../state/store';
import { BarChart, Legend, LineChart, SERIES, ShareBar } from '../../ui/charts';
import { AsOf, Note, PageHeader, PartnerIcon, PriorityBadge, StateView, Tabs } from '../../ui/common';
import { navigate } from '../../ui/router';
import { ThaiDateInput } from '../../ui/ThaiDateInput';
import { useExplanation } from './shared';

type T = 'overview' | 'perf' | 'mix' | 'vehicle' | 'talk';
// 24-hour Thai time slots (08:00–18:00, every 30 minutes) — independent of browser locale
const TIME_SLOTS = Array.from({ length: 21 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

export default function PartnerIntel({ id, user, tab }: { id: string; user: User; tab: string | null }) {
  const { data, today, saveVisit, setTalkingPoints, overlay, showToast } = useStore();
  const p = partnerById(data, id);
  const [t, setT] = useState<T>((tab as T) || 'overview');
  const rec = currentRecForPartner(data, id);
  const e = useExplanation(rec);
  const peers = useMemo(() => {
    const ctx: EngineContext = { partners: data.partners, series: data.series, months: data.months, visits: data.visits, followUps: data.followUps };
    return computePeerStats(ctx, data.months.length - 1);
  }, [data]);
  const [fuelFilter, setFuelFilter] = useState<'all' | FuelType>('all');
  const tpKey = rec?.id ?? id;
  const baseTopics = e?.talkingPoints.map((x) => x.topic) ?? [];
  const [topics, setTopics] = useState<string[]>(overlay.talkingPoints[tpKey] ?? baseTopics);
  const [plan, setPlan] = useState({ date: '', time: '10:00', attendees: '', objective: e?.visitObjective ?? '' });
  const [planErr, setPlanErr] = useState('');

  if (!p) return <><PageHeader title="ข้อมูลคู่ค้า" /><StateView kind="empty" title="ไม่พบคู่ค้า" /></>;
  if (!scopePartners(data, user).some((x) => x.id === p.id)) {
    return <><PageHeader title="ข้อมูลคู่ค้า" /><StateView kind="error" title="ไม่มีสิทธิ์เข้าถึง" text="คู่ค้านี้ไม่อยู่ในขอบเขตข้อมูลของคุณ" /></>;
  }
  const rows = seriesOf(data, p.id);
  const readOnly = user.role !== 'marketing';
  const k = partnerKpis(data, p.id);
  const last = lastVisit(data, p.id, today);
  const openFu = openFollowUpsForPartner(data, p.id);
  const owner = userById(data, p.ownerId);
  const plannedVisit = data.visits.find((v) => v.partnerId === p.id && v.status === 'planned' && v.date >= today);

  const premData = rows.map((x) => ({ label: fmtMonthShort(x.month), sub: fmtMonth(x.month), value: totalPremium(x) }));
  const rrData = rows.map((x) => ({ label: fmtMonthShort(x.month), sub: fmtMonth(x.month), value: renewalRate(x) }));
  const rrVals = rrData.map((x) => x.value).filter((v): v is number => v != null);
  const t3 = rows.length - 1;
  const share3 = (cat: (typeof PRODUCT_CATEGORIES)[number]) => {
    const w = rows.slice(t3 - 2);
    const tot = sumOrNull(w.map(totalPremium));
    const part = sumOrNull(w.map((r) => r.premiumByProduct?.[cat] ?? null));
    return tot && part != null ? part / tot : null;
  };
  const segs = data.vehicleSegments.filter((s) => s.partnerId === p.id && (fuelFilter === 'all' || s.fuel === fuelFilter)).sort((a, b) => b.count - a.count);

  const saveTopics = (next: string[]) => { setTopics(next); setTalkingPoints(tpKey, next); };
  const savePlan = () => {
    if (!plan.date) { setPlanErr('กรุณาเลือกวันที่เข้าพบ'); return; }
    if (plan.date < today) { setPlanErr('วันที่เข้าพบต้องไม่ย้อนหลัง'); return; }
    if (!plan.objective.trim()) { setPlanErr('กรุณาระบุวัตถุประสงค์'); return; }
    saveVisit({
      visit: {
        id: plannedVisit?.id, partnerId: p.id, marketingId: p.ownerId, date: plan.date, status: 'planned', outcome: null,
        objective: plan.objective.trim(), summary: [plan.time && `เวลา ${plan.time} น.`, plan.attendees && `ผู้เข้าร่วม: ${plan.attendees}`, topics.length ? `ประเด็น: ${topics.join(' / ')}` : ''].filter(Boolean).join(' · '),
        recommendationId: rec?.id ?? null,
      },
      feedback: [], actions: [],
    });
    setPlanErr('');
    showToast('บันทึกแผนเข้าพบแล้ว (ยังไม่ได้นัดกับคู่ค้า)');
  };

  return (
    <>
      <PageHeader title="ข้อมูลคู่ค้า" />
      <div className="page">
        <div className="card p-card">
          <PartnerIcon type={p.type} />
          <div className="grow">
            <div className="row between"><span className="p-name">{p.name}</span>{rec && <PriorityBadge p={rec.priority} />}</div>
            <div className="small muted">{p.type} · พอร์ตหลัก: {p.mainLine} · {p.region}</div>
            <div className="xs muted">ผู้ดูแล: {owner.name} · อัปเดตล่าสุด {fmtDate(DATA_AS_OF)}</div>
          </div>
        </div>
        {k.missingMonths.length > 0 && (
          <div className="section"><Note tone="warn">ไม่มีข้อมูลเดือน {k.missingMonths.map(fmtMonth).join(', ')} ระบบไม่นับเป็นศูนย์ กราฟจะเว้นช่องเดือนนั้นไว้</Note></div>
        )}
        <div className="section">
          <Tabs value={t} onChange={setT} items={[
            { key: 'overview', label: 'ภาพรวม' }, { key: 'perf', label: 'Performance' }, { key: 'mix', label: 'Product Mix' },
            { key: 'vehicle', label: 'Vehicle' }, { key: 'talk', label: 'ประเด็นพูดคุย' },
          ]} />
        </div>

        {t === 'overview' && (
          <div className="section stack">
            <div className="kpi-grid two">
              <div className="kpi"><span className="l">เบี้ยประกัน YTD ({k.ytdMonths} เดือน)</span><span className="v num">{fmtMB(k.ytd)}</span><span className={`d ${(k.premMoM ?? 0) < 0 ? 'down' : 'up'}`}>{fmtSignedPct(k.premMoM)} MoM</span></div>
              <div className="kpi"><span className="l">Renewal Rate ({fmtMonthShort(k.month)})</span><span className="v num">{fmtPct(k.rr, 0)}</span><span className={`d ${(k.rrPp ?? 0) < 0 ? 'down' : 'up'}`}>{k.rrPp == null ? '—' : fmtPp(k.rrPp)} MoM</span></div>
              <div className="kpi"><span className="l">สัดส่วนประเภท 1 ({fmtMonthShort(k.month)})</span><span className="v num">{fmtPct(k.shares[0].s, 0)}</span><span className="d muted">ของเบี้ยรวม</span></div>
              <div className="kpi"><span className="l">โอกาส (ประมาณการ/ปี)</span><span className="v num">{rec?.opportunity.value != null ? `≈${fmtMB(rec.opportunity.value)}` : '—'}</span><span className="d muted">{e?.opportunity.label ?? 'ไม่มีคำแนะนำรอบนี้'}</span></div>
            </div>
            <div className="ai-box">
              <h3><Lightbulb size={16} /> การเปลี่ยนแปลงสำคัญ</h3>
              {e ? <ul>{e.reasons.slice(0, 4).map((x) => <li key={x}><ArrowDown size={15} />{x}</li>)}</ul>
                : <p className="small" style={{ margin: 0 }}>รอบนี้ไม่มีสัญญาณที่ต้องพิจารณาเป็นพิเศษ</p>}
            </div>
            <div className="card small">
              <div className="row between"><b>การเข้าพบล่าสุด</b>{last && <a href={`#/visits/${last.id}`} className="link-btn">ดูรายละเอียด</a>}</div>
              <div>{last ? `${fmtDate(last.date)} · ${last.objective}` : 'ยังไม่มีประวัติการเข้าพบ'}</div>
              {plannedVisit && <div className="muted">มีแผนเข้าพบ {fmtDate(plannedVisit.date)}</div>}
              {openFu.length > 0 && (
                <>
                  <div className="divider" />
                  <b>งานติดตามที่ยังเปิด ({openFu.length})</b>
                  {openFu.map((f) => <div key={f.id} className={isOverdue(f, today) ? 'down' : ''}>• {f.action} — {FOLLOWUP_STATUS_LABEL[f.status]} · กำหนด {fmtDate(f.dueDate)}{isOverdue(f, today) ? ' (เกินกำหนด)' : ''}</div>)}
                </>
              )}
            </div>
            <AsOf date={DATA_AS_OF} />
          </div>
        )}

        {t === 'perf' && (
          <div className="section stack">
            <div className="card">
              <div className="chart-title">เบี้ยประกันรายเดือน (ล้านบาท)</div>
              <div className="chart-sub">{fmtMonth(rows[0].month)} – {fmtMonth(rows[t3].month)}</div>
              <BarChart data={premData} fmt={(v) => fmtMillion(v, 2)} fmtAxis={(v) => (v / 1e6).toFixed(1)} ariaLabel="กราฟเบี้ยประกันรายเดือน" />
            </div>
            <div className="card">
              <div className="chart-title">Renewal Rate รายเดือน (%)</div>
              <div className="chart-sub">กรมธรรม์ที่ต่ออายุ ÷ กรมธรรม์ที่ครบกำหนด</div>
              <LineChart data={rrData} fmt={(v) => fmtPct(v)} fmtAxis={(v) => `${Math.round(v * 100)}`}
                min={Math.floor(Math.min(...rrVals) * 10) / 10 - 0.05} max={Math.min(1, Math.ceil(Math.max(...rrVals) * 10) / 10 + 0.05)} ariaLabel="กราฟ Renewal Rate" />
            </div>
            <details className="card disclose">
              <summary>ดูตารางข้อมูลรายเดือน</summary>
              <table className="table" style={{ marginTop: 6 }}>
                <thead><tr><th>เดือน</th><th className="r">เบี้ย (ลบ.)</th><th className="r">Renewal</th><th className="r">เบี้ยครบกำหนด (ลบ.)</th></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.month}><td>{fmtMonth(r.month)}</td><td className="r num">{totalPremium(r) == null ? 'ไม่มีข้อมูล' : (totalPremium(r)! / 1e6).toFixed(2)}</td>
                    <td className="r num">{fmtPct(renewalRate(r))}</td><td className="r num">{r.renewalPremiumDue == null ? '—' : (r.renewalPremiumDue / 1e6).toFixed(2)}</td></tr>
                ))}</tbody>
              </table>
            </details>
          </div>
        )}

        {t === 'mix' && (
          <div className="section stack">
            <div className="card">
              <div className="chart-title">Product Mix 3 เดือนล่าสุด เทียบค่ากลางกลุ่ม {p.type}</div>
              <div className="chart-sub">{fmtMonth(rows[t3 - 2].month)} – {fmtMonth(rows[t3].month)} · สัดส่วนจากเบี้ยประกัน</div>
              <div className="small" style={{ margin: '10px 0 4px' }}>{p.name}</div>
              <ShareBar parts={PRODUCT_CATEGORIES.map((c, i) => ({ label: PRODUCT_LABEL[c], value: share3(c) ?? 0, color: SERIES[i] }))} />
              <div className="small" style={{ margin: '10px 0 4px' }}>ค่ากลางกลุ่ม {p.type}</div>
              <ShareBar parts={PRODUCT_CATEGORIES.map((c, i) => ({ label: PRODUCT_LABEL[c], value: peers.medianShare[p.type][c], color: SERIES[i] }))} />
              <Legend items={PRODUCT_CATEGORIES.map((c, i) => ({ label: PRODUCT_LABEL[c], color: SERIES[i] }))} />
              <table className="table" style={{ marginTop: 10 }}>
                <thead><tr><th>หมวด</th><th className="r">Partner<br />3 เดือนล่าสุด</th><th className="r">ค่ากลาง<br />กลุ่ม</th><th className="r">ต่าง</th><th className="r">Partner<br />{fmtMonthShort(rows[t3 - 6].month)}</th></tr></thead>
                <tbody>{PRODUCT_CATEGORIES.map((c) => {
                  const s = share3(c); const m = peers.medianShare[p.type][c]; const prev = productShare(rows[t3 - 6], c);
                  const gap = s == null ? null : (s - m) * 100;
                  return (
                    <tr key={c}><td>{PRODUCT_LABEL[c]}</td><td className="r num">{fmtPct(s)}</td><td className="r num">{fmtPct(m)}</td>
                      <td className={`r num ${gap != null && gap <= -5 ? 'down' : ''}`}>{gap == null ? '—' : fmtPp(gap)}</td><td className="r num">{fmtPct(prev)}</td></tr>
                  );
                })}</tbody>
              </table>
              <p className="xs muted">คอลัมน์สุดท้ายคือสัดส่วนของเดือน {fmtMonth(rows[t3 - 6].month)} เดือนเดียว ใช้ดูทิศทาง · กลุ่มเปรียบเทียบ = Partner ประเภทเดียวกันทั้งหมดในระบบ (รอยืนยันเกณฑ์ peer group)</p>
            </div>
          </div>
        )}

        {t === 'vehicle' && (
          <div className="section stack">
            <div className="card">
              <div className="chart-title">สัดส่วนประเภทเชื้อเพลิง (จำนวนคัน)</div>
              {[t3 - 6, t3].map((i) => (
                <div key={i}>
                  <div className="small" style={{ margin: '10px 0 4px' }}>{fmtMonth(rows[i].month)}</div>
                  {rows[i].vehiclesByFuel ? <ShareBar parts={FUEL_TYPES.map((f, j) => ({ label: FUEL_LABEL[f], value: rows[i].vehiclesByFuel![f], color: SERIES[j] }))} /> : <span className="xs muted">ไม่มีข้อมูล</span>}
                </div>
              ))}
              <Legend items={FUEL_TYPES.map((f, j) => ({ label: FUEL_LABEL[f], color: SERIES[j], value: fmtPct(fuelShare(rows[t3], f), 0) }))} />
            </div>
            <div className="card">
              <div className="chart-title">สัดส่วนรถ EV รายเดือน (%)</div>
              <LineChart data={rows.map((x) => ({ label: fmtMonthShort(x.month), sub: fmtMonth(x.month), value: fuelShare(x, 'EV') }))}
                fmt={(v) => fmtPct(v)} fmtAxis={(v) => `${Math.round(v * 100)}`} min={0}
                max={Math.max(0.1, Math.ceil(Math.max(...rows.map((x) => fuelShare(x, 'EV') ?? 0)) * 10) / 10)} color="var(--s3)" ariaLabel="กราฟสัดส่วนรถ EV" />
            </div>
            <div className="card">
              <div className="row between"><div className="chart-title">พอร์ตรถตามรุ่น ({fmtMonth(rows[t3].month)})</div>
                <select className="select" style={{ width: 'auto', minHeight: 34, padding: '4px 8px' }} value={fuelFilter} onChange={(ev) => setFuelFilter(ev.target.value as typeof fuelFilter)} aria-label="กรองเชื้อเพลิง">
                  <option value="all">ทุกเชื้อเพลิง</option>{FUEL_TYPES.map((f) => <option key={f} value={f}>{FUEL_LABEL[f]}</option>)}
                </select>
              </div>
              <table className="table" style={{ marginTop: 6 }}>
                <thead><tr><th>Make / Model</th><th>ปีรถ</th><th>CC</th><th className="r">คัน</th></tr></thead>
                <tbody>{segs.slice(0, 12).map((s, i) => (
                  <tr key={i}><td>{s.make} {s.model}<div className="xs muted">{FUEL_LABEL[s.fuel]}</div></td><td>{s.yearBand}</td><td>{s.ccBand}</td><td className="r num">{fmtInt(s.count)}</td></tr>
                ))}</tbody>
              </table>
              {segs.length > 12 && <p className="xs muted">แสดง 12 จาก {segs.length} กลุ่ม</p>}
              {!segs.length && <p className="small muted">ไม่มีข้อมูลรถในกลุ่มนี้</p>}
            </div>
          </div>
        )}

        {t === 'talk' && (
          <div className="section stack">
            {e && e.talkingPoints.length ? e.talkingPoints.map((tp, i) => (
              <div key={tp.topic} className="card">
                <div className="row"><span className="badge info">ประเด็นที่ {i + 1}</span><b className="grow">{tp.topic}</b></div>
                <div className="small" style={{ marginTop: 6 }}><span className="muted">สัญญาณ:</span> {tp.signalText}</div>
                <div className="small"><span className="muted">นัยสำคัญ:</span> {tp.insight}</div>
                <div className="small" style={{ marginTop: 6 }}><b><MessageCircle size={14} style={{ verticalAlign: -2 }} /> คำถามแนะนำ</b></div>
                <ul className="small" style={{ margin: '2px 0', paddingLeft: 18 }}>{tp.questions.map((q) => <li key={q}>{q}</li>)}</ul>
                <div className="small"><Target size={14} style={{ verticalAlign: -2 }} /> <span className="muted">เป้าหมายการเข้าพบ:</span> {tp.objective}</div>
              </div>
            )) : <div className="card"><StateView kind="empty" title="รอบนี้ไม่มีประเด็นที่ระบบแนะนำ" text="คุณเพิ่มประเด็นที่ต้องการคุยเองได้ด้านล่าง" /></div>}

            {readOnly && <div className="note">มุมมองของ {user.role === 'manager' ? 'Manager' : 'ผู้บริหาร'} อ่านอย่างเดียว การเตรียมเข้าพบและบันทึกผลทำโดย Marketing ผู้ดูแล</div>}
            {!readOnly && <>
            <div className="card">
              <div className="row between"><div className="chart-title"><ClipboardEdit size={15} style={{ verticalAlign: -2 }} /> ประเด็นที่จะคุย (แก้ไขได้)</div></div>
              <p className="xs muted" style={{ marginTop: 2 }}>นัดโตะอาจไม่รู้บริบทล่าสุดของความสัมพันธ์ ปรับให้ตรงกับสถานการณ์จริงได้</p>
              {topics.map((tp, i) => (
                <div key={i} className="row" style={{ marginBottom: 6 }}>
                  <input className="input" value={tp} aria-label={`ประเด็นที่ ${i + 1}`} onChange={(ev) => saveTopics(topics.map((x, j) => (j === i ? ev.target.value : x)))} />
                  <button className="icon-btn" aria-label="ลบประเด็น" onClick={() => saveTopics(topics.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                </div>
              ))}
              <div className="row">
                <button className="btn secondary sm" onClick={() => saveTopics([...topics, ''])}><Plus size={15} /> เพิ่มประเด็น</button>
                {overlay.talkingPoints[tpKey] && <button className="btn ghost sm" onClick={() => saveTopics(baseTopics)}>คืนค่าที่ระบบแนะนำ</button>}
              </div>
            </div>

            <div className="card" style={{ background: 'var(--cream)' }}>
              <div className="chart-title"><CalendarPlus size={15} style={{ verticalAlign: -2 }} /> แผนการเข้าพบ</div>
              {plannedVisit && <p className="small" style={{ margin: '4px 0' }}>มีแผนอยู่แล้ว: {fmtDate(plannedVisit.date)} · {plannedVisit.objective} (บันทึกใหม่จะทับแผนเดิม)</p>}
              <div className="row" style={{ marginTop: 8 }}>
                <div className="field grow"><label htmlFor="pdate">วันที่</label><ThaiDateInput id="pdate" min={today} today={today} value={plan.date} onChange={(nv) => setPlan({ ...plan, date: nv })} /></div>
                <div className="field" style={{ width: 130 }}><label htmlFor="ptime">เวลา</label>
                  <select id="ptime" className="select" value={plan.time} onChange={(ev) => setPlan({ ...plan, time: ev.target.value })}>
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t} น.</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label htmlFor="patt">ผู้เข้าร่วม</label><input id="patt" className="input" placeholder="เช่น Marketing, UW, Product" value={plan.attendees} onChange={(ev) => setPlan({ ...plan, attendees: ev.target.value })} /></div>
              <div className="field"><label htmlFor="pobj">วัตถุประสงค์</label><textarea id="pobj" className="textarea" style={{ minHeight: 64 }} value={plan.objective} onChange={(ev) => setPlan({ ...plan, objective: ev.target.value })} /></div>
              {planErr && <p className="error-text" role="alert">{planErr}</p>}
              <button className="btn secondary block" onClick={savePlan}>บันทึกแผนเข้าพบ</button>
              <p className="xs muted" style={{ textAlign: 'center', marginBottom: 0 }}>บันทึกเป็นแผนของคุณเท่านั้น นัดโตะไม่ได้นัดกับคู่ค้าให้</p>
            </div>
            </>}
          </div>
        )}

        {!readOnly && <div className="section">
          <button className="btn primary block" onClick={() => navigate(`/visit/new/${p.id}${rec ? `?rec=${rec.id}` : ''}${plannedVisit ? `${rec ? '&' : '?'}plan=${plannedVisit.id}` : ''}`)}>
            บันทึกผลการเข้าพบ
          </button>
        </div>}
      </div>
    </>
  );
}
