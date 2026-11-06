import { useMemo } from 'react';
import { DeckView, type Slide } from './DeckView';
import { buildDemoData } from '../data/dataset';
import { DATA_AS_OF } from '../data/config';
import { explain } from '../engine/explain';
import { renewalRate } from '../engine/metrics';
import { fmtDate, fmtMillion, fmtMonth, fmtMonthShort, fmtPct, fmtPp } from '../domain/labels';
import { PRIORITY_BANDS, ACTIVE_BANDS } from '../engine/config';
import { LineChart } from '../ui/charts';
import { Compass, MessageSquareText, ShieldCheck, Target } from 'lucide-react';

const IMG = './deck/';
const MASCOT = './assets/';


// Selling points: each maps to a feature that already works in the demo (no claims about results).
const SELLING_POINTS = [
  { icon: Target, head: 'รู้ว่าควรไปพบใคร', text: 'จัดลำดับ Partner จากข้อมูลรายเดือนให้ทุกเดือน ไม่ต้องเดา' },
  { icon: ShieldCheck, head: 'รู้ว่าทำไม และเชื่อตัวเลขได้', text: 'ทุกคำแนะนำมีเหตุผล หลักฐาน และสูตรที่ตรวจย้อนได้' },
  { icon: Compass, head: 'รู้ว่าจะคุยอะไร', text: 'ประเด็นและคำถามพร้อมก่อนเข้าพบ แก้ไขเองได้' },
  { icon: MessageSquareText, head: 'เสียงของ Partner ไม่หาย', text: 'Feedback 7P ส่งถึง Manager และผู้บริหารทันทีที่บันทึก' },
];

function useLiveFacts() {
  return useMemo(() => {
    const d = buildDemoData();
    const p = d.partners.find((x) => x.name === 'Broker A')!;
    const rec = d.recommendations.find((r) => r.batchMonth === '2026-11' && r.partnerId === p.id)!;
    const e = explain(rec, p);
    const ren = rec.signals.find((s) => s.key === 'renewal')!.evidence[0];
    const rows = d.series.get(p.id)!;
    const nov = d.recommendations.filter((r) => r.batchMonth === '2026-11');
    return {
      d, p, rec, e, ren, rows,
      counts: { recs: nov.length, high: nov.filter((r) => r.priority === 'high').length, medium: nov.filter((r) => r.priority === 'medium').length, partners: d.partners.length },
    };
  }, []);
}

