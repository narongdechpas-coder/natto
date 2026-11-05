// Visit plan vs. visit result: plan details must never appear as the post-visit summary.
// Usage: npx vite preview --port 4173 (another shell), then node scripts/check-plan.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'th-TH' });
const text = () => page.locator('body').innerText();
const as = async (route, overlay) => {
  await page.evaluate((o) => {
    localStorage.setItem('natto-demo-v1-session', JSON.stringify({ userId: 'U-MKT1' })); sessionStorage.setItem('natto-welcome-seen', '1');
    if (o) localStorage.setItem('natto-demo-v1', JSON.stringify(o)); else localStorage.removeItem('natto-demo-v1');
  }, overlay ?? null);
  await page.goto(`${BASE}?r=${Date.now()}#${route}`); await page.waitForTimeout(1000);
};
await page.goto(BASE);

// 1) Create a plan from the partner page
await as('/partner/P002?tab=talk&rec=R-2026-11-P002');
await page.locator('#pdate').click(); await page.getByRole('button', { name: '25 พ.ย. 2026', exact: true }).click();
await page.selectOption('#ptime', '14:30');
await page.fill('#patt', 'Marketing, UW');
await page.getByRole('button', { name: /บันทึกแผนเข้าพบ/ }).click(); await page.waitForTimeout(300);
await page.evaluate(() => { window.location.hash = '/visits?tab=planned'; }); await page.waitForTimeout(400);
await page.locator('a.card', { hasText: 'Dealer B' }).first().click(); await page.waitForTimeout(400);
let t = await text();
check('Planned visit: summary says "not yet"', t.includes('สรุปการพูดคุย: ยังไม่มี · บันทึกได้หลังเข้าพบ'));
check('Planned visit: plan details shown separately (time, attendees, topics)', t.includes('รายละเอียดแผนเข้าพบ') && t.includes('เวลานัด: 14:30 น.') && t.includes('ผู้เข้าร่วม: Marketing, UW') && t.includes('ประเด็นที่จะคุย:'));
check('Planned visit: plan details are not in the summary line', !/สรุปการพูดคุย:[^\n]*14:30/.test(t));

// 2) Record the result from that plan
await page.getByRole('button', { name: 'บันทึกผลการเข้าพบ' }).click(); await page.waitForTimeout(400);
check('Result form starts with an empty summary', (await page.locator('#sum').inputValue()) === '');
await page.locator('#vdate').click(); await page.getByRole('button', { name: '20 พ.ย. 2026', exact: true }).click();
await page.fill('#sum', 'Partner ยืนยันว่ายอดลดเพราะโชว์รูมปิดปรับปรุง');
await page.getByRole('button', { name: 'ถัดไป' }).click();
await page.locator('[aria-label="ประเมิน Place"] button', { hasText: 'ปกติ' }).click();
await page.getByRole('button', { name: 'ถัดไป' }).click();
await page.getByLabel('ฉันตรวจสอบข้อมูล').check();
await page.getByRole('button', { name: /ตรวจสอบและบันทึก/ }).click(); await page.waitForTimeout(500);
t = await text();
check('Recorded visit: summary is what Marketing typed', t.includes('สรุปการพูดคุย: Partner ยืนยันว่ายอดลดเพราะโชว์รูมปิดปรับปรุง'));
check('Recorded visit: original plan kept for reference', t.includes('เวลานัด: 14:30 น.'));
check('Recorded visit: PDF now available', t.includes('สรุปการเข้าพบ Dealer B (PDF)'));

// 3) Plans saved by the earlier version (details stored in summary) are shown as plan details
const legacy = { decisions: [], feedback: [], followUps: [], opportunities: [], talkingPoints: {},
  visits: [{ id: 'V-LEGACY', partnerId: 'P002', marketingId: 'U-MKT1', date: '2026-11-25', status: 'planned', outcome: null, objective: 'ทดสอบ', summary: 'เวลา 10:00 น. · ประเด็น: ทดสอบ', recommendationId: null }] };
await as('/visits/V-LEGACY', legacy);
t = await text();
check('Legacy plan: old details shown under plan, summary says "not yet"', t.includes('รายละเอียดแผนเข้าพบ') && t.includes('เวลา 10:00 น. · ประเด็น: ทดสอบ') && t.includes('สรุปการพูดคุย: ยังไม่มี'));
await b.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
