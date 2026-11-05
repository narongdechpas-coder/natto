// AI-assisted 7P suggestion for the MVP: transparent keyword rules (Thai).
// Marketing must review and confirm every suggestion before saving (spec §4.8).
import type { Sentiment, SevenP } from '../domain/types';

const KEYWORDS: Record<SevenP, string[]> = {
  Product: ['ความคุ้มครอง', 'คุ้มครอง', 'เงื่อนไข', 'ผลิตภัณฑ์', 'ซ่อมห้าง', 'แบตเตอรี่', 'ทุนประกัน', 'แผนประกัน', 'PA', 'Non-Motor'],
  Price: ['ราคา', 'เบี้ย', 'ส่วนลด', 'แพง', 'ถูกกว่า', 'คอมมิชชัน', 'ค่าตอบแทน'],
  Place: ['อู่', 'ช่องทาง', 'สาขา', 'พื้นที่', 'ศูนย์ซ่อม', 'ออนไลน์', 'ต่างจังหวัด'],
  Promotion: ['แคมเปญ', 'โปรโมชั่น', 'โปรโมชัน', 'ของแถม', 'สื่อขาย', 'โฆษณา', 'กิจกรรม', 'สื่อสาร', 'ประชาสัมพันธ์'],
  People: ['พนักงาน', 'เจ้าหน้าที่', 'อบรม', 'ทีมขาย', 'ตอบช้า', 'ความรู้', 'มารยาท'],
  Process: ['ช้า', 'ขั้นตอน', 'เคลม', 'ออกกรมธรรม์', 'อนุมัติ', 'ระบบ', 'รอนาน', 'ให้บริการ', 'ระยะเวลา'],
  PhysicalEvidence: ['คู่มือ', 'โบรชัวร์', 'เอกสารสรุป', 'เอกสาร', 'ป้าย', 'สื่อสิ่งพิมพ์', 'แบรนด์'],
};
/** A clause that matches the key word is NOT counted for that category (e.g. "ช่องทางการสื่อสาร" is communication, not distribution). */
const EXCLUDE: Partial<Record<SevenP, string[]>> = {
  Place: ['สื่อสาร'],
  Process: ['ตอบช้า'],
};
const NEG = ['ไม่', 'ช้า', 'แพง', 'ปัญหา', 'ย้าย', 'ยกเลิก', 'ร้องเรียน', 'น้อยกว่า', 'ลดลง', 'น้อย', 'ยาก', 'รอนาน', 'ควรเพิ่ม', 'ควรปรับ', 'ควรมี', 'ขาด'];
const POS = ['ดี', 'ชอบ', 'สะดวก', 'เร็ว', 'พอใจ', 'ขายง่าย', 'ตอบรับ', 'สนใจ'];

export interface SevenPSuggestion { category: SevenP; sentiment: Sentiment; matched: string[]; clauses: string[] }

const THAI = /[฀-๿]/;
const CONJ = /^(และ|แต่|ส่วน|รวมถึง|อีกทั้ง)/;

/**
 * Splits a Thai note into clauses. Thai uses spaces between clauses, so spaces (and punctuation / new lines) end a clause.
 * Non-Thai tokens (e.g. "Partner", "1", "EV") stay attached to the surrounding words so "ประเภท 1 แพงกว่า" stays one clause.
 */
export function splitClauses(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/[\n.;!?]+/)) {
    let cur = '';
    let glue = false;
    for (const tok of part.split(/[\s,]+/).filter(Boolean)) {
      if (!THAI.test(tok)) { cur = cur ? `${cur} ${tok}` : tok; glue = true; continue; }
      if (!cur || glue) { cur = cur ? `${cur} ${tok}` : tok; glue = false; continue; }
      out.push(cur);
      cur = tok;
    }
    if (cur) out.push(cur);
  }
  return out.map((c) => c.replace(CONJ, '').trim()).filter(Boolean);
}

/** Suggests a 7P category + sentiment for each clause, and keeps only the clauses that mention that category. */
export function suggest7P(text: string): SevenPSuggestion[] {
  const found = new Map<SevenP, SevenPSuggestion>();
  for (const c of splitClauses(text)) {
    const neg = NEG.filter((w) => c.includes(w)).length;
    const pos = POS.filter((w) => c.includes(w)).length;
    const sentiment: Sentiment = neg > pos ? 'negative' : pos > neg ? 'positive' : 'neutral';
    for (const [cat, words] of Object.entries(KEYWORDS) as [SevenP, string[]][]) {
      if (EXCLUDE[cat]?.some((w) => c.includes(w))) continue;
      const hits = words.filter((w) => c.includes(w));
      if (!hits.length) continue;
      const prev = found.get(cat);
      if (!prev) found.set(cat, { category: cat, sentiment, matched: hits, clauses: [c] });
      else {
        prev.matched.push(...hits);
        if (!prev.clauses.includes(c)) prev.clauses.push(c);
        if (sentiment === 'negative' || (prev.sentiment === 'neutral' && sentiment === 'positive')) prev.sentiment = sentiment;
      }
    }
  }
  return [...found.values()];
}
