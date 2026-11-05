// End-to-end walkthrough of the Marketing journey (demo storyline steps 1–4 + scenario).
// Usage: npx vite preview --port 4173  (in another shell), then: node scripts/e2e-marketing.mjs [outDir]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container
import fs from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = process.argv[2] ?? 'e2e-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'th-TH' });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const text = () => page.locator('body').innerText();

await page.goto(BASE);
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await page.goto(BASE + '?fresh=1');
// Welcome screen: mascot → name → tagline → actions, then into login
await page.waitForSelector('.welcome');
await page.waitForTimeout(2800);
await shot('00-welcome');
let w = await text();
check('Welcome shows name, tagline and start button', w.includes('นัดโตะ') && w.includes('วันนี้คุณควรไปพบใคร') && w.includes('เริ่มต้นใช้งาน'));
check('Welcome offers app install', w.includes('ติดตั้งแอปลงมือถือ'));
check('Manifest linked', (await page.locator('link[rel="manifest"]').count()) === 1);
const manifest = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
check('Manifest has name, standalone display and 192/512 icons', manifest.short_name === 'นัดโตะ' && manifest.display === 'standalone' && manifest.icons.some((i) => i.sizes === '512x512') && manifest.icons.some((i) => i.sizes === '192x192'));
const icon = await page.evaluate(async () => (await fetch('./icons/icon-512.png')).ok);
check('Icons served', icon);
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; });
check('Service worker registered', sw);
await page.getByRole('button', { name: /เริ่มต้นใช้งาน/ }).click();
await page.waitForSelector('text=เลือกผู้ใช้สำหรับ demo');
await page.reload(); await page.waitForTimeout(500);
check('Welcome shown only once per session', !(await page.locator('.welcome').count()));
await page.getByText('กิตติ').first().click();
await page.waitForSelector('text=สวัสดี, กิตติ');
await page.waitForTimeout(600);
await shot('01-dashboard');
let t = await text();
check('M01 greeting + DEMO label', t.includes('สวัสดี, กิตติ') && t.includes('DEMO DATA'));
check('M01 shows Broker A', t.includes('Broker A'));
check('M01 chat is coming soon', t.includes('เร็วๆ นี้'));

await page.getByRole('link', { name: /ดูทั้งหมด/ }).click();
await page.waitForSelector('text=AI แนะนำคู่ค้า');
await shot('02-recs');
t = await text();
check('M02 list has 6 recs for กิตติ', t.includes('ทั้งหมด (6)'), t.match(/ทั้งหมด \(\d+\)/)?.[0]);
await page.getByRole('button', { name: /^สูง/ }).click();
t = await text();
check('M02 filter high → Broker A only', t.includes('Broker A') && !t.includes('Dealer B'));
await page.getByRole('button', { name: /^ทั้งหมด/ }).click();

await page.locator('a[href="#/recs/R-2026-11-P001"]').click();
await page.waitForSelector('text=สรุปเหตุผลที่แนะนำ');
await shot('03-rec-detail');
t = await text();
check('M02 detail shows renewal evidence in pp', t.includes('−11.9 pp'));
await page.getByRole('tab', { name: 'แนวโน้ม' }).click();
await shot('03b-rec-trend');
check('M02 trend has evidence table', (await text()).includes('หลักฐานที่ใช้คำนวณ'));
await page.getByRole('tab', { name: 'เหตุผล AI' }).click();
await shot('03c-rec-why');
t = await text();
check('M02 formula disclosed', t.includes('× 12') && t.includes('ประมาณการ'));

// Not now flow on another rec first (Dealer B)
await page.goto(BASE + '#/recs/R-2026-11-P002');
await page.getByRole('button', { name: 'ไม่ใช่ตอนนี้' }).click();
await page.getByRole('button', { name: 'บันทึก' }).click();
check('Decision requires reason', (await text()).includes('กรุณาเลือกเหตุผล'));
await page.getByRole('button', { name: 'Partner ยังไม่พร้อม' }).click();
await page.getByRole('button', { name: 'บันทึก' }).click();
await page.waitForTimeout(200);
check('Not now saved', (await text()).includes('ตัดสินใจแล้ว: ไม่ใช่ตอนนี้'));

