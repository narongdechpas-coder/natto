import type { ProductCategory, Sentiment, SevenP } from '../domain/types';

// DEMO DATA — synthetic Partner feedback phrases (Thai UI content).
export interface FeedbackTemplate {
  category: SevenP;
  sentiment: Sentiment;
  detail: string;
  productLine: ProductCategory | null;
  dept: string | null;
  action: string | null;
}

export const FEEDBACK_TEMPLATES: FeedbackTemplate[] = [
  // Product
  { category: 'Product', sentiment: 'negative', detail: 'เงื่อนไขซ่อมห้างไม่ครอบคลุมรถอายุเกิน 5 ปี ลูกค้าย้ายไปเจ้าอื่น', productLine: 'T1', dept: 'Product', action: 'ส่งเรื่องทีม Product ทบทวนเงื่อนไขซ่อมห้าง' },
  { category: 'Product', sentiment: 'negative', detail: 'ความคุ้มครองแบตเตอรี่รถ EV ยังไม่ชัด Partner ตอบลูกค้าไม่ได้', productLine: 'T1', dept: 'Product', action: 'ขอสรุปความคุ้มครองแบตเตอรี่ EV จากทีม Product' },
  { category: 'Product', sentiment: 'neutral', detail: 'สนใจแผน Non-Motor (PA) สำหรับลูกค้าที่ซื้อรถใหม่', productLine: 'NONMOTOR', dept: null, action: 'ส่งข้อมูลผลิตภัณฑ์ PA ให้ Partner' },
  { category: 'Product', sentiment: 'positive', detail: 'ประเภท 2+ ขายง่าย ลูกค้ารถอายุ 5-8 ปีตอบรับดี', productLine: 'T23P', dept: null, action: null },
  // Price
  { category: 'Price', sentiment: 'negative', detail: 'เบี้ยประเภท 1 สูงกว่าคู่แข่งในกลุ่มรถกระบะ', productLine: 'T1', dept: 'Underwriting', action: 'ส่งข้อมูลเปรียบเทียบเบี้ยให้ทีม UW พิจารณา' },
  { category: 'Price', sentiment: 'negative', detail: 'ส่วนลดต่ออายุน้อยกว่าที่คู่แข่งเสนอ', productLine: 'T1', dept: 'Underwriting', action: 'ขอทบทวนส่วนลดต่ออายุสำหรับลูกค้าเดิม' },
  { category: 'Price', sentiment: 'neutral', detail: 'ราคาอยู่ในระดับตลาด ไม่ใช่ประเด็นหลัก', productLine: null, dept: null, action: null },
  // Place
  { category: 'Place', sentiment: 'negative', detail: 'อู่ในเครือในต่างจังหวัดมีน้อย ลูกค้าต้องรอคิวซ่อมนาน', productLine: 'T1', dept: 'Claims', action: 'ส่งรายชื่อพื้นที่ที่อู่ไม่พอให้ทีม Claims' },
  { category: 'Place', sentiment: 'positive', detail: 'ระบบออกกรมธรรม์ออนไลน์ช่วยให้ปิดการขายหน้าโชว์รูมได้เร็ว', productLine: null, dept: null, action: null },
  // Promotion
  { category: 'Promotion', sentiment: 'negative', detail: 'แคมเปญไตรมาสนี้ไม่ดึงดูด ลูกค้าเทียบกับของแถมคู่แข่ง', productLine: null, dept: 'Marketing', action: 'เสนอแคมเปญร่วมไตรมาสถัดไป' },
  { category: 'Promotion', sentiment: 'positive', detail: 'สื่อขาย EV ชุดใหม่ใช้งานได้ดี พนักงานขายชอบ', productLine: null, dept: null, action: null },
  { category: 'Promotion', sentiment: 'neutral', detail: 'ขอสื่อขายฉบับย่อสำหรับพนักงานขายหน้าร้าน', productLine: null, dept: 'Marketing', action: 'จัดทำสื่อขายฉบับย่อ' },
  // People
  { category: 'People', sentiment: 'positive', detail: 'เจ้าหน้าที่ดูแลตอบเร็วและให้ข้อมูลครบ', productLine: null, dept: null, action: null },
  { category: 'People', sentiment: 'negative', detail: 'ทีมพนักงานขายของ Partner ยังไม่เข้าใจความคุ้มครองใหม่', productLine: null, dept: 'Training', action: 'จัดอบรมพนักงานขายของ Partner' },
  // Process
  { category: 'Process', sentiment: 'negative', detail: 'ออกกรมธรรม์ช้า 3-5 วันทำการ ลูกค้าบางรายยกเลิก', productLine: null, dept: 'Operations', action: 'ติดตามระยะเวลาออกกรมธรรม์กับทีม Operations' },
  { category: 'Process', sentiment: 'negative', detail: 'ขั้นตอนเคลมต้องใช้เอกสารหลายรอบ', productLine: null, dept: 'Claims', action: 'ส่งเรื่องทีม Claims ทบทวนรายการเอกสาร' },
  { category: 'Process', sentiment: 'positive', detail: 'กระบวนการแจ้งงานผ่าน LINE OA สะดวกขึ้นมาก', productLine: null, dept: null, action: null },
  // Physical Evidence
  { category: 'PhysicalEvidence', sentiment: 'neutral', detail: 'ขอเอกสารสรุปความคุ้มครองแบบหน้าเดียวสำหรับลูกค้า', productLine: null, dept: 'Marketing', action: 'จัดทำเอกสารสรุปหน้าเดียว' },
  { category: 'PhysicalEvidence', sentiment: 'negative', detail: 'คู่มือผลิตภัณฑ์ยังเป็นฉบับเก่า ข้อมูลไม่ตรงกับปัจจุบัน', productLine: null, dept: 'Marketing', action: 'อัปเดตคู่มือผลิตภัณฑ์' },
];
