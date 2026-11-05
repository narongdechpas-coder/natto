// "AI explanation" layer — Thai text generated ONLY from engine facts (no free-form generation).
// MVP uses deterministic templates so every number on screen is traceable to the dataset (spec §9.4).
// A real LLM can replace this layer later, fed with the same facts.
import type { FollowUp, Partner, ProductCategory, Recommendation, SignalKey, SignalResult } from '../domain/types';
import {
  CONFIDENCE_LABEL, OPPORTUNITY_LABEL, PRODUCT_LABEL, fmtDate, fmtMillion, fmtMonth, fmtPct, fmtPp,
} from '../domain/labels';

export interface TalkingPoint {
  signal: SignalKey;
  signalText: string; // Business Signal
  insight: string; // AI Insight
  topic: string; // Suggested Topic
  questions: string[]; // Discussion Questions
  objective: string; // Visit Objective
}

export interface Explanation {
  headline: string;
  reasons: string[];
  whyNow: string;
  talkingPoints: TalkingPoint[];
  visitObjective: string;
  opportunity: { label: string; valueText: string; formula: string | null; calc: string | null; assumptions: string[]; isEstimate: true };
  confidence: { level: string; notes: string[] };
}

const addMonths = (m: string, n: number) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
};
const absPct = (x: number) => `${Math.abs(x * 100).toFixed(1)}%`;
const get = (r: Recommendation, k: SignalKey) => r.signals.find((s) => s.key === k)!;

function reasonText(s: SignalResult, partner: Partner): string | null {
  const f = s.facts;
  if (!s.triggered) return null;
  if (s.key === 'renewal') {
    const e = s.evidence[0];
    const streak = Number(f.consecutiveDeclines) >= 2 ? ` ลดลงต่อเนื่อง ${f.consecutiveDeclines} เดือน` : '';
    return `Renewal Rate ลดลงจาก ${fmtPct(e.comparisonValue)} (${fmtMonth(e.comparisonPeriod!)}) เหลือ ${fmtPct(e.currentValue)} (${fmtMonth(e.currentPeriod!)}) คิดเป็น ${fmtPp(e.changePp!)}${streak}`;
  }
  if (s.key === 'sales') {
    const mom = s.evidence[0], qoq = s.evidence[1];
    const parts: string[] = [];
    if (Number(f.consecutiveDeclines) >= 2) {
      parts.push(`เบี้ยประกันลดลงต่อเนื่อง ${f.consecutiveDeclines} เดือน ล่าสุด ${fmtMonth(mom.currentPeriod!)} ลดลง ${absPct(mom.changePct!)} จากเดือนก่อน`);
    }
    if (qoq.changePct! < 0) parts.push(`เบี้ยประกัน 3 เดือนล่าสุดต่ำกว่า 3 เดือนก่อนหน้า ${absPct(qoq.changePct!)}`);
    return parts.join(' และ') || null;
  }
  if (s.key === 'mix') {
    const cat = (k: unknown) => PRODUCT_LABEL[k as ProductCategory];
    if (f.driver === 'share_decline') {
      const e = s.evidence.find((x) => x.metric.endsWith('_change'))!;
      return `สัดส่วน${cat(f.declCat)} ลดลงจาก ${fmtPct(e.comparisonValue)} (${fmtMonth(e.comparisonPeriod!)}) เหลือ ${fmtPct(e.currentValue)} (${fmtMonth(e.currentPeriod!)}) คิดเป็น ${fmtPp(e.changePp!)}`;
    }
    const e = s.evidence.find((x) => x.metric.endsWith('_vs_peer'))!;
    const base = `สัดส่วน ${cat(f.gapCat)} อยู่ที่ ${fmtPct(e.currentValue)} ต่ำกว่าค่ากลางของกลุ่ม ${partner.type} (${fmtPct(e.comparisonValue)}) ${Number(f.gapPp).toFixed(1)} pp`;
    if (f.driver === 'cross_sell') return `เบี้ยประกันโต ${absPct(Number(f.qoq))} เทียบไตรมาสก่อน แต่${base} จึงมีโอกาส cross-sell`;
    return base;
  }
  if (s.key === 'segment') {
    const e = s.evidence[0];
    return `สัดส่วนรถ EV ในพอร์ตอยู่ที่ ${fmtPct(e.currentValue)} (${fmtMonth(e.currentPeriod!)}) เปลี่ยนไป ${fmtPp(e.changePp!)} จาก ${fmtMonth(e.comparisonPeriod!)}`;
  }
  if (s.key === 'contact') {
    const parts: string[] = [];
    if (Number(f.overdueFollowUps) > 0) parts.push(`มีงานติดตามเกินกำหนด ${f.overdueFollowUps} รายการ`);
    if (f.lastVisitDate != null) parts.push(`เข้าพบครั้งล่าสุด ${fmtDate(String(f.lastVisitDate))}`);
    return parts.join(' และ');
  }
  return null;
}

