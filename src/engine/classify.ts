// AI-assisted 7P suggestion for the MVP: transparent keyword rules (Thai).
// Marketing must review and confirm every suggestion before saving (spec §4.8).
import type { Sentiment, SevenP } from '../domain/types';

const KEYWORDS: Record<SevenP, string[]> = {
  Product: ['ความคุ้มครอง', 'คุ้มครอง', 'เงื่อนไข', 'ผลิตภัณฑ์', 'ซ่อมห้าง', 'แบตเตอรี่', 'ทุนประกัน', 'แผนประกัน', 'PA', 'Non-Motor'],
  Price: ['ราคา', 'เบี้ย', 'ส่วนลด', 'แพง', 'ถูกกว่า', 'คอมมิชชัน', 'ค่าตอบแทน'],
  Place: ['อู่', 'ช่องทาง', 'สาขา', 'พื้นที่', 'ศูนย์ซ่อม', 'ออนไลน์', 'ต่างจังหวัด'],
  Promotion: ['แคมเปญ', 'โปรโมชั่น', 'โปรโมชัน', 'ของแถม', 'สื่อขาย', 'โฆษณา', 'กิจกรรม'],
  People: ['พนักงาน', 'เจ้าหน้าที่', 'บริการ', 'อบรม', 'ทีมขาย', 'ตอบช้า', 'ความรู้'],
  Process: ['ช้า', 'ขั้นตอน', 'เคลม', 'ออกกรมธรรม์', 'อนุมัติ', 'ระบบ', 'รอนาน'],
  PhysicalEvidence: ['คู่มือ', 'โบรชัวร์', 'เอกสารสรุป', 'เอกสาร', 'ป้าย', 'สื่อสิ่งพิมพ์', 'แบรนด์'],
};
const NEG = ['ไม่', 'ช้า', 'แพง', 'ปัญหา', 'ย้าย', 'ยกเลิก', 'ร้องเรียน', 'ไม่พอใจ', 'ลดลง', 'น้อย', 'ยาก', 'รอนาน'];
const POS = ['ดี', 'ชอบ', 'สะดวก', 'เร็ว', 'พอใจ', 'ขายง่าย', 'ตอบรับ', 'สนใจ'];

export interface SevenPSuggestion { category: SevenP; sentiment: Sentiment; matched: string[] }

/** Splits the note into clauses and suggests a 7P category + sentiment for each matched clause. */
export function suggest7P(text: string): SevenPSuggestion[] {
  const clauses = text.split(/[\n.,;]|และ|แต่/).map((s) => s.trim()).filter(Boolean);
  const found = new Map<SevenP, SevenPSuggestion>();
  for (const c of clauses) {
    for (const [cat, words] of Object.entries(KEYWORDS) as [SevenP, string[]][]) {
      const hits = words.filter((w) => c.includes(w));
      if (!hits.length) continue;
      const neg = NEG.filter((w) => c.includes(w)).length;
      const pos = POS.filter((w) => c.includes(w)).length;
      const sentiment: Sentiment = neg > pos ? 'negative' : pos > neg ? 'positive' : 'neutral';
      const prev = found.get(cat);
      if (!prev) found.set(cat, { category: cat, sentiment, matched: hits });
      else {
        prev.matched.push(...hits);
        if (sentiment === 'negative') prev.sentiment = 'negative';
      }
    }
  }
  return [...found.values()];
}
