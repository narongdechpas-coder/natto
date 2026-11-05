import type { Feedback, FollowUp, Partner, Severity, Visit, VisitOutcome, VisitStatus } from '../domain/types';
import { DEMO_TODAY, SEED } from './config';
import { FEEDBACK_TEMPLATES, type FeedbackTemplate } from './feedbackTemplates';
import { between, mulberry32, pick } from './random';

// DEMO DATA — synthetic visit history, feedback and follow-ups.

interface HeroVisit {
  partnerId: string;
  date: string;
  status: VisitStatus;
  outcome: VisitOutcome | null;
  objective: string;
  summary: string;
  feedback: { t: number; severity?: Severity }[]; // index into FEEDBACK_TEMPLATES
  followUp?: { due: string; completed: string | null; owner: string };
}

const T = (cat: string, sentiment: string, i = 0) => {
  const list = FEEDBACK_TEMPLATES.map((f, idx) => ({ f, idx })).filter((x) => x.f.category === cat && x.f.sentiment === sentiment);
  return list[i].idx;
};

const HERO_VISITS: HeroVisit[] = [
  { partnerId: 'P001', date: '2026-02-18', status: 'visited', outcome: 'met_objective', objective: 'ทบทวนเป้าหมายปี 2026', summary: 'Partner ยืนยันเป้าหมายต่ออายุและขอแคมเปญร่วม', feedback: [{ t: T('People', 'positive') }] },
  { partnerId: 'P001', date: '2026-06-10', status: 'visited', outcome: 'met_objective', objective: 'ติดตามยอดครึ่งปีแรก', summary: 'ยอดครึ่งปีแรกตามเป้า Partner ขอสื่อขายฉบับย่อ', feedback: [{ t: T('Promotion', 'neutral') }], followUp: { due: '2026-07-15', completed: '2026-07-10', owner: 'ทีม Marketing' } },
  { partnerId: 'P002', date: '2026-09-15', status: 'visited', outcome: 'partial', objective: 'ติดตามยอดขายไตรมาส 3', summary: 'Partner ห่วงเรื่องราคาประเภท 1 สำหรับรถกระบะ', feedback: [{ t: T('Price', 'negative'), severity: 'medium' }], followUp: { due: '2026-10-10', completed: '2026-10-08', owner: 'ทีม UW' } },
  { partnerId: 'P003', date: '2026-08-20', status: 'visited', outcome: 'met_objective', objective: 'แนะนำสื่อขายรถ EV', summary: 'ลูกค้าโชว์รูมถามเรื่องความคุ้มครองแบตเตอรี่บ่อย', feedback: [{ t: T('Product', 'negative', 1), severity: 'medium' }, { t: T('Promotion', 'positive') }], followUp: { due: '2026-09-30', completed: '2026-09-25', owner: 'ทีม Product' } },
  { partnerId: 'P004', date: '2026-07-08', status: 'visited', outcome: 'partial', objective: 'สำรวจโอกาสขาย Non-Motor', summary: 'ธนาคารยังเน้นประกันรถประเภท 1 อย่างเดียว', feedback: [{ t: T('Product', 'neutral') }] },
  { partnerId: 'P005', date: '2026-10-14', status: 'visited', outcome: 'met_objective', objective: 'วางแผนแคมเปญปลายปี', summary: 'Partner โตต่อเนื่อง สนใจขยายไป PA', feedback: [{ t: T('Promotion', 'positive') }, { t: T('Product', 'neutral') }] },
  { partnerId: 'P006', date: '2026-09-25', status: 'visited', outcome: 'met_objective', objective: 'แนะนำบริการออกกรมธรรม์ออนไลน์', summary: 'ใช้ระบบออนไลน์ได้ดี อยากได้ผลิตภัณฑ์สำหรับรถ Hybrid', feedback: [{ t: T('Place', 'positive') }] },
  { partnerId: 'P007', date: '2026-11-06', status: 'visited', outcome: 'met_objective', objective: 'เยี่ยมความสัมพันธ์', summary: 'ความร่วมมือดี ไม่มีประเด็นเร่งด่วน', feedback: [{ t: T('People', 'positive') }] },
  { partnerId: 'P008', date: '2026-10-08', status: 'visited', outcome: 'not_met', objective: 'ติดตามยอดต่ออายุ', summary: 'Partner ไม่พอใจเงื่อนไขซ่อมห้าง และออกกรมธรรม์ช้า', feedback: [{ t: T('Product', 'negative', 0), severity: 'high' }, { t: T('Process', 'negative', 0), severity: 'medium' }], followUp: { due: '2026-10-31', completed: null, owner: 'ทีม Product' } },
  { partnerId: 'P009', date: '2026-08-05', status: 'visited', outcome: 'partial', objective: 'ทบทวนยอดต่ออายุ', summary: 'Partner ขอส่วนลดต่ออายุเพิ่ม', feedback: [{ t: T('Price', 'negative', 1), severity: 'low' }] },
  { partnerId: 'P010', date: '2026-11-12', status: 'visited', outcome: 'partial', objective: 'ติดตามยอดขายที่ลดลง', summary: 'สาขาต่างจังหวัดหาอู่ในเครือยาก', feedback: [{ t: T('Place', 'negative'), severity: 'medium' }], followUp: { due: '2026-12-10', completed: null, owner: 'ทีม Claims' } },
  { partnerId: 'P011', date: '2026-11-04', status: 'visited', outcome: 'met_objective', objective: 'สำรวจกลุ่มลูกค้า EV', summary: 'ลูกค้า EV เพิ่มขึ้น สื่อขาย EV ใช้ได้ดี', feedback: [{ t: T('Promotion', 'positive') }] },
  { partnerId: 'P012', date: '2026-09-02', status: 'visited', outcome: 'met_objective', objective: 'เยี่ยมตามรอบ', summary: 'ไม่มีประเด็นสำคัญ', feedback: [{ t: T('Price', 'neutral') }] },
  { partnerId: 'P006', date: '2026-11-25', status: 'planned', outcome: null, objective: 'นำเสนอผลิตภัณฑ์ EV ใหม่', summary: '', feedback: [] },
];