function contextNote(s: SignalResult): string | null {
  // Non-triggered but relevant supporting facts
  if (s.key === 'renewal' && s.triggered) {
    const top = Number(s.facts.dueRank) <= Math.ceil(Number(s.facts.dueCount) / 4);
    return `เบี้ยต่ออายุที่ครบกำหนดใน 3 เดือนล่าสุดรวม ${fmtMillion(Number(s.facts.due3))}` +
      (top ? ` สูงเป็นอันดับ ${s.facts.dueRank} จาก ${s.facts.dueCount} Partner` : '');
  }
  if (s.key === 'contact' && !s.triggered && s.facts.daysSinceVisit != null && Number(s.facts.daysSinceVisit) >= 60) {
    return `ไม่ได้เข้าพบมา ${s.facts.daysSinceVisit} วัน นับถึงวันออกคำแนะนำ (ครั้งล่าสุด ${fmtDate(String(s.facts.lastVisitDate))})`;
  }
  if (s.key === 'contact' && !s.triggered && s.facts.daysSinceVisit == null) return 'ยังไม่มีประวัติการเข้าพบในระบบ';
  return null;
}

function headline(r: Recommendation): string {
  const s = get(r, r.primarySignal);
  const f = s.facts;
  switch (r.primarySignal) {
    case 'renewal': return `Renewal Rate ${fmtPp(s.evidence[0].changePp!)} ใน 3 เดือน`;
    case 'sales': return Number(f.consecutiveDeclines) >= 2
      ? `เบี้ยประกันลดลงต่อเนื่อง ${f.consecutiveDeclines} เดือน`
      : `เบี้ยประกันไตรมาสล่าสุด ${(Number(f.qoq) * 100).toFixed(1)}%`;
    case 'mix': return f.driver === 'share_decline'
      ? `สัดส่วน${PRODUCT_LABEL[f.declCat as ProductCategory]} ${fmtPp(-Number(f.declPp))} ใน 6 เดือน`
      : f.driver === 'cross_sell'
        ? `โตต่อเนื่อง มีโอกาสขาย ${PRODUCT_LABEL[f.gapCat as ProductCategory]}`
        : `${PRODUCT_LABEL[f.gapCat as ProductCategory]} ต่ำกว่ากลุ่ม ${Number(f.gapPp).toFixed(1)} pp`;
    case 'segment': return `รถ EV ${fmtPct(Number(f.evShare))} ของพอร์ต (${fmtPp(Number(f.changePp))} ใน 6 เดือน)`;
    case 'contact': return Number(f.overdueFollowUps) > 0 ? `งานติดตามเกินกำหนด ${f.overdueFollowUps} รายการ` : 'ไม่ได้เข้าพบนาน';
  }
}