// Prepare Broker A
await page.goto(BASE + '#/recs/R-2026-11-P001');
await page.getByRole('button', { name: /เตรียมเข้าพบ/ }).click();
await page.waitForSelector('text=ประเด็นที่ 1');
await shot('04-partner-talk');
t = await text();
check('M04 talking points from signals', (await page.getByLabel('หัวข้อประเด็นที่ 1').inputValue()) === 'สาเหตุที่ลูกค้าไม่ต่ออายุ' && t.includes('คำถามแนะนำ'));
// Deleting a talking point removes its whole card (questions included), and restore brings it back
const cardsBefore = await page.locator('text=/^ประเด็นที่ \\d+$/').count();
await page.getByRole('button', { name: 'ลบประเด็นที่ 1' }).click();
const afterDel = await text();
check('Delete talking point removes its card', (await page.locator('text=/^ประเด็นที่ \\d+$/').count()) === cardsBefore - 1 && !afterDel.includes('ลูกค้าที่ไม่ต่ออายุใน 3 เดือนที่ผ่านมา'), `${cardsBefore} → ${await page.locator('text=/^ประเด็นที่ \\d+$/').count()}`);
await page.getByRole('button', { name: /เพิ่มประเด็น/ }).click();
await page.getByLabel(`หัวข้อประเด็นที่ ${cardsBefore}`).fill('เสนอแคมเปญร่วมปลายปี');
check('Custom talking point added', (await text()).includes('เพิ่มเอง'));
await page.getByRole('button', { name: /คืนค่าที่ระบบแนะนำ/ }).click();
const restored = await text();
check('Restore brings back system points and drops custom', restored.includes('ลูกค้าที่ไม่ต่ออายุใน 3 เดือนที่ผ่านมา') && !restored.includes('เพิ่มเอง') && (await page.locator('text=/^ประเด็นที่ \\d+$/').count()) === cardsBefore);
for (const tab of ['ภาพรวม', 'Performance', 'Product Mix', 'Vehicle']) {
  await page.getByRole('tab', { name: tab }).click();
  await page.waitForTimeout(100);
  await shot(`04-partner-${tab.replace(' ', '')}`);
}
t = await text();
check('M04 vehicle table shows make/model', t.includes('Make / Model'));
await page.getByRole('tab', { name: 'ประเด็นพูดคุย' }).click();
await page.getByRole('button', { name: /บันทึกแผนเข้าพบ/ }).click();
check('Plan validation', (await text()).includes('กรุณาเลือกวันที่เข้าพบ'));
// Thai date picker: past days disabled, selected date shown as day-month-year in Thai
await page.locator('#pdate').click();
check('Date picker shows Thai month', (await text()).includes('พฤศจิกายน 2026'));
check('Date picker disables past days', await page.getByRole('button', { name: '19 พ.ย. 2026', exact: true }).isDisabled());
await page.getByRole('button', { name: '25 พ.ย. 2026', exact: true }).click();
check('Picked date displayed in Thai format', (await page.locator('#pdate').innerText()).includes('25 พ.ย. 2026'), await page.locator('#pdate').innerText());
check('Time shown as 24h Thai', (await page.locator('#ptime option:checked').innerText()) === '10:00 น.');

