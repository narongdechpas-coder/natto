// Booth deck: product pitch for prospective users at a tech event. Numbers come from the demo dataset
// (synthetic, labelled) or from the visitor's own inputs in the ROI calculator — no invented claims.
import {
  BarChart3, CalendarCheck, ClipboardList, Clock, Compass, Eye, FileSearch, Layers, MessageSquareText, NotebookPen,
  RotateCcw, ShieldCheck, Smartphone, Sparkles, Target, TrendingUp, Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildDemoData } from '../../data/dataset';
import { DEMO_TODAY } from '../../data/config';
import { SEVEN_P } from '../../domain/types';
import { PRIORITY_LABEL, SEVEN_P_LABEL, fmtMillion, fmtMonthShort, fmtPct, fmtPp } from '../../domain/labels';
import { suggest7P } from '../../engine/classify';
import { explain } from '../../engine/explain';
import { renewalRate } from '../../engine/metrics';
import { feedbackBy7P, statsFor, visitsByMonth } from '../../state/mgmt';
import { SERIES } from '../../ui/charts';
import { DeckView, type Slide } from '../DeckView';
import { CountUp, DrawDonut, DrawLine, Reveal, Typewriter } from './anim';
import { RoiCalculator } from './RoiCalculator';

const IMG = './deck/';
const MASCOT = './assets/';
const DEMO_URL = 'narongdechpas-coder.github.io/natto';
const NOTE_7P = 'ความคุ้มครองเราน้อยกว่าเมื่อเทียบกับคู่แข่ง เวลาในการให้บริการเราช้ากว่า ควรเพิ่มช่องทางการสื่อสารให้มากกว่านี้';