const WHY_NOW: Record<SignalKey, string> = {
  renewal: 'Renewal Rate เพิ่งลดลงในไตรมาสล่าสุด และยังมีกรมธรรม์ครบกำหนดต่ออายุทุกเดือน ถ้าคุยตอนนี้ยังทันรอบต่ออายุถัดไป',
  sales: 'ยอดเพิ่งเริ่มลดในเดือนล่าสุด ยังเป็นช่วงที่หาสาเหตุและแก้ได้ก่อนกลายเป็นแนวโน้มยาว',
  mix: 'Partner มีฐานธุรกิจอยู่แล้ว การเพิ่มหมวดที่ยังขายน้อยใช้แรงน้อยกว่าหา Partner ใหม่',
  segment: 'พอร์ตรถ EV ของ Partner เปลี่ยนเร็วในช่วง 6 เดือน ควรเข้าใจความต้องการก่อนคู่แข่ง',
  contact: 'มีงานที่รับปากไว้กับ Partner และเลยกำหนดแล้ว ถ้าปล่อยไว้จะกระทบความเชื่อมั่น',
};

function talkingPoint(s: SignalResult, partner: Partner, followUps: FollowUp[]): TalkingPoint | null {
  const signalText = reasonText(s, partner);
  if (!signalText) return null;
  const f = s.facts;
  const cat = PRODUCT_LABEL[(f.gapCat ?? f.declCat) as ProductCategory] ?? '';
  switch (s.key) {
    case 'renewal': return {
      signal: s.key, signalText,
      insight: 'ฐานต่ออายุมีมูลค่าสูง การหลุดต่อเนื่องจะกระทบเบี้ยประกันรวมของ Partner',
      topic: 'สาเหตุที่ลูกค้าไม่ต่ออายุ',
      questions: [
        'ลูกค้าที่ไม่ต่ออายุใน 3 เดือนที่ผ่านมา ส่วนใหญ่ย้ายไปที่ไหน เพราะอะไร',
        'ราคาหรือเงื่อนไขของคู่แข่งต่างจากเราตรงไหน',
        'มีปัญหาบริการหรือการเคลมที่ทำให้ลูกค้าไม่ต่ออายุไหม',
      ],
      objective: 'รู้สาเหตุหลักที่ Renewal ลดลง และตกลงแผนรักษาฐานต่ออายุร่วมกัน',
    };
    case 'sales': return {
      signal: s.key, signalText,
      insight: 'ยอดลดลงหลายเดือนติด อาจมาจากความต้องการของลูกค้า การแข่งขัน หรือการส่งงานให้บริษัทอื่น',
      topic: 'ปัจจัยที่ทำให้ยอดขายลดลง',
      questions: [
        'ช่วงนี้ยอดลูกค้าใหม่ของ Partner เป็นอย่างไร',
        'ผลิตภัณฑ์ไหนขายได้น้อยลง',
        'Partner ส่งงานให้บริษัทประกันอื่นเพิ่มขึ้นไหม เพราะอะไร',
      ],
      objective: 'รู้สาเหตุที่ยอดลด และตกลงแผนฟื้นยอดในไตรมาสถัดไป',
    };
    case 'mix': return {
      signal: s.key, signalText,
      insight: f.driver === 'share_decline'
        ? `สัดส่วน${cat} ที่ลดลงอาจหมายถึงลูกค้าเปลี่ยนไปซื้อความคุ้มครองที่ต่ำลง หรือย้ายไปคู่แข่ง`
        : `Partner ยังขาย ${cat} น้อยกว่า Partner ประเภทเดียวกัน`,
      topic: f.driver === 'share_decline' ? `เหตุที่สัดส่วน${cat} ลดลง` : `โอกาสเพิ่มยอด ${cat}`,
      questions: [
        `ลูกค้าของ Partner ต้องการ ${cat} มากน้อยแค่ไหน`,
        `อะไรเป็นอุปสรรคในการขาย ${cat}`,
        'Partner ต้องการสื่อขายหรือการอบรมอะไรเพิ่ม',
      ],
      objective: `ตกลงเป้าหมายหรือแผนทดลองขาย ${cat} กับ Partner`,
    };
    case 'segment': return {
      signal: s.key, signalText,
      insight: 'ลูกค้ารถ EV มีความต้องการความคุ้มครองต่างจากรถน้ำมัน เช่น แบตเตอรี่และศูนย์ซ่อม',
      topic: 'ความต้องการของลูกค้ารถ EV',
      questions: [
        'ลูกค้ารถ EV ถามเรื่องความคุ้มครองอะไรบ่อยที่สุด',
        'Partner ต้องการผลิตภัณฑ์หรือบริการ EV แบบไหน',
        'Partner คาดว่ายอดรถ EV ในอีก 6 เดือนจะเป็นอย่างไร',
      ],
      objective: 'เข้าใจความต้องการลูกค้า EV และประเมินความพร้อมขายผลิตภัณฑ์ EV',
    };
    case 'contact': {
      const qs = followUps.map((u) => `อัปเดตความคืบหน้า: ${u.action} (กำหนด ${fmtDate(u.dueDate)})`);
      return {
        signal: s.key, signalText,
        insight: 'งานติดตามที่ค้างอยู่เป็นสิ่งที่ Partner รออยู่ ควรมีคำตอบก่อนคุยเรื่องใหม่',
        topic: 'ปิดงานค้างจากการเข้าพบครั้งก่อน',
        questions: qs.length ? qs : ['ทบทวนประเด็นที่ค้างจากการเข้าพบครั้งก่อน'],
        objective: 'แจ้งความคืบหน้างานค้าง และยืนยันว่าประเด็นได้รับการแก้ไข',
      };
    }
  }
}