// Record visit
await page.getByRole('button', { name: 'บันทึกผลการเข้าพบ' }).click();
await page.waitForSelector('text=สถานะการเข้าพบ');
await page.getByRole('button', { name: 'ถัดไป' }).click();
check('Visit summary required', (await text()).includes('กรุณาสรุปการพูดคุย'));
await page.fill('#sum', 'Partner บอกว่าเงื่อนไขซ่อมห้างไม่ครอบคลุมรถเก่า ลูกค้าย้ายไปเจ้าอื่น และออกกรมธรรม์ช้า');
await page.getByRole('button', { name: 'ถัดไป' }).click();
await page.getByRole('button', { name: /ให้นัดโตะช่วยจัดหมวด/ }).click();
await shot('05-visit-7p');
t = await text();
check('AI suggests Product + Process', t.includes('นัดโตะแนะนำ') && t.includes('Product (ต้องปรับ)') && t.includes('Process (ต้องปรับ)'), t.match(/นัดโตะแนะนำ[^\n]*/)?.[0]);
// Each AI-filled detail must be its own clause (not the whole note repeated)
const details = await page.locator('textarea[aria-label^="รายละเอียด"]').evaluateAll((els) => els.map((e) => e.value));
check('AI details are per-clause, not duplicated', details.length === 2 && new Set(details).size === 2 && !details.some((d) => d.includes('ลูกค้าย้าย')), JSON.stringify(details));
// Dismiss one suggestion (Process) → back to "ไม่ได้คุย"
await page.getByRole('button', { name: 'ปิดคำแนะนำ Process' }).click();
check('Dismiss single AI suggestion', (await page.locator('[aria-label="ประเมิน Process"] [aria-checked="true"]').innerText()) === 'ไม่ได้คุย');
// Dismiss all, then re-run and accept all
await page.getByRole('button', { name: /ยกเลิกคำแนะนำทั้งหมด/ }).click();
check('Dismiss all AI suggestions', (await page.locator('.badge.good').innerText()).includes('0/7'));
await page.getByRole('button', { name: /ให้นัดโตะช่วยจัดหมวด/ }).click();
await page.getByRole('button', { name: /ยอมรับทั้งหมด/ }).click();
check('Accept all clears AI badges', (await page.locator('text=AI แนะนำ').count()) === 0);
await page.getByRole('button', { name: 'ถัดไป' }).click();
await shot('05b-visit-actions');
const actionValues = await page.locator('input[id^="a"]').evaluateAll((els) => els.map((e) => e.value));
check('Next actions prefilled from negative feedback', actionValues.some((v) => v.startsWith('ติดตามประเด็น Product')), JSON.stringify(actionValues).slice(0, 80));
await page.getByRole('button', { name: /ตรวจสอบและบันทึก/ }).click();
check('Confirm checkbox required', (await text()).includes('กรุณาติ๊กยืนยัน'));
await page.getByLabel('ฉันตรวจสอบข้อมูล').check();
await page.getByRole('button', { name: /ตรวจสอบและบันทึก/ }).click();
await page.waitForSelector('text=รายละเอียดการเข้าพบ');
await shot('06-visit-detail');
await page.getByRole('tab', { name: 'Feedback 7P' }).click();
t = await text();
check('Saved feedback visible', t.includes('ต้องปรับ'));
await page.getByRole('tab', { name: 'แผนติดตาม' }).click();
await page.getByRole('button', { name: 'ทำเสร็จแล้ว' }).first().click();
check('Follow-up status update', (await text()).includes('เสร็จสิ้น'));

await page.goto(BASE + '#/visits');
await page.waitForSelector('text=ประวัติการเข้าพบ');
await shot('07-history');
t = await text();
check('M06 history lists Broker A visit on demo today', t.includes('Broker A') && t.includes('20 พ.ย. 2026'));

// Dashboard counts updated
await page.goto(BASE + '#/');
await page.waitForTimeout(600);
t = await text();
check('Dashboard visited count ≥1', /\n1\nเข้าพบแล้ว/.test(t) || t.includes('เข้าพบแล้ว'));

// Scenario
await page.goto(BASE + '#/scenario');
await page.getByRole('button', { name: /วิเคราะห์คู่ค้า/ }).click();
await shot('08-scenario-ev');
t = await text();
check('M03 EV scenario ranks Dealer C first', /1\. Dealer C/.test(t), t.match(/1\. [^\n]*/)?.[0]);

// Report & profile reset
await page.goto(BASE + '#/report');
await page.waitForTimeout(200);
await shot('09-report');
await page.goto(BASE + '#/profile');
await page.getByRole('button', { name: /รีเซ็ตข้อมูล demo/ }).click();
await page.getByRole('button', { name: 'รีเซ็ต', exact: true }).click();
await page.waitForTimeout(700);
await page.goto(BASE + '#/recs/R-2026-11-P002');
check('Reset clears decisions', !(await text()).includes('ตัดสินใจแล้ว'));

// Access control: marketing cannot open another team's partner
await page.goto(BASE + '#/partner/P010');
check('RBAC: Bank J (other team) blocked', (await text()).includes('ไม่มีสิทธิ์เข้าถึง'));

// Manager role placeholder works
await page.goto(BASE + '#/profile');
await page.getByRole('button', { name: /วิภาวดี/ }).click();
await page.waitForTimeout(600);
check('Role switch to manager', (await text()).includes('วิภาวดี'));

// Horizontal overflow check at 360px
await page.setViewportSize({ width: 360, height: 780 });
await page.goto(BASE + '#/profile');
await page.getByRole('button', { name: /กิตติ/ }).click();
for (const r of ['#/', '#/recs', '#/recs/R-2026-11-P001', '#/partner/P001', '#/visits', '#/scenario', '#/visit/new/P001']) {
  await page.goto(BASE + r);
  await page.waitForTimeout(650);
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  check(`No horizontal scroll at 360px ${r}`, w <= 360, `scrollWidth=${w}`);
}

check('No console/page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
