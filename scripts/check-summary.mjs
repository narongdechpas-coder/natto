// Visit summary (Marketing) → one-page A4 portrait PDF export check.
// Usage: npx vite preview --port 4173 (another shell), then node scripts/check-summary.mjs [outDir]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = process.argv[2] ?? 'summary-shots';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'th-TH', acceptDownloads: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const as = async (uid, route) => {
  await page.evaluate((u) => { localStorage.setItem('natto-demo-v1-session', JSON.stringify({ userId: u })); sessionStorage.setItem('natto-welcome-seen', '1'); }, uid);
  await page.goto(`${BASE}?r=${Date.now()}#${route}`); await page.waitForTimeout(1200);
};
await page.goto(BASE);

for (const [pid, name] of [['P008', 'Broker-H'], ['P001', 'Broker-A'], ['P013', 'Broker-13']]) {
  await as('U-MKT1', `/summary/${pid}`);
  const t = await page.locator('body').innerText();
  check(`${name}: summary renders with DEMO label and sections`, t.includes('สรุปการเข้าพบคู่ค้า') && t.includes('DEMO DATA') && t.includes('Feedback แยกตาม 7P') && t.includes('งานติดตามที่ยังเปิด'));
  const fits = await page.evaluate(() => { const c = document.querySelector('.a4-content'); const s = document.querySelector('.a4'); return c.getBoundingClientRect().bottom <= s.getBoundingClientRect().bottom + 1; });
  check(`${name}: content fits inside one A4 sheet`, fits);
  await page.locator('.a4').screenshot({ path: `${OUT}/summary-${name}.png` });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: /ดาวน์โหลด PDF/ }).click()]);
  const file = `${OUT}/${dl.suggestedFilename()}`;
  await dl.saveAs(file);
  const buf = fs.readFileSync(file);
  const raw = buf.toString('latin1');
  const pages = (raw.match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
  const media = raw.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  check(`${name}: PDF downloaded (${dl.suggestedFilename()})`, raw.startsWith('%PDF') && buf.length > 40_000, `${Math.round(buf.length / 1024)} KB`);
  check(`${name}: exactly 1 page`, pages === 1, `pages=${pages}`);
  check(`${name}: A4 portrait (595.28 × 841.89 pt)`, media && Math.abs(Number(media[1]) - 595.28) < 0.5 && Math.abs(Number(media[2]) - 841.89) < 0.5, media?.slice(1).join(' × '));
}

// Stress: a Partner with many long visits, feedback and open actions must still fit on one page
const long = 'Partner แจ้งว่าลูกค้ากลุ่มรถอายุเกิน 5 ปีย้ายไปบริษัทอื่นเพราะเงื่อนไขซ่อมห้าง และขอให้ส่งข้อมูลเปรียบเทียบเบี้ยกับคู่แข่งก่อนสิ้นเดือน';
const overlay = { decisions: [], opportunities: [], talkingPoints: {}, visits: [], feedback: [], followUps: [] };
for (let i = 0; i < 10; i++) {
  const id = `V-STRESS${i}`; const date = `2026-${String(5 + Math.floor(i / 2)).padStart(2, '0')}-${String(10 + i).padStart(2, '0')}`;
  overlay.visits.push({ id, partnerId: 'P001', marketingId: 'U-MKT1', date, status: 'visited', outcome: 'partial', objective: 'ติดตามยอดต่ออายุและประเด็นที่ค้างจากครั้งก่อน', summary: long, recommendationId: null });
  for (const cat of ['Product', 'Price', 'Process']) overlay.feedback.push({ id: `F-S${i}${cat}`, visitId: id, category: cat, sentiment: 'negative', severity: 'high', detail: long, productLine: null, responsibleDept: null });
  overlay.followUps.push({ id: `A-S${i}`, visitId: id, feedbackId: null, action: `ส่งข้อมูลเปรียบเทียบเบี้ยและเงื่อนไขซ่อมห้างให้ Partner รอบที่ ${i + 1}`, ownerName: 'ทีม Underwriting', dueDate: '2026-12-15', status: 'open', createdDate: date, completedDate: null });
}
await page.evaluate((o) => localStorage.setItem('natto-demo-v1', JSON.stringify(o)), overlay);
await as('U-MKT1', '/summary/P001');
const stress = await page.evaluate(() => { const c = document.querySelector('.a4-content'); const s = document.querySelector('.a4'); return { fits: c.getBoundingClientRect().bottom <= s.getBoundingClientRect().bottom + 1, scale: c.style.transform }; });
check('Stress (12 visits, 30 feedback, 10 actions): fits on one page via scale-to-fit', stress.fits, stress.scale);
await page.setViewportSize({ width: 1000, height: 1300 });
await page.locator('.a4').screenshot({ path: `${OUT}/summary-stress.png` });
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: /ดาวน์โหลด PDF/ }).click()]);
await dl2.saveAs(`${OUT}/stress.pdf`);
const raw2 = fs.readFileSync(`${OUT}/stress.pdf`).toString('latin1');
check('Stress PDF is still exactly 1 page', (raw2.match(/\/Type\s*\/Page(?!s)/g) ?? []).length === 1);
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => localStorage.removeItem('natto-demo-v1'));

await as('U-MKT1', '/summary/P010');
check('RBAC: Marketing cannot export another owner’s partner', (await page.locator('body').innerText()).includes('ไม่มีสิทธิ์เข้าถึง'));
await as('U-MGR1', '/summary/P001');
check('Marketing only: Manager has no summary page', !(await page.locator('body').innerText()).includes('ดาวน์โหลด PDF'));
// PDF only after a visit is recorded
await as('U-MKT1', '/visits/V0089');
check('Planned visit: no PDF button', !(await page.locator('body').innerText()).includes('(PDF)'));
await as('U-MKT1', '/visits/V0016');
check('Rescheduled visit: no PDF button', !(await page.locator('body').innerText()).includes('(PDF)'));
await as('U-MKT1', '/partner/P014');
check('Partner never visited: no summary link', !(await page.locator('body').innerText()).includes('สรุปการเข้าพบ (PDF A4)'));
await as('U-MKT1', '/summary/P014');
const blocked = await page.locator('body').innerText();
check('Partner never visited: direct link shows notice and no download', blocked.includes('ยังดาวน์โหลดสรุปไม่ได้') && !blocked.includes('ดาวน์โหลด PDF'));
await as('U-MKT1', '/visits/V0001');
check('Earlier visited visit (history) still offers PDF', (await page.locator('body').innerText()).includes('สรุปการเข้าพบ Broker A (PDF)'));
await as('U-MKT1', '/visits/V0009');
check('Entry point on visit detail', (await page.locator('body').innerText()).includes('สรุปการเข้าพบ Broker H (PDF)'));
await page.setViewportSize({ width: 360, height: 740 });
await as('U-MKT1', '/summary/P001');
const sw = await page.evaluate(() => document.documentElement.scrollWidth);
check('No horizontal scroll at 360px', sw <= 360, `scrollWidth=${sw}`);
check('No page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await b.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