function opportunityText(r: Recommendation): Explanation['opportunity'] {
  const o = r.opportunity;
  const label = OPPORTUNITY_LABEL[o.type];
  const dataMonth = addMonths(r.batchMonth, -1);
  const common = ['เป็นประมาณการเพื่อจัดลำดับความสำคัญ ไม่ใช่รายได้จริงหรือการพยากรณ์', 'สูตรและสมมติฐานเป็นข้อเสนอสำหรับ demo รอ Business Owner อนุมัติ'];
  if (o.value == null) {
    const why: Record<string, string> = {
      no_ev_premium_basis: 'ยังประเมินมูลค่าไม่ได้ เพราะยังไม่มีเบี้ยเฉลี่ยต่อคันของผลิตภัณฑ์ EV ที่อนุมัติ',
      not_applicable: 'ไม่ประเมินมูลค่า เพราะคำแนะนำนี้มาจากงานติดตามที่ค้าง',
      missing_month: 'ข้อมูลไม่พอสำหรับคำนวณ (มีเดือนที่ไม่มีข้อมูล)',
      no_quarter_decline: 'ไม่ประเมินมูลค่า เพราะเบี้ยประกันรายไตรมาสไม่ได้ลดลง',
      no_peer_gap: 'ไม่ประเมินมูลค่า เพราะสัดส่วนไม่ได้ต่ำกว่าค่ากลางของกลุ่ม',
    };
    return { label, valueText: why[o.insufficientReason ?? ''] ?? 'ข้อมูลไม่พอ', formula: null, calc: null, assumptions: [], isEstimate: true };
  }
  const i = o.inputs;
  const valueText = `≈ ${fmtMillion(o.value)} ต่อปี (ประมาณการ)`;
  if (o.formula === 'renewal_gap_x_due_x12') {
    return {
      label, valueText, isEstimate: true,
      formula: '(Renewal Rate ฐาน − Renewal Rate ล่าสุด) × เบี้ยต่ออายุครบกำหนดเฉลี่ยต่อเดือน × 12',
      calc: `(${fmtPct(i.baselineRate!)} − ${fmtPct(i.currentRate!)}) × ${fmtMillion(i.avgMonthlyRenewalDue!, 2)} × 12 = ${fmtMillion(o.value)}`,
      assumptions: [
        `Renewal Rate ฐาน = ค่าเฉลี่ย ${fmtMonth(addMonths(dataMonth, -5))} – ${fmtMonth(addMonths(dataMonth, -3))}`,
        `เบี้ยครบกำหนดต่อเดือนเท่ากับค่าเฉลี่ย 3 เดือนล่าสุด (${fmtMonth(addMonths(dataMonth, -2))} – ${fmtMonth(dataMonth)})`,
        'Renewal Rate อยู่ที่ระดับล่าสุดต่อไปอีก 12 เดือน ถ้าไม่มีการแก้ไข',
        ...common,
      ],
    };
  }
  if (o.formula === 'qoq_gap_monthly_x12') {
    return {
      label, valueText, isEstimate: true,
      formula: '(เบี้ยประกันเฉลี่ยต่อเดือน 3 เดือนก่อนหน้า − 3 เดือนล่าสุด) × 12',
      calc: `(${fmtMillion(i.avgMonthlyPrev3!, 2)} − ${fmtMillion(i.avgMonthlyLast3!, 2)}) × 12 = ${fmtMillion(o.value)}`,
      assumptions: ['ถ้ายอดกลับไปเท่าระดับไตรมาสก่อนหน้าได้ตลอด 12 เดือน', ...common],
    };
  }
  return {
    label, valueText, isEstimate: true,
    formula: '(ค่ากลางสัดส่วนของกลุ่ม − สัดส่วนของ Partner) × เบี้ยประกันเฉลี่ยต่อเดือน × 12',
    calc: `${i.gapPp!.toFixed(1)} pp × ${fmtMillion(i.avgMonthlyPremium!, 2)} × 12 = ${fmtMillion(o.value)}`,
    assumptions: ['เบี้ยส่วนเพิ่มเป็นยอดใหม่ ไม่ได้ย้ายมาจากหมวดอื่น', 'กลุ่มเปรียบเทียบ = Partner ประเภทเดียวกัน (รอยืนยันเกณฑ์ peer group)', ...common],
  };
}

