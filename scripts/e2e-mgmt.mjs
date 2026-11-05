// E2E: Marketing records feedback → Manager & Executive see it; drill-down and RBAC.
// Usage: npx vite preview --port 4173 (another shell), then node scripts/e2e-mgmt.mjs [outDir]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = process.argv[2] ?? 'e2e-shots';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'th-TH' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const results = [];
const check = (name, ok, extra = '') => { results.push({ ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const text = () => page.locator('body').innerText();
const shot = (n, full = true) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
const as = async (uid) => {
  await page.evaluate((u) => { localStorage.setItem('natto-demo-v1-session', JSON.stringify({ userId: u })); sessionStorage.setItem('natto-welcome-seen', '1'); }, uid);
  // Full navigation (new query string) so the app re-reads the session from storage.
  await page.goto(`${BASE}?as=${uid}-${Date.now()}#/`); await page.waitForTimeout(800);
};
const rowOf = async (name) => (await page.locator('tr', { hasText: name }).first().innerText()).split('\t').map((x) => x.trim());

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());

// Baseline manager numbers
await as('U-MGR1');
const before = await rowOf('กิตติ');
check('Manager sees team dashboard', (await text()).includes('ภาพรวมทีม · ทีม Marketing - กรุงเทพฯ'));

// Marketing records a visit with negative Product feedback
await as('U-MKT1');
await page.goto(BASE + '#/visit/new/P001?rec=R-2026-11-P001');
await page.fill('#sum', 'เงื่อนไขซ่อมห้างไม่ครอบคลุมรถเก่า ลูกค้าย้ายไปเจ้าอื่น');
await page.getByRole('button', { name: 'ถัดไป' }).click();
await page.getByRole('button', { name: /ให้นัดโตะช่วยจัดหมวด/ }).click();
await page.getByRole('button', { name: 'ถัดไป' }).click();
await page.getByLabel('ฉันตรวจสอบข้อมูล').check();
await page.getByRole('button', { name: /ตรวจสอบและบันทึก/ }).click();
await page.waitForSelector('text=บันทึกการเข้าพบเรียบร้อย');
check('Success mascot banner after save', true);

// Manager sees it
await as('U-MGR1');
await shot('m1-manager');
const after = await rowOf('กิตติ');
check('Manager: กิตติ visits +1', Number(after[3]) === Number(before[3]) + 1, `${before[3]} → ${after[3]}`);
check('Manager: feedback shows negative', after[4].includes('ต้องปรับ'), after[4]);
check('Manager: opportunity created', after[7] !== '—', after[7]);
await page.locator('tr', { hasText: 'กิตติ' }).first().click();
await page.waitForTimeout(700);
await shot('m2-marketing-detail');
check('Drill: Manager → Marketing', (await text()).includes('คำแนะนำรอบ'));
await page.locator('tr', { hasText: 'Broker A' }).last().click();
await page.waitForTimeout(700);
check('Drill: Marketing → Partner (read-only)', (await text()).includes('Broker A') && !(await text()).includes('บันทึกผลการเข้าพบ'));
await page.goto(BASE + '#/visits');
await page.waitForTimeout(700);
check('Manager visit list shows team visits', (await text()).includes('การเข้าพบของทีม'));

// RBAC
await page.goto(BASE + '#/team/U-MKT4'); await page.waitForTimeout(700);
check('RBAC: manager blocked from other team user', (await text()).includes('ไม่มีสิทธิ์เข้าถึง'));
await page.goto(BASE + '#/partner/P010'); await page.waitForTimeout(700);
check('RBAC: manager blocked from other team partner', (await text()).includes('ไม่มีสิทธิ์เข้าถึง'));
await page.goto(BASE + '#/org/team/T-REG'); await page.waitForTimeout(700);
check('RBAC: manager blocked from org view', (await text()).includes('ไม่มีสิทธิ์เข้าถึง'));

// Executive
await as('U-EXE1');
await shot('e1-exec');
let t = await text();
check('Exec dashboard renders', t.includes('ภาพรวมองค์กร') && t.includes('Opportunity Pipeline') && t.includes('เกิดอะไรขึ้น'));
check('Exec: both teams in comparison', t.includes('ทีม Marketing - กรุงเทพฯ') && t.includes('ทีม Marketing - ภูมิภาค'));
check('Exec insight names Broker group renewal', /Renewal Rate รวมของกลุ่ม \w+/.test(t), t.match(/Renewal Rate รวมของกลุ่ม \w+[^\n]*/)?.[0]?.slice(0, 90));
await page.locator('tr', { hasText: 'ทีม Marketing - ภูมิภาค' }).first().click();
await page.waitForTimeout(700);
check('Drill: Org → Team', (await text()).includes('ภาพรวมทีม · ทีม Marketing - ภูมิภาค'));
await page.locator('tr', { hasText: 'ศิริพร' }).first().click();
await page.waitForTimeout(700);
check('Drill: Team → Marketing (exec)', (await text()).includes('ศิริพร'));
await page.locator('tr', { hasText: 'Bank J' }).last().click();
await page.waitForTimeout(700);
check('Drill: Marketing → Partner (exec)', (await text()).includes('Bank J'));
await page.goto(BASE + '#/');
await page.selectOption('select[aria-label="หน่วยงาน"]', 'T-BKK');
await page.waitForTimeout(700);
check('Exec BU filter', (await text()).includes('BU กรุงเทพฯ และปริมณฑล'));

// Mobile widths, no horizontal scroll
await page.setViewportSize({ width: 390, height: 844 });
for (const [uid, routes] of [['U-EXE1', ['#/', '#/org/team/T-BKK', '#/team/U-MKT1']], ['U-MGR1', ['#/', '#/visits']]]) {
  await as(uid);
  for (const r of routes) {
    await page.goto(BASE + r); await page.waitForTimeout(500);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    check(`No horizontal scroll 390px ${uid} ${r}`, w <= 390, `scrollWidth=${w}`);
  }
}
await as('U-EXE1'); await shot('e2-exec-mobile');
await as('U-MGR1'); await shot('m3-manager-mobile');

check('No console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