function useBoothData() {
  return useMemo(() => {
    const d = buildDemoData();
    const nov = d.recommendations.filter((r) => r.batchMonth === '2026-11').sort((a, b) => b.score - a.score);
    const top = nov.slice(0, 5).map((r) => {
      const p = d.partners.find((x) => x.id === r.partnerId)!;
      return { name: p.name, type: p.type, score: r.score, priority: r.priority, headline: explain(r, p).headline };
    });
    const pa = d.partners.find((x) => x.name === 'Broker A')!;
    const recA = nov.find((r) => r.partnerId === pa.id)!;
    const eA = explain(recA, pa);
    const rows = d.series.get(pa.id)!;
    const stats = statsFor(d, d.partners, '2026-11', DEMO_TODAY);
    const fb = feedbackBy7P(d, d.partners, '2026-09-01', DEMO_TODAY);
    const trend = visitsByMonth(d, d.partners, ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'], DEMO_TODAY);
    const openOpps = d.opportunities.filter((o) => o.stage !== 'won' && o.stage !== 'closed_lost');
    return {
      top, nRecs: nov.length, nPartners: d.partners.length, recA, eA, rows, stats, fb, trend,
      openOppValue: openOpps.reduce((a, o) => a + (o.estimatedValue ?? 0), 0), openOppCount: openOpps.length,
    };
  }, []);
}

export default function BoothDeck() {
  const b = useBoothData();
  const rr = b.rows.map(renewalRate);
  const rrVals = rr.filter((v): v is number => v != null);
  const sug = useMemo(() => suggest7P(NOTE_7P), []);
  const [typed, setTyped] = useState(false);
  const fbTotal = b.fb.reduce((a, x) => a + x.total, 0);
  const trendMax = Math.max(...b.trend.map((t) => t.value), 1);
  const ren = b.recA.signals.find((s) => s.key === 'renewal')!.evidence[0];

  const slides: Slide[] = [
    {
      id: 'cover', cover: true, kicker: '', duration: 8, title: 'นัดโตะ — ทีมขายของคุณรู้ไหม ว่าวันนี้ควรไปพบใคร',
      body: (
        <>
          <div className="cover-top">
            <div className="cover-text">
              <div className="cover-kicker">AI Partner Intelligence &amp; Visit Recommendation · สำหรับทีมขาย B2B</div>
              <div className="wordmark booth-rise" aria-label="นัดโตะ">นัด<span>โตะ</span></div>
              <div className="swoosh booth-draw" aria-hidden />
              <p className="cover-tagline booth-up" style={{ ['--d' as string]: '.6s' }}>ทีมขายของคุณรู้ไหม <b>ว่าวันนี้ควรไปพบใคร?</b></p>
              <p className="cover-slogan booth-up" style={{ ['--d' as string]: '.85s' }}>นัดโตะบอกได้ พร้อมเหตุผล ประเด็นที่ควรคุย และติดตามผลให้ครบวงจร</p>
            </div>
            <img className="cover-mascot booth-pop" src={`${MASCOT}mascot-natto.webp`} alt="มาสคอตนัดโตะ" />
          </div>
          <Reveal className="selling">
            {[
              { icon: Target, head: 'รู้ว่าควรไปพบใคร', text: 'AI จัดลำดับ Partner จากข้อมูลรายเดือน' },
              { icon: ShieldCheck, head: 'รู้ว่าทำไม', text: 'ทุกคำแนะนำมีหลักฐานและสูตรที่ตรวจได้' },
              { icon: Compass, head: 'รู้ว่าจะคุยอะไร', text: 'ประเด็นและคำถามพร้อมก่อนออกพบ' },
              { icon: MessageSquareText, head: 'ไม่มีเสียงลูกค้าหาย', text: 'Feedback 7P ถึงผู้บริหารทันที' },
            ].map((sp, i) => {
              const I = sp.icon;
              return <div key={sp.head} className="sp rv" style={{ ['--d' as string]: `${1 + i * 0.12}s` }}><span className="sp-icon"><I size={22} /></span><div><b>{sp.head}</b><p>{sp.text}</p></div></div>;
            })}
          </Reveal>
          <div className="cover-meta row-between">
            <span>สแกนลองใช้ demo ได้ทันที · ติดต่อ <b>Jacky</b></span>
            <img src={`${IMG}qr-demo.svg`} alt={`QR ไปที่ ${DEMO_URL}`} className="cover-qr booth-up" style={{ ['--d' as string]: '1.4s' }} />
          </div>
        </>
      ),
      notes: 'เปิดด้วยคำถาม: "ทุกเช้าทีมขายของคุณตัดสินใจยังไงว่าจะไปพบใคร?" ฟังคำตอบ แล้วชี้ไปที่ 4 จุดขาย',
    },
    {
      id: 'pain', kicker: 'ปัญหาที่ทีมขาย B2B เจอ',
      title: 'ทีมขาย B2B เสียเวลาและโอกาสไปกับ 4 เรื่องนี้ทุกเดือน',
      body: (
        <Reveal className="pain-grid">
          {[
            { icon: Compass, head: 'ไม่รู้จะไปพบใครก่อน', text: 'เลือกตามความเคยชิน Partner ที่ยอดกำลังหลุดอาจไม่มีใครเห็นจนสายไป', cost: 'โอกาสรักษายอดหลุดมือ' },
            { icon: FileSearch, head: 'เตรียมตัวนาน', text: 'ต้องเปิดรายงานหลายไฟล์เพื่อหาว่าจะคุยเรื่องอะไรก่อนออกพบ', cost: 'เวลาขายหายไปกับงานเอกสาร' },
            { icon: NotebookPen, head: 'Feedback หายไปกับสมุดจด', text: 'สิ่งที่ Partner บอกอยู่ในแชทหรือสมุด รวบรวมและวิเคราะห์ต่อไม่ได้', cost: 'ปัญหาเดิมเกิดซ้ำโดยไม่มีใครรู้' },
            { icon: Eye, head: 'ผู้บริหารเห็นแค่จำนวนครั้ง', text: 'รู้ว่าไปพบกี่ครั้ง แต่ไม่รู้ว่าแต่ละครั้งได้อะไรและงานค้างอยู่ตรงไหน', cost: 'ตัดสินใจโดยไม่มีข้อมูลหน้างาน' },
          ].map((p, i) => {
            const I = p.icon;
            return (
              <div key={p.head} className="card pain rv" style={{ ['--d' as string]: `${0.15 + i * 0.18}s` }}>
                <span className="pain-icon"><I size={26} /></span>
                <h3>{p.head}</h3><p>{p.text}</p>
                <div className="pain-cost">ต้นทุนที่ซ่อนอยู่: {p.cost}</div>
              </div>
            );
          })}
          <div className="banner rv" style={{ gridColumn: '1 / -1', ['--d' as string]: '1s' }}>
            <img src={`${MASCOT}mascot-thinking.webp`} alt="" />
            <div><b>เจอแม้แต่ข้อเดียว นัดโตะช่วยได้</b><br /><span>เพราะทั้ง 4 เรื่องเริ่มจากจุดเดียวกัน: ข้อมูลมีอยู่แล้ว แต่ไม่ได้ถูกเปลี่ยนเป็นการตัดสินใจ</span></div>
          </div>
        </Reveal>
      ),
      notes: 'ถามผู้ฟังว่าเจอข้อไหนบ่อยที่สุด ส่วนใหญ่จะตอบข้อ 1 หรือข้อ 3 แล้วพาไปหน้าถัดไป',
    },
    {
      id: 'fix', kicker: 'นัดโตะแก้อย่างไร',
      title: 'นัดโตะแก้ทั้ง 4 เรื่องในแอปเดียว ตั้งแต่ก่อนเข้าพบจนถึงโต๊ะผู้บริหาร',
      body: (
        <Reveal className="fix-list">
          {[
            { pain: 'ไม่รู้จะไปพบใครก่อน', icon: Sparkles, fix: 'AI จัดอันดับ Partner ทุกเดือน', how: 'อ่านสัญญาณ 5 ด้าน: Renewal, ยอดขาย, Product Mix, กลุ่มรถ EV, งานค้าง', gain: 'ไปพบรายที่สำคัญที่สุดก่อน' },
            { pain: 'เตรียมตัวนาน', icon: ClipboardList, fix: 'หน้าเตรียมเข้าพบสำเร็จรูป', how: 'กราฟ หลักฐาน ประเด็น คำถาม และเป้าหมายอยู่ในหน้าเดียว', gain: 'ลดเวลาหาข้อมูลก่อนออกพบ' },
            { pain: 'Feedback หาย', icon: Layers, fix: 'บันทึก 7P โดยมี AI ช่วยจัดหมวด', how: 'พิมพ์สรุปครั้งเดียว ระบบแยกหมวดให้ แล้วสร้างงานติดตามพร้อมเจ้าของงาน', gain: 'เสียงลูกค้ากลายเป็นข้อมูลที่ใช้ต่อได้' },
            { pain: 'ผู้บริหารเห็นแค่จำนวน', icon: BarChart3, fix: 'Dashboard ทีมและองค์กร', how: 'เจาะลงได้ถึงรายคน รายคู่ค้า และรายการเข้าพบ ตามสิทธิ์', gain: 'เห็นปัญหาซ้ำ โอกาส และงานค้างทันที' },
          ].map((r, i) => {
            const I = r.icon;
            return (
              <div key={r.pain} className="fix-row rv" style={{ ['--d' as string]: `${0.15 + i * 0.2}s` }}>
                <div className="fix-pain">{r.pain}</div>
                <div className="fix-arrow" aria-hidden>→</div>
                <div className="fix-feature"><span className="sp-icon"><I size={20} /></span><div><b>{r.fix}</b><p>{r.how}</p></div></div>
                <div className="fix-gain"><TrendingUp size={16} /> {r.gain}</div>
              </div>
            );
          })}
        </Reveal>
      ),
      notes: 'หน้านี้เป็นแผนที่ของการคุยทั้งหมด จากนี้จะโชว์ทีละฟีเจอร์',
    },
    {
      id: 'rank', kicker: 'ฟีเจอร์ 1 · AI แนะนำ', demo: true,
      title: 'AI จัดอันดับให้ ว่าเดือนนี้ควรไปพบ Partner รายไหนก่อน และเพราะอะไร',
      body: (
        <div className="body">
          <div className="col" style={{ flex: 1.5 }}>
            <Reveal className="card rank">
              <div className="row-between small muted"><span>คำแนะนำรอบ พ.ย. · {b.nRecs} จาก {b.nPartners} Partner (ข้อมูลจำลอง)</span><span>คะแนน / 100</span></div>
              {b.top.map((t, i) => (
                <div key={t.name} className="rank-row">
                  <div className="rank-name"><b>{i + 1}. {t.name}</b><span className={`rank-pri ${t.priority}`}>{PRIORITY_LABEL[t.priority]}</span></div>
                  <div className="rank-track"><div className="rank-bar" style={{ ['--w' as string]: `${t.score}%`, ['--d' as string]: `${0.2 + i * 0.15}s` }}><span>{t.score}</span></div></div>
                  <div className="rank-reason rv" style={{ ['--d' as string]: `${0.9 + i * 0.15}s` }}>{t.headline}</div>
                </div>
              ))}
            </Reveal>
          </div>
          <div className="col">
            <Reveal className="stack-sm">
              {[['Renewal ลดลง', 30], ['ยอดขายลดลง', 25], ['โอกาส Product Mix', 20], ['กลุ่มรถ EV', 15], ['งานติดตามค้าง', 10]].map(([l, w], i) => (
                <div key={l as string} className="signal rv" style={{ ['--d' as string]: `${0.3 + i * 0.12}s` }}><span>{l}</span><b>{w}</b></div>
              ))}
              <p className="small muted rv" style={{ ['--d' as string]: '1s' }}>5 สัญญาณ รวม 100 คะแนน · ปรับน้ำหนักให้ตรงกับนโยบายของแต่ละองค์กรได้ · นัดโตะแค่แนะนำ คนเป็นผู้ตัดสินใจ</p>
            </Reveal>
          </div>
        </div>
      ),
      notes: 'ชี้ว่าแต่ละรายมีเหตุผลกำกับเป็นภาษาคน ไม่ใช่แค่คะแนน แล้วต่อไปหน้าหลักฐาน',
    },
    {
      id: 'evidence', kicker: 'ฟีเจอร์ 2 · หลักฐาน', demo: true,
      title: 'ทุกคำแนะนำมีหลักฐาน และตัวเลขตรวจย้อนได้ ไม่ใช่ AI เดาเอา',
      body: (
        <div className="body">
          <div className="col" style={{ flex: 1.5 }}>
            <div className="card">
              <div className="row-between"><b>Renewal Rate รายเดือน · Broker A (%)</b><span className="small muted">พื้นเหลือง = 3 เดือนที่เปรียบเทียบ</span></div>
              <DrawLine values={rr} labels={b.rows.map((r) => fmtMonthShort(r.month))} min={Math.floor(Math.min(...rrVals) * 20) / 20 - 0.03} max={Math.ceil(Math.max(...rrVals) * 20) / 20 + 0.02}
                highlightFrom={8} fmt={(v) => `${(v * 100).toFixed(0)}%`} aria="กราฟ Renewal Rate ของ Broker A" />
            </div>
          </div>
          <Reveal className="col">
            <div className="card big-stat rv" style={{ ['--d' as string]: '1.2s' }}>
              <span className="small muted">Renewal Rate เปลี่ยนไปใน 3 เดือน</span>
              <b className="down">{fmtPp(ren.changePp!)}</b>
              <span className="small">{fmtPct(ren.comparisonValue)} → {fmtPct(ren.currentValue)}</span>
            </div>
            <div className="card rv" style={{ ['--d' as string]: '1.5s' }}>
              <span className="small muted">โอกาสรักษาฐาน Renewal (ประมาณการ/ปี)</span>
              <b className="big-num">≈ {fmtMillion(b.recA.opportunity.value)}</b>
              <div className="formula small">{b.eA.opportunity.calc}</div>
              <p className="xs muted" style={{ margin: '6px 0 0' }}>สูตรและสมมติฐานเปิดให้ดูทุกครั้ง · ถ้าข้อมูลไม่พอ ระบบจะบอกว่า "ประเมินไม่ได้" ไม่เดาตัวเลข</p>
            </div>
          </Reveal>
        </div>
      ),
      notes: 'จุดขายที่ผู้บริหารชอบที่สุด: เชื่อตัวเลขได้ เพราะทุกตัวมีที่มา',
    },
    {
      id: 'prep', kicker: 'ฟีเจอร์ 3 · เตรียมเข้าพบ', demo: true,
      title: 'เตรียมเข้าพบได้ทันที: ประเด็น คำถาม และเป้าหมายพร้อมในหน้าเดียว',
      body: (
        <div className="body" style={{ alignItems: 'center' }}>
          <div className="phone booth-pop"><img src={`${IMG}m-talk.webp`} alt="หน้าเตรียมเข้าพบในแอป" /></div>
          <Reveal className="col flow-col">
            {[
              { k: 'สัญญาณ', v: b.eA.talkingPoints[0]?.signalText ?? '' },
              { k: 'ประเด็นที่ควรคุย', v: b.eA.talkingPoints.map((t) => t.topic).join(' · ') },
              { k: 'คำถามเปิดบทสนทนา', v: b.eA.talkingPoints[0]?.questions[0] ?? '' },
              { k: 'เป้าหมายการเข้าพบ', v: b.eA.visitObjective },
            ].map((x, i) => (
              <div key={x.k} className="card flip rv" style={{ ['--d' as string]: `${0.3 + i * 0.3}s` }}>
                <span className="step-n">{i + 1}</span><div><b>{x.k}</b><p>{x.v}</p></div>
              </div>
            ))}
            <p className="small muted rv" style={{ ['--d' as string]: '1.6s' }}>แก้ ลบ หรือเพิ่มประเด็นเองได้ · บันทึกแผนเข้าพบได้ แต่ระบบไม่จองนัดให้อัตโนมัติ</p>
          </Reveal>
        </div>
      ),
      notes: 'ภาพในมือถือคือหน้าจอจริงของแอป ให้ผู้ฟังลองกดเองจาก QR ได้',
    },
    {
      id: 'ai7p', kicker: 'ฟีเจอร์ 4 · บันทึก Feedback', duration: 13,
      title: 'พิมพ์สรุปครั้งเดียว นัดโตะแยกเข้า 7P ให้ ส่วนคนเป็นผู้ยืนยัน',
      body: (
        <div className="body">
          <div className="col">
            <div className="card typing">
              <span className="small muted">Marketing พิมพ์สรุปหลังเข้าพบ</span>
              <p className="typed"><Typewriter text={NOTE_7P} cps={30} onDone={() => setTyped(true)} /></p>
            </div>
            <div className={`card ai-chips ${typed ? 'in' : ''}`}>
              <span className="small muted"><Sparkles size={14} /> นัดโตะแนะนำหมวด</span>
              {sug.map((s, i) => (
                <div key={s.category} className="chip-row" style={{ ['--d' as string]: `${0.15 + i * 0.25}s` }}>
                  <span className="chip-cat neg">{SEVEN_P_LABEL[s.category]} · ต้องปรับ</span><span className="small">{s.clauses.join(' / ')}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={`col sevenp ${typed ? 'in' : ''}`}>
            {SEVEN_P.map((k) => {
              const hit = sug.findIndex((s) => s.category === k);
              return <div key={k} className={`p-cell ${hit >= 0 ? 'hit' : ''}`} style={{ ['--d' as string]: `${0.3 + Math.max(hit, 0) * 0.25}s` }}>{SEVEN_P_LABEL[k]}</div>;
            })}
            <p className="small muted" style={{ gridColumn: '1 / -1', margin: 0 }}>หมวดที่ "ต้องปรับ" สร้าง Next Action พร้อมผู้รับผิดชอบและวันกำหนดเสร็จให้ทันที · กดปิดหรือแก้คำแนะนำได้ทุกหมวด</p>
          </div>
        </div>
      ),
      notes: 'นี่คือประโยคตัวอย่างจากการทดสอบจริง ระบบแยกเป็น Product / Process / Promotion ได้ถูกต้อง',
    },
    {
      id: 'exec', kicker: 'ฟีเจอร์ 5 · Dashboard ผู้บริหาร', demo: true,
      title: 'ผู้บริหารเห็นภาพทั้งองค์กร ตั้งแต่การเข้าพบจนถึงโอกาสทางธุรกิจ',
      body: (
        <div className="col">
          <Reveal className="kpi4">
            <div className="card rv" style={{ ['--d' as string]: '.1s' }}><Users size={20} /><b><CountUp to={b.nPartners} /></b><span>Partner ที่ดูแล</span></div>
            <div className="card rv" style={{ ['--d' as string]: '.25s' }}><CalendarCheck size={20} /><b><CountUp to={b.stats.visits} delay={150} /></b><span>การเข้าพบเดือนนี้</span></div>
            <div className="card rv" style={{ ['--d' as string]: '.4s' }}><TrendingUp size={20} /><b><CountUp to={b.openOppValue / 1e6} decimals={1} prefix="≈" delay={300} /></b><span>โอกาสที่ยังเปิด (ลบ./ปี ประมาณการ)</span></div>
            <div className="card rv" style={{ ['--d' as string]: '.55s' }}><Clock size={20} /><b><CountUp to={b.stats.overdue} delay={450} /></b><span>งานติดตามเกินกำหนด</span></div>
          </Reveal>
          <div className="body">
            <div className="card col" style={{ alignItems: 'center' }}>
              <b style={{ alignSelf: 'flex-start' }}>Feedback แยกตาม 7P (ก.ย.–พ.ย.)</b>
              <div className="row-center">
                <DrawDonut items={b.fb.map((x, i) => ({ label: SEVEN_P_LABEL[x.key], value: x.total, color: SERIES[i] }))} center={<CountUp to={fbTotal} />} sub="ประเด็น" size={200} />
                <ul className="legend-v">{b.fb.map((x, i) => <li key={x.key}><i style={{ background: SERIES[i] }} />{SEVEN_P_LABEL[x.key]} <b>{x.total}</b></li>)}</ul>
              </div>
            </div>
            <div className="card col">
              <b>การเข้าพบรายเดือน (ครั้ง)</b>
              <Reveal className="vbars">
                {b.trend.map((t, i) => (
                  <div key={t.month} className="vbar-col">
                    <span className="vbar-val">{t.value}</span>
                    <div className="vbar" style={{ ['--h' as string]: `${(t.value / trendMax) * 100}%`, ['--d' as string]: `${0.2 + i * 0.1}s` }} />
                    <span className="vbar-lbl">{fmtMonthShort(t.month)}</span>
                  </div>
                ))}
              </Reveal>
              <p className="xs muted" style={{ margin: 0 }}>พ.ย. นับถึงวันที่ 20 · เจาะลงได้ถึงรายทีม รายคน รายคู่ค้า ตามสิทธิ์</p>
            </div>
          </div>
        </div>
      ),
      notes: 'ตัวเลขทุกตัวมาจากข้อมูลจำลองชุดเดียวกับแอป ให้ผู้ฟังสลับเป็น "ผู้บริหาร" ใน demo ดูเองได้',
    },
    {
      id: 'value', kicker: 'คุณค่าที่ได้',
      title: 'คุณค่ามาจาก 4 ด้าน และวัดผลได้จริงจาก dashboard ในแอป',
      body: (
        <Reveal className="value-grid">
          {[
            { icon: Clock, head: 'ประหยัดเวลา', what: 'ไม่ต้องรวบรวมรายงานก่อนเข้าพบ และบันทึกผลได้ในหน้าเดียว', measure: 'เวลาเตรียม + สรุปผลต่อครั้ง', formula: 'ชั่วโมงที่ลด × ต้นทุนต่อชั่วโมง' },
            { icon: RotateCcw, head: 'รักษาเบี้ยต่ออายุ', what: 'เห็น Partner ที่ Renewal เริ่มลดก่อนจะสายเกินไป', measure: 'Renewal Rate (pp)', formula: 'pp ที่ดีขึ้น × เบี้ยต่ออายุที่ครบกำหนด' },
            { icon: Layers, head: 'ขายเพิ่ม (Product Mix)', what: 'เห็นหมวดที่ Partner ยังขายน้อยกว่ากลุ่มเดียวกัน', measure: 'สัดส่วนผลิตภัณฑ์เทียบกลุ่ม', formula: 'ส่วนต่างสัดส่วน × เบี้ยของ Partner' },
            { icon: ClipboardList, head: 'ปิดงานค้าง', what: 'ทุก Feedback มีเจ้าของงานและวันกำหนดเสร็จ', measure: 'อัตราปิดงานตามกำหนด', formula: 'งานเสร็จตามกำหนด ÷ งานทั้งหมด' },
          ].map((v, i) => {
            const I = v.icon;
            return (
              <div key={v.head} className="card value rv" style={{ ['--d' as string]: `${0.15 + i * 0.18}s` }}>
                <span className="pain-icon good"><I size={24} /></span>
                <h3>{v.head}</h3><p>{v.what}</p>
                <div className="value-meta"><span>วัดผลด้วย</span><b>{v.measure}</b></div>
                <div className="value-meta"><span>คิดเป็นเงิน</span><b>{v.formula}</b></div>
              </div>
            );
          })}
          <div className="banner rv" style={{ gridColumn: '1 / -1', ['--d' as string]: '1s' }}>
            <img src={`${MASCOT}mascot-present.webp`} alt="" style={{ width: 150 }} />
            <div><b>ทุกตัวชี้วัดนี้มีอยู่ใน dashboard ของแอปแล้ว</b><br /><span>หน้าถัดไป: ลองใส่ตัวเลขขององค์กรคุณ แล้วดูว่าคุ้มแค่ไหน</span></div>
          </div>
        </Reveal>
      ),
      notes: 'ย้ำว่าเราไม่ได้อ้างตัวเลขลอยๆ หน้าถัดไปให้ผู้ฟังลองใส่ตัวเลขขององค์กรเอง',
    },
    {
      id: 'roi', kicker: 'ลองคำนวณเอง', duration: 14,
      title: 'คำนวณ ROI ขององค์กรคุณ จากตัวเลขของคุณเอง',
      body: <RoiCalculator />,
      notes: 'ให้ผู้ฟังเลื่อนแถบเอง ค่าเริ่มต้นเป็นตัวอย่างสมมติ ROI คิดเฉพาะมูลค่าเวลาเพื่อให้ระมัดระวัง ส่วนเบี้ยต่ออายุแสดงแยกและเป็นเบี้ย ไม่ใช่กำไร',
    },
    {
      id: 'start', kicker: 'เริ่มต้นใช้งาน',
      title: 'เริ่มได้จากข้อมูลที่มีอยู่แล้ว สแกนลองใช้ demo ได้เลย',
      body: (
        <div className="body" style={{ alignItems: 'center' }}>
          <Reveal className="col">
            {[
              { icon: FileSearch, head: 'ใช้ข้อมูลรายเดือนที่มีอยู่', text: 'เบี้ย, Renewal, Product Mix, พอร์ตรถ ระดับ Partner โดยไม่ต้องใช้ข้อมูลส่วนบุคคลของลูกค้า' },
              { icon: Users, head: 'เริ่มจากทีมเดียว', text: 'ทดลองกับหนึ่งทีม วัดผลจาก dashboard แล้วค่อยขยาย' },
              { icon: Smartphone, head: 'ใช้ได้ทั้งมือถือและเว็บ', text: 'ติดตั้งลงมือถือได้ ใช้ภาษาไทยทั้งระบบ และสิทธิ์แยกตาม Marketing / Manager / ผู้บริหาร' },
            ].map((s, i) => {
              const I = s.icon;
              return <div key={s.head} className="card step rv" style={{ ['--d' as string]: `${0.15 + i * 0.2}s` }}><span className="sp-icon"><I size={20} /></span><div><b>{s.head}</b><p>{s.text}</p></div></div>;
            })}
          </Reveal>
          <div className="qr-box booth-pop">
            <img src={`${IMG}qr-demo.svg`} alt={`QR ไปที่ ${DEMO_URL}`} className="qr-big" />
            <b>สแกนลองใช้ demo</b>
            <span className="small muted">{DEMO_URL}</span>
            <div className="contact">ติดต่อ <b>Jacky</b></div>
            <img src={`${MASCOT}mascot-success.webp`} alt="" className="qr-mascot" />
          </div>
        </div>
      ),
      notes: 'ชวนสแกน QR แล้วลองเข้าเป็น "กิตติ" ใน demo ส่วนคนที่สนใจจริง ให้แลกช่องทางติดต่อกับ Jacky',
    },
  ];

  return <DeckView slides={slides} footer={['นัดโตะ (NATTO) · AI Partner Intelligence', `Demo ใช้ข้อมูลจำลองทั้งหมด · ${DEMO_URL}`]} />;
}