export default function PilotDeck() {
  const f = useLiveFacts();
  const bands = PRIORITY_BANDS[ACTIVE_BANDS];
  const rrData = f.rows.map((r) => ({ label: fmtMonthShort(r.month), sub: fmtMonth(r.month), value: renewalRate(r) }));
  const rrVals = rrData.map((x) => x.value).filter((v): v is number => v != null);
  const o = f.e.opportunity;

  const slides: Slide[] = [
    {
      id: 'cover', cover: true, kicker: '', title: 'นัดโตะ (NATTO) — ผู้ช่วยคิดว่า วันนี้คุณควรไปพบใคร',
      body: (
        <>
          <div className="cover-top">
            <div className="cover-text">
              <div className="cover-kicker">AI Partner Intelligence &amp; Visit Recommendation</div>
              <div className="wordmark" aria-label="นัดโตะ">นัด<span>โตะ</span></div>
              <div className="swoosh" aria-hidden />
              <p className="cover-tagline">ผู้ช่วยคิดว่า <b>วันนี้คุณควรไปพบใคร</b></p>
              <p className="cover-slogan">หนึ่งนัด หนึ่งเมล็ด หนึ่งก้าวของการเติบโต</p>
            </div>
            <img className="cover-mascot" src={`${MASCOT}mascot-natto.webp`} alt="มาสคอตนัดโตะ" />
          </div>
          <div className="selling">
            {SELLING_POINTS.map((sp) => {
              const I = sp.icon;
              return (
                <div key={sp.head} className="sp">
                  <span className="sp-icon"><I size={22} /></span>
                  <div><b>{sp.head}</b><p>{sp.text}</p></div>
                </div>
              );
            })}
          </div>
          <div className="cover-meta">ข้อเสนอ Pilot สำหรับ Head of Marketing · พฤศจิกายน 2026 · ร่างสำหรับพิจารณา</div>
        </>
      ),
      notes: 'เปิดด้วยประโยคเดียว: "นัดโตะช่วยตอบคำถามที่ Marketing ต้องตอบทุกเช้า ว่าวันนี้ควรไปพบใคร" แล้วไล่จุดขาย 4 ข้อสั้นๆ ทุกข้อมีอยู่ใน demo แล้ว ไม่ใช่สัญญาว่าจะทำ จากนั้นไปหน้าถัดไปเพื่อบอกสิ่งที่ขออนุมัติทันที',
    },
    {
      id: 'ask', kicker: 'ขออนุมัติ · สำหรับ Head of Marketing',
      title: 'ขออนุมัติทดลองนัดโตะกับทีม Marketing 1 ทีม เป็นเวลา 3 เดือน',
      body: (
        <div className="col">
          <div className="body" style={{ flex: 'none' }}>
            <div className="col" style={{ justifyContent: 'center' }}>
              <p style={{ fontSize: 22, margin: 0, color: 'var(--ink-2)' }}>นัดโตะช่วย Marketing ตัดสินใจว่าเดือนนี้ควรไปพบ Partner รายไหน เพราะอะไร และควรคุยเรื่องอะไร จากข้อมูลรายเดือนที่บริษัทมีอยู่แล้ว</p>
              <p className="small muted" style={{ margin: 0 }}>Demo พร้อมใช้งานทั้งมุม Marketing, Manager และผู้บริหาร · ข้อมูลใน demo เป็นข้อมูลจำลองทั้งหมด</p>
            </div>
            <img src={`${MASCOT}mascot-present.webp`} alt="มาสคอตนัดโตะ" style={{ width: 360, flex: 'none' }} className="hide-reading" />
          </div>
          <div className="ask">
            <div className="card"><div className="n">1</div><h3>อนุมัติ Pilot 1 ทีม 3 เดือน</h3><p>ใช้นัดโตะกับทีมเดียวก่อน วัดว่าทีมใช้คำแนะนำจริงหรือไม่ แล้วค่อยตัดสินใจขยาย</p><span className="pill">ข้อเสนอ ระยะเวลาและทีมปรับได้</span></div>
            <div className="card"><div className="n">2</div><h3>ให้ Data Owner เปิดข้อมูลรายเดือน</h3><p>ใช้แค่ข้อมูลระดับ Partner รายเดือนแบบ aggregated ได้แก่ เบี้ย, Renewal, Product Mix, พอร์ตรถ โดยไม่ใช้ข้อมูลส่วนบุคคลของลูกค้า</p></div>
            <div className="card"><div className="n">3</div><h3>แต่งตั้ง Business Owner</h3><p>อนุมัตินิยามตัวชี้วัด น้ำหนักคะแนน และสูตรมูลค่าโอกาส ก่อนใช้กับข้อมูลจริง</p></div>
          </div>
        </div>
      ),
      notes: 'เปิดด้วยสิ่งที่ขอเลย: ขอ 3 อย่าง คือ pilot 1 ทีม 3 เดือน ข้อมูลรายเดือนจริง และคนอนุมัติเกณฑ์ ย้ำว่าเป็นการทดลองที่ไม่ต้องใช้ข้อมูลลูกค้ารายบุคคล ส่วนตัวเลขทุกตัวในวันนี้มาจากข้อมูลจำลอง',
    },
    {
      id: 'problem', kicker: 'ปัญหา',
      title: 'Marketing มีข้อมูลรายเดือนอยู่แล้ว แต่ยังไม่ได้ใช้ตัดสินใจว่าควรไปพบใคร',
      body: (
        <div className="body">
          <div className="col">
            <div className="card"><h3>ก่อนเข้าพบ</h3><ul><li>ไม่แน่ใจว่าควรให้ความสำคัญกับ Partner รายไหนก่อน</li><li>มองไม่เห็นสัญญาณธุรกิจที่ควรรีบดู เช่น Renewal ที่เริ่มลด</li><li>ไม่รู้ว่าควรเตรียมประเด็นอะไรไปคุย</li></ul></div>
          </div>
          <div className="col">
            <div className="card"><h3>หลังเข้าพบ</h3><ul><li>Feedback ของ Partner ถูกเก็บในรูปแบบที่วิเคราะห์ต่อยาก</li><li>งานที่รับปากไว้ไม่มีคนตามอย่างเป็นระบบ</li></ul></div>
            <div className="card"><h3>ระดับบริหาร</h3><ul><li>เห็นจำนวนการเข้าพบ แต่ไม่เห็นว่าการเข้าพบเชื่อมกับปัญหาของ Partner โอกาส และผลลัพธ์อย่างไร</li></ul></div>
          </div>
          <div className="col hide-reading" style={{ flex: 'none', width: 260, justifyContent: 'center' }}>
            <img src={`${MASCOT}mascot-thinking.webp`} alt="" />
          </div>
        </div>
      ),
      notes: 'ปัญหามาจาก spec ข้อ 1.2 ตอนนี้ยังไม่มีตัวเลข baseline ของการเข้าพบจริง ผมจึงไม่ใส่สถิติ ถ้าผู้ฟังถามว่าปัญหาใหญ่แค่ไหน ให้ตอบว่า pilot เดือนแรกจะเก็บ baseline นี้',
    },
    {
      id: 'concept', kicker: 'แนวคิด',
      title: 'นัดโตะแค่แนะนำ คนเป็นผู้ตัดสินใจ และระบบไม่จองนัดแทน',
      body: (
        <div className="col">
          <div className="shot"><img src={`${IMG}concept-strip.webp`} alt="แนวคิด: วิเคราะห์ข้อมูล แนะนำคู่ค้า เตรียมประเด็น เข้าพบและเก็บ Feedback 7P ติดตามผลระดับผู้บริหาร" /></div>
          <div className="ask">
            <div className="card"><h3>อธิบายได้ทุกคำแนะนำ</h3><p>บอกว่าทำไม ทำไมต้องตอนนี้ มีหลักฐานตัวเลข ช่วงเวลา และวันที่ของข้อมูล</p></div>
            <div className="card"><h3>Marketing เป็นคนเลือก</h3><p>กดได้ว่า เตรียมเข้าพบ / วางแผนติดต่อ / ไม่ใช่ตอนนี้ / ไม่เกี่ยวข้อง ระบบเก็บเหตุผลไว้ปรับคุณภาพคำแนะนำ</p></div>
            <div className="card"><h3>Feedback มีโครงสร้าง</h3><p>บันทึกตาม 7P พร้อมระดับความรุนแรงและงานติดตาม ทำให้ Manager และผู้บริหารวิเคราะห์ต่อได้</p></div>
          </div>
        </div>
      ),
      notes: 'ภาพแถบบนตัดมาจาก UI concept board ใช้เฉพาะส่วนแนวคิดและผู้ใช้ ไม่ใช้ส่วนที่มีตัวเลขตัวอย่าง เพราะตัวเลขใน board ต่างจาก demo ให้ย้ำว่าระบบไม่จองนัดเอง เพื่อตอบข้อกังวลเรื่อง AI ตัดสินใจแทนคน',
    },
    {
      id: 'evidence', kicker: 'ตัวอย่างจาก demo', demo: true,
      title: `ระบบจับได้ว่า Renewal ของ ${f.p.name} ลด ${fmtPp(f.ren.changePp!).replace('−', '')} ใน 3 เดือน พร้อมบอกเหตุผล`,
      body: (
        <div className="body">
          <div className="col">
            <div className="card">
              <h3>Renewal Rate รายเดือนของ {f.p.name} (%)</h3>
              <div className="small muted">{fmtMonth(f.rows[0].month)} – {fmtMonth(f.rows[f.rows.length - 1].month)} · พื้นเหลืองคือช่วงเปรียบเทียบ 3 เดือน</div>
              <LineChart data={rrData} fmt={(v) => fmtPct(v)} fmtAxis={(v) => `${Math.round(v * 100)}`} min={Math.floor(Math.min(...rrVals) * 10) / 10 - 0.05} max={Math.ceil(Math.max(...rrVals) * 10) / 10 + 0.05} ariaLabel={`Renewal Rate ${f.p.name}`} emphasizeFrom={8} />
            </div>
            <div className="card">
              <h3>เหตุผลที่นัดโตะให้ (ความสำคัญสูง · {f.rec.score}/100)</h3>
              <ul>{f.e.reasons.slice(0, 2).map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          </div>
          <div className="phone"><img src={`${IMG}m-rec.webp`} alt="หน้าคำแนะนำ Broker A ในแอป" /></div>
        </div>
      ),
      notes: `ทุกตัวเลขบนหน้านี้คำนวณจาก dataset ชุดเดียวกับแอป ข้อมูล ณ ${fmtDate(DATA_AS_OF)} ถ้าถามว่าทำไมไม่ใช่ 18 pp ตาม board ให้ตอบว่า board เป็นภาพแนวคิด ส่วนตัวเลขในแอปมาจากข้อมูลจำลองที่ตรวจย้อนได้ ในรอบ พ.ย. ระบบแนะนำ ${f.counts.recs} จาก ${f.counts.partners} Partner โดยเป็นความสำคัญสูง ${f.counts.high} ราย และปานกลาง ${f.counts.medium} ราย (เกณฑ์ demo: สูง ≥${bands.high}, ปานกลาง ≥${bands.medium})`,
    },
    {
      id: 'formula', kicker: 'ความน่าเชื่อถือของตัวเลข', demo: true,
      title: 'ตัวเลขโอกาสทุกตัวตรวจย้อนได้ ไม่ใช่ตัวเลขที่ AI คิดขึ้นเอง',
      body: (
        <div className="body">
          <div className="col">
            <div className="card">
              <div className="small muted">โอกาส{o.label} · {f.p.name}</div>
              <div className="big">≈ {fmtMillion(f.rec.opportunity.value)}</div>
              <div className="small muted" style={{ marginTop: 4 }}>ต่อปี · ประมาณการ ไม่ใช่รายได้จริง</div>
              <div className="formula" style={{ marginTop: 12 }}>{o.formula}</div>
              <div className="formula" style={{ marginTop: 6 }}>{o.calc}</div>
            </div>
            <div className="card">
              <h3>สมมติฐานที่แสดงคู่กับตัวเลขในแอป</h3>
              <ul>{o.assumptions.slice(0, 3).map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
            <div className="card" style={{ background: 'var(--cream)' }}>
              <p><b>ถ้าข้อมูลไม่พอ ระบบจะไม่เดาตัวเลขให้</b> เช่น โอกาสกลุ่มรถ EV จะขึ้นว่า "ยังประเมินมูลค่าไม่ได้" เพราะยังไม่มีเบี้ยเฉลี่ยต่อคันที่อนุมัติ และเดือนที่ไม่มีข้อมูลจะไม่ถูกนับเป็นศูนย์</p>
            </div>
          </div>
          <div className="phone"><img src={`${IMG}m-formula.webp`} alt="หน้าเหตุผล AI แสดงที่มาของคะแนนและสูตร" /></div>
        </div>
      ),
      notes: 'นี่คือจุดที่ทำให้ผู้บริหารเชื่อตัวเลขได้ สูตรและน้ำหนักทั้งหมดยังเป็นสมมติฐานของ demo และต้องให้ Business Owner อนุมัติก่อน (ดูหน้า 10) ถ้าถูกถามว่าใช้ AI ตรงไหน ให้ตอบว่า MVP ใช้กติกาที่ตรวจสอบได้ คำอธิบายสร้างจากตัวเลขของ engine ภายหลังเปลี่ยนเป็น LLM ได้โดยส่งข้อมูลชุดเดียวกันเข้าไป',
    },
    {
      id: 'feedback', kicker: 'หลังเข้าพบ', demo: true,
      title: 'Feedback หลังเข้าพบกลายเป็นข้อมูล 7P ที่ Manager เห็นทันที',
      body: (
        <div className="body" style={{ alignItems: 'center' }}>
          <div className="phone"><img src={`${IMG}m-7p.webp`} alt="หน้าบันทึก Feedback 7P พร้อมหมวดที่นัดโตะแนะนำ" /></div>
          <div className="col" style={{ flex: 'none', width: 120, alignItems: 'center' }}>
            <div style={{ fontSize: 44, color: 'var(--cobalt)' }} aria-hidden>→</div>
            <div className="small muted" style={{ textAlign: 'center' }}>บันทึกแล้วขึ้นใน Dashboard ทีมทันที</div>
          </div>
          <div className="col">
            <div className="shot" style={{ maxHeight: 380 }}><img src={`${IMG}d-manager.webp`} alt="Dashboard ของ Manager แสดงผลงานรายคนและ Feedback" /></div>
            <div className="card"><p>นัดโตะช่วยเสนอหมวด 7P จากสรุปการพูดคุย แต่ <b>Marketing ต้องตรวจและยืนยันก่อนบันทึกทุกครั้ง</b> หมวดที่ "ต้องปรับ" จะสร้าง Next Action พร้อมผู้รับผิดชอบและวันกำหนดเสร็จ</p></div>
          </div>
        </div>
      ),
      notes: 'ใน demo ให้กดบันทึกการเข้าพบของ Broker A แล้วสลับไปเป็น Manager (วิภาวดี) ตัวเลขการเข้าพบและ Feedback ของกิตติจะขึ้นทันที ย้ำหลัก human-in-the-loop ระบบเสนอหมวดให้ แต่คนเป็นผู้ยืนยัน',
    },
    {
      id: 'exec', kicker: 'มุมผู้บริหาร', demo: true,
      title: 'ผู้บริหารเห็นประเด็นที่เกิดซ้ำ ไม่ได้เห็นแค่จำนวนการเข้าพบ',
      body: (
        <div className="body">
          <div className="col" style={{ flex: 1.6 }}>
            <div className="shot"><img src={`${IMG}d-exec-insight.webp`} alt="Executive Dashboard: Feedback 7P, Opportunity Pipeline และประเด็นสำคัญ" /></div>
          </div>
          <div className="col">
            <div className="card"><h3>เกิดอะไรขึ้น → เพราะอะไร → ควรทำอะไร</h3><p>ทุกประโยคในกล่องประเด็นสำคัญคำนวณจากข้อมูล และกดดูหลักฐานต่อได้</p></div>
            <div className="card"><h3>เจาะลงได้ตามสิทธิ์</h3><p>องค์กร → ทีม → Marketing → Partner → การเข้าพบ โดย Manager เห็นเฉพาะทีมตัวเอง</p></div>
            <div className="card"><h3>ไม่วัดคนจากจำนวนการเข้าพบอย่างเดียว</h3><p>ดูความครอบคลุม Partner, การปิดงานติดตาม และโอกาสที่เกิดขึ้นประกอบกัน</p></div>
          </div>
        </div>
      ),
      notes: 'ถ้ามีเวลาน้อย ข้ามหน้านี้แล้วโชว์ใน live demo แทน ประเด็นที่ระบบสรุปเป็นข้อสังเกตให้พิจารณา ไม่ใช่ข้อสรุปสุดท้าย และตัวอย่าง Feedback ใน demo ยังน้อย',
    },
    {
      id: 'brand', kicker: 'แบรนด์และการใช้งาน',
      title: 'ชื่อ มาสคอต และสีออกแบบให้เป็นมิตร เพื่อให้ทีมอยากเปิดใช้ทุกวัน',
      body: (
        <div className="body">
          <div className="col" style={{ flex: 1.7 }}>
            <div className="shot"><img src={`${IMG}brand-board.webp`} alt="Brand board นัดโตะ: โลโก้ สี ตัวอักษร ลวดลาย และท่าทางมาสคอต" /></div>
          </div>
          <div className="col">
            <div className="card"><h3>"หนึ่งนัด หนึ่งเมล็ด หนึ่งก้าวของการเติบโต"</h3><p>ถั่วนัตโตะเม็ดเล็กๆ เทียบกับการเข้าพบแต่ละครั้งที่ต่อยอดเป็นการเติบโต</p></div>
            <div className="card"><h3>มาสคอตบอกสถานะในแอป</h3><p>กำลังวิเคราะห์, ไม่มีข้อมูล, เกิดข้อผิดพลาด, บันทึกสำเร็จ และไม่บังข้อมูลธุรกิจ</p></div>
            <div className="card" style={{ background: 'var(--cream)' }}><p className="small">การที่ทีมจะเปิดใช้ทุกวันจริงหรือไม่ยังเป็นสมมติฐาน ซึ่ง pilot จะวัดผลข้อนี้</p></div>
          </div>
        </div>
      ),
      notes: 'หน้านี้ตอบคำถามว่าทำไมต้องมีแบรนด์ เครื่องมือภายในที่ไม่มีใครเปิดก็ไม่สร้างผล ดีไซน์ที่เป็นมิตรช่วยเรื่องการใช้งาน แต่ต้องพิสูจน์ด้วยตัวชี้วัดใน pilot',
    },
    {
      id: 'demo', kicker: 'Live demo · 5–7 นาที',
      title: 'Demo: จากสัญญาณในข้อมูลถึงประเด็นบนโต๊ะผู้บริหาร ในบัญชีเดียว',
      body: (
        <div className="body">
          <div className="col">
            <table className="table">
              <thead><tr><th>#</th><th>ทำอะไร</th><th>ประเด็นที่พูด</th></tr></thead>
              <tbody>
                <tr><td>1</td><td>เข้าเป็น <b>กิตติ</b> (Marketing) ดูหน้าหลัก</td><td>ไม่ต้องเดาว่าจะไปพบใคร</td></tr>
                <tr><td>2</td><td>เปิดคำแนะนำ <b>Broker A</b> ดูแท็บแนวโน้มและเหตุผล AI</td><td>มีเหตุผลและหลักฐาน</td></tr>
                <tr><td>3</td><td>กด <b>เตรียมเข้าพบ</b> ดูประเด็นพูดคุยและ Vehicle</td><td>รู้ว่าจะคุยอะไร</td></tr>
                <tr><td>4</td><td><b>บันทึกการเข้าพบ</b> ให้นัดโตะช่วยจัดหมวด 7P แล้วยืนยัน</td><td>Feedback มีโครงสร้าง</td></tr>
                <tr><td>5</td><td>สลับเป็น <b>วิภาวดี</b> (Manager) แล้วเป็น <b>อรุณี</b> (ผู้บริหาร)</td><td>เห็นผลทันทีตามสิทธิ์</td></tr>
                <tr><td>+</td><td>ค้นหาตามโจทย์ธุรกิจ: เจาะกลุ่ม EV</td><td>Dealer C ขึ้นอันดับ 1</td></tr>
              </tbody>
            </table>
          </div>
          <div className="col" style={{ flex: 'none', width: 320 }}>
            <a className="card" href="./index.html#/login" style={{ textDecoration: 'none', textAlign: 'center' }}>
              <img src={`${MASCOT}mascot-natto.webp`} alt="" style={{ width: 150, margin: '0 auto' }} />
              <h3>เปิด demo นัดโตะ</h3><p className="small muted">ก่อนเริ่มให้กด "รีเซ็ตข้อมูล demo" ที่หน้าโปรไฟล์</p>
            </a>
          </div>
        </div>
      ),
      notes: 'ลำดับนี้มาจาก spec ข้อ 13 ก่อนนำเสนอให้รีเซ็ตข้อมูล demo เพื่อให้คำแนะนำของกิตติยังไม่ถูกกด ถ้าอินเทอร์เน็ตมีปัญหา แอปยังทำงานได้เพราะเป็น static site ไม่ต้องต่อ backend มีแค่ฟอนต์ที่จะเปลี่ยนเป็นฟอนต์ของระบบ',
    },
    {
      id: 'decisions', kicker: 'ก่อนใช้ข้อมูลจริง',
      title: 'ก่อนใช้ข้อมูลจริงต้องตัดสินใจ 5 เรื่อง และแต่ละเรื่องต้องมีเจ้าของชัดเจน',
      body: (
        <div className="col table-wrap">
          <table className="table">
            <thead><tr><th>เรื่อง</th><th>สิ่งที่ต้องตัดสิน</th><th>ผู้ตัดสินที่เสนอ</th></tr></thead>
            <tbody>
              <tr><td><b>นิยามตัวชี้วัด</b></td><td>Renewal Rate (ตัวตั้ง ตัวหาร cohort), Renewal Premium และฐานของ Vehicle Mix ว่านับเป็นคันหรือตามเบี้ย</td><td>Data Owner</td></tr>
              <tr><td><b>น้ำหนักและเกณฑ์</b></td><td>น้ำหนัก 30/25/20/15/10 และ band สูง ≥{bands.high} / ปานกลาง ≥{bands.medium} ซึ่งตอนนี้เป็นค่าสมมติของ demo</td><td>Business Owner</td></tr>
              <tr><td><b>สูตรมูลค่าโอกาส</b></td><td>สูตรรายปี ×12 และสมมติฐานว่ายอดที่ได้จากการเพิ่ม Product Mix เป็นยอดใหม่</td><td>Business Owner / Actuarial</td></tr>
              <tr><td><b>กลุ่มเปรียบเทียบ</b></td><td>ใช้ประเภท Partner, ขนาด หรือภูมิภาค</td><td>Business Owner</td></tr>
              <tr><td><b>ข้อมูลและสิทธิ์</b></td><td>ระบบต้นทางของ Partner Master, รอบอัปเดตข้อมูล และการผูก Marketing กับ Partner</td><td>Data Owner / IT</td></tr>
            </tbody>
          </table>
          <p className="small muted" style={{ margin: 0 }}>มาจาก Open Questions ใน spec ข้อ 16 · ใน demo ทุกเกณฑ์อยู่ในไฟล์ตั้งค่าไฟล์เดียว จึงแก้ได้ทันทีเมื่อได้รับอนุมัติ</p>
        </div>
      ),
      notes: 'หน้านี้คือเหตุผลที่ต้องมีข้อ 3 ในสิ่งที่ขออนุมัติ ถ้าไม่มีคนอนุมัติเกณฑ์ ตัวเลขในระบบจะไม่มีใครรับรอง ข้อสังเกต: band ตาม spec (80/60) ใช้กับคะแนนแบบบวกไม่ได้ จึงปรับเป็น 60/30 ใน demo',
    },
    {
      id: 'pilot', kicker: 'การวัดผล Pilot',
      title: 'Pilot วัดพฤติกรรมการทำงานก่อน ส่วนยอดขายจะวัดหลังเห็นผลจริง',
      body: (
        <div className="col table-wrap">
          <table className="table">
            <thead><tr><th>ตัวชี้วัด</th><th>นิยาม</th><th>ตอบคำถามอะไร</th></tr></thead>
            <tbody>
              <tr><td><b>อัตราการใช้คำแนะนำ</b></td><td>คำแนะนำที่กด "เตรียมเข้าพบ" หรือ "วางแผนติดต่อ" ÷ คำแนะนำทั้งหมด</td><td>ทีมเชื่อคำแนะนำหรือไม่</td></tr>
              <tr><td><b>เหตุผลที่ไม่รับคำแนะนำ</b></td><td>สัดส่วนของ "ข้อมูลไม่ตรงกับสถานการณ์จริง" และ "ไม่เกี่ยวข้อง"</td><td>engine แนะนำผิดตรงไหน</td></tr>
              <tr><td><b>ความครบของ Feedback</b></td><td>การเข้าพบที่มี Feedback 7P อย่างน้อย 1 หมวด ÷ การเข้าพบทั้งหมด</td><td>ข้อมูลหลังเข้าพบใช้ต่อได้ไหม</td></tr>
              <tr><td><b>การครอบคลุม Partner</b></td><td>Partner ที่ได้เข้าพบใน 90 วัน ÷ Partner ที่ดูแล</td><td>ทีมไปพบ Partner ครบขึ้นไหม</td></tr>
              <tr><td><b>การปิดงานติดตาม</b></td><td>งานติดตามที่เสร็จตามกำหนด ÷ งานติดตามทั้งหมด</td><td>สิ่งที่รับปากไว้ได้ทำจริงไหม</td></tr>
            </tbody>
          </table>
          <div className="card" style={{ background: 'var(--cream)' }}><p><b>ยังไม่ตั้งเป้าเป็นตัวเลข</b> เพราะยังไม่มี baseline ของการเข้าพบจริง เสนอให้เก็บ baseline ในเดือนแรก แล้วตั้งเป้าร่วมกับ Manager ของทีม</p></div>
        </div>
      ),
      notes: 'ทุกตัวชี้วัดในหน้านี้ dashboard ของ demo คำนวณได้แล้ว ถ้าผู้ฟังถามเรื่อง ROI ให้ตอบตรงๆ ว่ายังไม่มีข้อมูลต้นทุนและ baseline จึงยังประเมิน ROI ไม่ได้ และไม่ควรเดาตัวเลข',
    },
    {
      id: 'next', kicker: 'สรุป',
      title: 'วันนี้ขออนุมัติ 3 เรื่องเพื่อเริ่ม Pilot และตัดสินใจขยายผลเมื่อจบเดือนที่ 3',
      body: (
        <div className="col">
          <div className="timeline">
            <div className="card"><div className="when">เดือน 0 · เตรียม</div><ul><li>Business Owner อนุมัตินิยามและเกณฑ์</li><li>Data Owner ส่งข้อมูลรายเดือนแบบ aggregated</li><li>เลือกทีม pilot และผูก Partner กับผู้ดูแล</li></ul></div>
            <div className="card"><div className="when">เดือน 1–3 · ทดลองใช้</div><ul><li>เดือน 1 เก็บ baseline</li><li>ทบทวนคำแนะนำที่ถูกปฏิเสธทุกเดือน</li><li>ปรับเกณฑ์ผ่าน Business Owner เท่านั้น</li></ul></div>
            <div className="card"><div className="when">จบเดือน 3 · ตัดสินใจ</div><ul><li>ขยายผล, ปรับแล้วทดลองต่อ หรือหยุด</li><li>ตัดสินจาก 5 ตัวชี้วัดในหน้าก่อน</li></ul></div>
          </div>
          <div className="body" style={{ alignItems: 'center' }}>
            <div className="card" style={{ flex: 1 }}>
              <h3>สิ่งที่ขออนุมัติวันนี้</h3>
              <ul><li>Pilot 1 ทีม 3 เดือน</li><li>Data Owner เปิดข้อมูลรายเดือนระดับ Partner (ไม่ใช้ข้อมูลส่วนบุคคลของลูกค้า)</li><li>แต่งตั้ง Business Owner อนุมัติเกณฑ์และสูตร</li></ul>
            </div>
            <img src={`${MASCOT}mascot-success.webp`} alt="" style={{ width: 200, flex: 'none' }} className="hide-reading" />
          </div>
          <p className="small muted" style={{ margin: 0 }}>ไทม์ไลน์เป็นข้อเสนอเบื้องต้น · เรื่องการรับประกัน สินไหม และกฎระเบียบที่เกี่ยวข้อง ต้องให้ผู้เชี่ยวชาญตรวจสอบก่อนใช้งานจริง</p>
        </div>
      ),
      notes: 'ปิดด้วยการทวนสิ่งที่ขออนุมัติ แล้วถามตรงๆ ว่าอนุมัติได้ไหม หรือติดเรื่องไหน ถ้าติดเรื่องข้อมูล ให้เสนอเริ่มเดือน 0 ไปก่อน (นิยามและเกณฑ์) ซึ่งยังไม่ต้องใช้ข้อมูลจริง',
    },
  ];

  return <DeckView slides={slides} footer={['นัดโตะ (NATTO) · ข้อเสนอสำหรับ Head of Marketing', 'ร่างสำหรับพิจารณา · ข้อมูลใน demo เป็นข้อมูลจำลอง']} />;
}
