// Thai UI labels. All user-facing text lives here or in the explain layer.
import type {
  Confidence, DecisionReason, DecisionType, FollowUpStatus, FuelType, OpportunityStage, OpportunityType,
  PartnerType, Priority, ProductCategory, Sentiment, SevenP, Severity, SignalKey, VisitOutcome, VisitStatus,
} from './types';

export const PRODUCT_LABEL: Record<ProductCategory, string> = {
  T1: 'ประเภท 1', T23P: 'ประเภท 2+/3+', T3: 'ประเภท 3', CMI: 'พ.ร.บ.', NONMOTOR: 'Non-Motor (PA)',
};
export const FUEL_LABEL: Record<FuelType, string> = { ICE: 'น้ำมัน (ICE)', HYBRID: 'Hybrid', EV: 'EV' };
export const PARTNER_TYPE_LABEL: Record<PartnerType, string> = { Broker: 'Broker', Dealer: 'Dealer', Bank: 'Bank' };
export const PRIORITY_LABEL: Record<Priority, string> = { high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ' };
export const CONFIDENCE_LABEL: Record<Confidence, string> = { high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ' };
export const SIGNAL_LABEL: Record<SignalKey, string> = {
  renewal: 'ความเสี่ยงด้าน Renewal',
  sales: 'ยอดขายลดลง',
  mix: 'โอกาสด้าน Product Mix',
  segment: 'กลุ่มรถ EV',
  contact: 'การติดตามงานค้าง',
};
export const OPPORTUNITY_LABEL: Record<OpportunityType, string> = {
  renewal_retention: 'รักษาฐาน Renewal',
  sales_recovery: 'ฟื้นยอดขาย',
  product_mix: 'ขยาย Product Mix',
  ev_segment: 'โอกาสกลุ่มรถ EV',
  partner_growth: 'ขยายความร่วมมือ',
  follow_up: 'ปิดงานติดตาม',
};
export const STAGE_LABEL: Record<OpportunityStage, string> = {
  identified: 'พบโอกาส', qualified: 'คัดกรองแล้ว', in_progress: 'กำลังดำเนินการ', won: 'สำเร็จ', closed_lost: 'ปิด (ไม่สำเร็จ)',
};
export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  planned: 'วางแผนแล้ว', visited: 'เข้าพบแล้ว', rescheduled: 'เลื่อนนัด', not_visited: 'ไม่ได้เข้าพบ',
};
export const OUTCOME_LABEL: Record<VisitOutcome, string> = {
  met_objective: 'เป็นไปตามเป้าหมาย', partial: 'บางส่วน', not_met: 'ยังไม่ตามเป้า',
};
export const SEVEN_P_LABEL: Record<SevenP, string> = {
  Product: 'Product', Price: 'Price', Place: 'Place', Promotion: 'Promotion', People: 'People', Process: 'Process',
  PhysicalEvidence: 'Physical Evidence',
};
export const SEVEN_P_THAI: Record<SevenP, string> = {
  Product: 'ผลิตภัณฑ์', Price: 'ราคา', Place: 'ช่องทาง/พื้นที่', Promotion: 'การส่งเสริมการขาย', People: 'บุคลากร',
  Process: 'กระบวนการ', PhysicalEvidence: 'เอกสาร/สื่อ',
};
/** Board M05 uses ดี / ปกติ / ต้องปรับ — mapped to sentiment. */
export const SENTIMENT_LABEL: Record<Sentiment, string> = { positive: 'ดี', neutral: 'ปกติ', negative: 'ต้องปรับ' };
export const SEVERITY_LABEL: Record<Severity, string> = { high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ' };
export const FOLLOWUP_STATUS_LABEL: Record<FollowUpStatus, string> = { open: 'ยังไม่เริ่ม', in_progress: 'ระหว่างดำเนินการ', done: 'เสร็จสิ้น' };
export const DECISION_LABEL: Record<DecisionType, string> = {
  prepare: 'เตรียมเข้าพบ', plan_contact: 'วางแผนติดต่อ', not_now: 'ไม่ใช่ตอนนี้', not_relevant: 'ไม่เกี่ยวข้อง',
};
export const DECISION_REASON_LABEL: Record<DecisionReason, string> = {
  recently_visited: 'เพิ่งเข้าพบไปแล้ว',
  already_discussed: 'คุยเรื่องนี้กับ Partner แล้ว',
  partner_not_ready: 'Partner ยังไม่พร้อม',
  relationship_context: 'มีบริบทความสัมพันธ์/ภายใน',
  data_mismatch: 'ข้อมูลไม่ตรงกับสถานการณ์จริง',
  other: 'อื่นๆ',
};

const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
/** '2026-10' → 'ต.ค. 2026' (ค.ศ. ตาม concept board) */
export const fmtMonth = (m: string) => `${TH_MONTH[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
export const fmtMonthShort = (m: string) => TH_MONTH[Number(m.slice(5, 7)) - 1];
/** '2026-10-31' → '31 ต.ค. 2026' */
export const fmtDate = (d: string) => `${Number(d.slice(8, 10))} ${fmtMonth(d.slice(0, 7))}`;
export const fmtMB = (thb: number | null, digits = 1) => (thb == null ? '—' : `${(thb / 1e6).toFixed(digits)} ลบ.`);
export const fmtMillion = (thb: number | null, digits = 1) => (thb == null ? '—' : `${(thb / 1e6).toFixed(digits)} ล้านบาท`);
export const fmtPct = (x: number | null, digits = 1) => (x == null ? '—' : `${(x * 100).toFixed(digits)}%`);
export const fmtPp = (pp: number, digits = 1) => `${pp > 0 ? '+' : pp < 0 ? '−' : ''}${Math.abs(pp).toFixed(digits)} pp`;
export const fmtSignedPct = (x: number | null, digits = 1) => (x == null ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toFixed(digits)}%`);
export const fmtInt = (n: number | null) => (n == null ? '—' : n.toLocaleString('th-TH'));