const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
const sevFor = (r: number): Severity => (r < 0.25 ? 'high' : r < 0.7 ? 'medium' : 'low');
const ownerFromDept = (d: string | null) => (d ? `ทีม ${d}` : 'ทีม Marketing');

export interface ActivityData {
  visits: Visit[];
  feedback: Feedback[];
  followUps: FollowUp[];
}

export function generateActivity(partners: Partner[]): ActivityData {
  const rng = mulberry32(SEED ^ 0xa11ce);
  const visits: Visit[] = [];
  const feedback: Feedback[] = [];
  const followUps: FollowUp[] = [];
  let vN = 1, fN = 1, uN = 1;

  const pushFeedback = (visitId: string, tpl: FeedbackTemplate, severity: Severity | null, visitDate: string, due: string | null, completed: string | null, owner: string | null) => {
    const fid = `F${String(fN++).padStart(4, '0')}`;
    feedback.push({
      id: fid, visitId, category: tpl.category, sentiment: tpl.sentiment,
      severity: tpl.sentiment === 'negative' ? severity ?? 'medium' : null,
      detail: tpl.detail, productLine: tpl.productLine, responsibleDept: tpl.dept,
    });
    if (tpl.action && due) {
      followUps.push({
        id: `A${String(uN++).padStart(4, '0')}`, visitId, feedbackId: fid, action: tpl.action,
        ownerName: owner ?? ownerFromDept(tpl.dept), dueDate: due, createdDate: visitDate,
        completedDate: completed && completed <= DEMO_TODAY ? completed : null,
        status: completed && completed <= DEMO_TODAY ? 'done' : 'open',
      });
    }
  };

  // Hero visits (hand-written)
  for (const h of HERO_VISITS) {
    const p = partners.find((x) => x.id === h.partnerId)!;
    const id = `V${String(vN++).padStart(4, '0')}`;
    visits.push({ id, partnerId: p.id, marketingId: p.ownerId, date: h.date, status: h.status, outcome: h.outcome, objective: h.objective, summary: h.summary, recommendationId: null });
    h.feedback.forEach((fb, i) => {
      const tpl = FEEDBACK_TEMPLATES[fb.t];
      const fu = i === 0 ? h.followUp : undefined;
      pushFeedback(id, tpl, fb.severity ?? null, h.date, fu?.due ?? (tpl.action ? addDays(h.date, 30) : null), fu ? fu.completed : addDays(h.date, 21), fu?.owner ?? null);
    });
  }

  // Background visits (random but deterministic)
  const start = Date.parse('2026-05-01');
  const end = Date.parse('2026-11-19');
  for (const p of partners.filter((x) => !x.isHero)) {
    const n = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const date = new Date(start + rng() * (end - start)).toISOString().slice(0, 10);
      const r = rng();
      const status: VisitStatus = r < 0.8 ? 'visited' : r < 0.9 ? 'rescheduled' : 'not_visited';
      const id = `V${String(vN++).padStart(4, '0')}`;
      const outcome: VisitOutcome | null = status === 'visited' ? pick(rng, ['met_objective', 'met_objective', 'partial', 'not_met'] as const) : null;
      visits.push({
        id, partnerId: p.id, marketingId: p.ownerId, date, status, outcome,
        objective: pick(rng, ['เยี่ยมตามรอบ', 'ติดตามยอดขาย', 'ทบทวนยอดต่ออายุ', 'แนะนำผลิตภัณฑ์']),
        summary: status === 'visited' ? 'บันทึกสรุปการพูดคุย (ข้อมูลจำลอง)' : '', recommendationId: null,
      });
      if (status !== 'visited') continue;
      const nFb = 1 + (rng() < 0.4 ? 1 : 0);
      for (let k = 0; k < nFb; k++) {
        const tpl = pick(rng, FEEDBACK_TEMPLATES);
        const due = addDays(date, Math.round(between(rng, 21, 60)));
        const cr = rng();
        // ~75% done (some late), rest open
        const completed = cr < 0.75 ? addDays(date, Math.round(between(rng, 7, 45))) : null;
        pushFeedback(id, tpl, sevFor(rng()), date, due, completed, null);
      }
    }
  }
  // A few planned visits after demo today for other users
  const planned = partners.filter((x) => !x.isHero).slice(0, 4);
  planned.forEach((p, i) => {
    visits.push({ id: `V${String(vN++).padStart(4, '0')}`, partnerId: p.id, marketingId: p.ownerId, date: addDays(DEMO_TODAY, 3 + i * 2), status: 'planned', outcome: null, objective: 'ติดตามคำแนะนำจากนัดโตะ', summary: '', recommendationId: null });
  });

  // Follow-ups with status in_progress: open ones not overdue and older than 7 days
  for (const f of followUps) {
    if (f.status === 'open' && f.dueDate >= DEMO_TODAY && f.createdDate <= addDays(DEMO_TODAY, -7)) f.status = 'in_progress';
  }
  return { visits: visits.sort((a, b) => a.date.localeCompare(b.date)), feedback, followUps };
}