const CONF_NOTE: Record<string, string> = {
  missing_month_in_window: 'มีเดือนที่ไม่มีข้อมูลในช่วง 7 เดือนล่าสุด ระบบไม่นับเดือนนั้นเป็นศูนย์ และตัดตัวชี้วัดที่คำนวณไม่ได้ออก',
  small_renewal_base: 'ฐานกรมธรรม์ต่ออายุต่อเดือนน้อย Renewal Rate จึงแกว่งได้ง่าย',
};

export function explain(r: Recommendation, partner: Partner, followUps: FollowUp[] = []): Explanation {
  const ordered = [r.primarySignal, ...(['renewal', 'sales', 'mix', 'segment', 'contact'] as SignalKey[]).filter((k) => k !== r.primarySignal)];
  const reasons: string[] = [];
  for (const k of ordered) {
    const s = get(r, k);
    const t = reasonText(s, partner);
    if (t) reasons.push(t);
    const c = contextNote(s);
    if (c) reasons.push(c);
  }
  const talkingPoints = ordered
    .map((k) => get(r, k))
    .filter((s) => s.triggered)
    .map((s) => talkingPoint(s, partner, followUps))
    .filter((x): x is TalkingPoint => x != null);
  return {
    headline: headline(r),
    reasons,
    whyNow: r.primarySignal === 'mix' && get(r, 'mix').facts.driver === 'cross_sell'
      ? 'Partner กำลังโต เป็นจังหวะที่ดีในการเสนอผลิตภัณฑ์เพิ่มก่อนคู่แข่ง'
      : WHY_NOW[r.primarySignal],
    talkingPoints,
    visitObjective: talkingPoints[0]?.objective ?? '',
    opportunity: opportunityText(r),
    confidence: {
      level: CONFIDENCE_LABEL[r.confidence],
      notes: r.confidenceReasons.length ? r.confidenceReasons.map((c) => CONF_NOTE[c]) : ['ข้อมูลครบทุกเดือนในช่วงที่ใช้คำนวณ'],
    },
  };
}
