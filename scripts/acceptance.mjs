// Acceptance test run against spec §14 (14 criteria) + required states, responsiveness and Thai UI.
// Usage: npx vite preview --port 4173 (another shell), then: node scripts/acceptance.mjs [outDir]
// Prints a markdown results table; exit code 1 if any check fails.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = process.argv[2] ?? 'acceptance-shots';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const check = (ac, name, ok, evidence = '') => { results.push({ ac, name, ok: !!ok, evidence: String(evidence).replace(/\|/g, '/').slice(0, 140) }); console.log(`${ok ? 'PASS' : 'FAIL'} [${ac}] ${name} ${evidence}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'th-TH' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('fonts.g')) errors.push(m.text()); });
const text = () => page.locator('body').innerText();
const wait = (ms = 700) => page.waitForTimeout(ms);
// In-app navigation (hash change, no reload) — like tapping a link inside the app
const go = async (route) => { await page.evaluate((r) => { window.location.hash = r; }, route); await wait(350); };
const full = async (route) => { await page.goto(`${BASE}?r=${Date.now()}#${route}`); await wait(800); }; // full reload
const as = async (uid) => {
  await page.evaluate((u) => { localStorage.setItem('natto-demo-v1-session', JSON.stringify({ userId: u })); sessionStorage.setItem('natto-welcome-seen', '1'); }, uid);
  await full('/');
};
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const hasRibbon = async () => (await page.locator('.demo-ribbon').count()) > 0 && (await page.locator('.demo-ribbon').innerText()).includes('DEMO DATA');

await page.goto(BASE);
await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem('natto-welcome-seen', '1'); });

// ---------- AC1 role switching + AC12 labels on each landing page ----------
const USERS = [
  ['กิตติ', 'U-MKT1', 'สวัสดี, กิตติ'], ['พิมพ์', 'U-MKT2', 'สวัสดี, พิมพ์'], ['อนันต์', 'U-MKT3', 'สวัสดี, อนันต์'],
  ['ศิริพร', 'U-MKT4', 'สวัสดี, ศิริพร'], ['ธนพล', 'U-MKT5', 'สวัสดี, ธนพล'], ['วรรณา', 'U-MKT6', 'สวัสดี, วรรณา'],
  ['วิภาวดี', 'U-MGR1', 'ภาพรวมทีม · ทีม Marketing - กรุงเทพฯ'], ['ประเสริฐ', 'U-MGR2', 'ภาพรวมทีม · ทีม Marketing - ภูมิภาค'],
  ['อรุณี', 'U-EXE1', 'ภาพรวมองค์กร'],
];
let loginOk = 0, ribbonOk = 0;
for (const [name, , expect] of USERS) {
  await full('/login');
  await page.locator('button.role-card', { hasText: name }).first().click();
  await wait(900);
  if ((await text()).includes(expect)) loginOk++;
  if (await hasRibbon()) ribbonOk++;
}
check('AC1', 'เข้าระบบได้ทั้ง 9 ผู้ใช้ และเห็นหน้าแรกตามบทบาท', loginOk === 9, `${loginOk}/9`);
await full('/profile');
await page.locator('button.option', { hasText: 'วิภาวดี' }).click(); await wait(900);
const sw1 = (await text()).includes('ภาพรวมทีม');
await go('/profile'); await page.locator('button.option', { hasText: 'กิตติ' }).click(); await wait(900);
check('AC1', 'สลับบทบาทจากหน้าโปรไฟล์ (Marketing ↔ Manager)', sw1 && (await text()).includes('สวัสดี, กิตติ'));

// ---------- AC2 recommendations with reasons and evidence ----------
await as('U-MKT1');
await go('/recs');
const recLinks = await page.locator('a.card[href^="#/recs/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
check('AC2', 'Marketing เห็นรายการคำแนะนำของตัวเอง', recLinks.length === 6, `${recLinks.length} รายการ`);
let withReasons = 0, withEvidence = 0, withAsOf = 0;
for (const href of recLinks) {
  await go(href.slice(1));
  const t = await text();
  if ((await page.locator('.ai-box li').count()) >= 1) withReasons++;
  if (t.includes('ข้อมูล ณ')) withAsOf++;
  await page.getByRole('tab', { name: 'แนวโน้ม' }).click(); await wait(150);
  if ((await page.locator('table.table tbody tr').count()) >= 1) withEvidence++;
}
check('AC2', 'ทุกคำแนะนำมีเหตุผล', withReasons === recLinks.length, `${withReasons}/${recLinks.length}`);
check('AC2', 'ทุกคำแนะนำมีตารางหลักฐาน (ตัวชี้วัด / ช่วงเวลา / การเปลี่ยนแปลง)', withEvidence === recLinks.length, `${withEvidence}/${recLinks.length}`);
check('AC2', 'ทุกคำแนะนำแสดงวันที่ของข้อมูล', withAsOf === recLinks.length, `${withAsOf}/${recLinks.length}`);
await go('/recs/R-2026-11-P001'); await shot('ac2-rec-detail');

// ---------- AC3 partner metrics consistent with evidence (UI) ----------
await page.getByRole('tab', { name: 'แนวโน้ม' }).click(); await wait(150);
const evRow = await page.locator('table.table tbody tr', { hasText: 'Renewal Rate' }).first().innerText();
const [evCur, evCmp] = evRow.match(/\d+\.\d%/g) ?? [];
await go('/partner/P001?tab=perf');
await page.locator('details.disclose summary').click();
const octRow = await page.locator('table.table tbody tr', { hasText: 'ต.ค. 2026' }).innerText();
const julRow = await page.locator('table.table tbody tr', { hasText: 'ก.ค. 2026' }).innerText();
check('AC3', 'Renewal Rate ในหลักฐานคำแนะนำ = ตารางรายเดือนในหน้าคู่ค้า (Broker A)', octRow.includes(evCur) && julRow.includes(evCmp), `หลักฐาน ${evCur} vs ${evCmp} · ตาราง ต.ค. "${octRow.match(/\d+\.\d%/)?.[0]}" ก.ค. "${julRow.match(/\d+\.\d%/)?.[0]}"`);

// ---------- AC4 topics connect to signals (UI) ----------
await go('/partner/P001?tab=talk&rec=R-2026-11-P001');
const cards = await page.locator('.card', { hasText: 'สัญญาณ:' }).count();
const qs = await page.locator('.card', { hasText: 'คำถามแนะนำ' }).count();
check('AC4', 'ทุกประเด็นพูดคุยอ้างสัญญาณธุรกิจและมีคำถามแนะนำ (Broker A)', cards >= 2 && cards === qs, `${cards} ประเด็น`);
await shot('ac4-talking-points');

// ---------- AC13 baseline: planned visits before any decision ----------
await go('/visits?tab=planned');
const plannedBefore = await page.locator('a.card[href^="#/visits/"]').count();

// ---------- AC5 decisions ----------
await go('/recs/R-2026-11-P002');
await page.getByRole('button', { name: 'ไม่ใช่ตอนนี้' }).click();
await page.getByRole('button', { name: 'Partner ยังไม่พร้อม' }).click();
await page.getByRole('button', { name: 'บันทึก' }).click(); await wait(200);
await go('/recs/R-2026-11-P004');
await page.getByRole('button', { name: 'ไม่เกี่ยวข้อง' }).click();
await page.getByRole('button', { name: 'ข้อมูลไม่ตรงกับสถานการณ์จริง' }).click();
await page.getByRole('button', { name: 'บันทึก' }).click(); await wait(200);
await go('/recs/R-2026-11-P003');
await page.getByRole('button', { name: 'วางแผนติดต่อ' }).click(); await wait(200);
await go('/recs/R-2026-11-P001');
await page.getByRole('button', { name: /เตรียมเข้าพบ/ }).click(); await wait(300);
await full('/recs/R-2026-11-P002');
const d2 = await text();
await full('/recs/R-2026-11-P004');
const d4 = await text();
await full('/recs/R-2026-11-P001');
const d1 = await text();
check('AC5', 'เลือก "ไม่ใช่ตอนนี้" พร้อมเหตุผล และค่ายังอยู่หลังโหลดใหม่', d2.includes('ตัดสินใจแล้ว: ไม่ใช่ตอนนี้') && d2.includes('Partner ยังไม่พร้อม'));
check('AC5', 'เลือก "ไม่เกี่ยวข้อง" พร้อมเหตุผล', d4.includes('ตัดสินใจแล้ว: ไม่เกี่ยวข้อง') && d4.includes('ข้อมูลไม่ตรงกับสถานการณ์จริง'));
check('AC5', 'เลือก "เตรียมเข้าพบ" แล้วพาไปหน้าเตรียมเข้าพบ', d1.includes('ตัดสินใจแล้ว: เตรียมเข้าพบ'));

// ---------- AC13 decisions do not create appointments ----------
await go('/visits?tab=planned');
const plannedAfter = await page.locator('a.card[href^="#/visits/"]').count();
check('AC13', 'การตัดสินใจกับคำแนะนำไม่สร้างนัดหมายเอง', plannedAfter === plannedBefore, `แผนเข้าพบ ${plannedBefore} → ${plannedAfter}`);
await go('/recs/R-2026-11-P001');
check('AC13', 'หน้าคำแนะนำแจ้งชัดว่าไม่จองนัดให้อัตโนมัติ', (await text()).includes('ไม่จองนัดให้อัตโนมัติ'));

// ---------- AC6–AC8 visit status, 7P, next action ----------
await as('U-MGR1');
const mgrBefore = (await page.locator('tr', { hasText: 'กิตติ' }).first().innerText()).split('\t').map((s) => s.trim());
await as('U-EXE1');
const exeVisitsBefore = Number((await page.locator('.kpi', { hasText: 'การเข้าพบ' }).first().locator('.v').innerText()).match(/\d+/)[0]);
await as('U-MKT1');
// visited + 7P + action
await go('/visit/new/P001?rec=R-2026-11-P001');
await page.fill('#sum', 'เงื่อนไขซ่อมห้างไม่ครอบคลุมรถเก่า ลูกค้าย้ายไปเจ้าอื่น');
await page.getByRole('button', { name: 'ถัดไป' }).click();
await page.locator('[aria-label="ประเมิน Product"] button', { hasText: 'ต้องปรับ' }).click();
await page.fill('#d-Product', 'เงื่อนไขซ่อมห้างไม่ครอบคลุมรถอายุเกิน 5 ปี');
await page.locator('section[aria-label="หมวด Product"] button', { hasText: 'สูง' }).click();
await page.getByRole('button', { name: 'ถัดไป' }).click();
await page.selectOption('#o0', 'ทีม Product');
await page.getByLabel('ฉันตรวจสอบข้อมูล').check();
await page.getByRole('button', { name: /ตรวจสอบและบันทึก/ }).click(); await wait(500);
const vd = await text();
await page.getByRole('tab', { name: 'Feedback 7P' }).click();
const fb = await text();
await page.getByRole('tab', { name: 'แผนติดตาม' }).click();
const fu = await text();
await shot('ac7-visit-detail');
check('AC6', 'บันทึกสถานะ "เข้าพบแล้ว"', vd.includes('บันทึกการเข้าพบเรียบร้อย'));
check('AC7', 'บันทึก Feedback 7P พร้อม Sentiment และ Severity', fb.includes('ต้องปรับ · สูง') && fb.includes('รถอายุเกิน 5 ปี'));
check('AC8', 'สร้าง Next Action พร้อมผู้รับผิดชอบและวันกำหนดเสร็จ', fu.includes('ผู้รับผิดชอบ: ทีม Product') && fu.includes('กำหนด'));
// rescheduled with a new date
await go('/visit/new/P003');
await page.getByRole('button', { name: 'เลื่อนนัด' }).click();
await page.locator('#ndate').click(); await page.getByRole('button', { name: '27 พ.ย. 2026', exact: true }).click();
await page.fill('#sum', 'Partner ขอเลื่อนเพราะติดประชุม');
await page.getByRole('button', { name: 'ถัดไป' }).click();
await page.getByLabel('ฉันตรวจสอบข้อมูล').check();
await page.getByRole('button', { name: /ตรวจสอบและบันทึก/ }).click(); await wait(400);
await go('/visit/new/P004');
await page.getByRole('button', { name: 'ไม่ได้เข้าพบ' }).click();
await page.fill('#sum', 'Partner ยกเลิกนัดกะทันหัน');
await page.getByRole('button', { name: 'ถัดไป' }).click();
await page.getByLabel('ฉันตรวจสอบข้อมูล').check();
await page.getByRole('button', { name: /ตรวจสอบและบันทึก/ }).click(); await wait(400);
await go('/visits');
const hist = await text();
check('AC6', 'บันทึกสถานะ "เลื่อนนัด" และสร้างแผนวันนัดใหม่', hist.includes('Dealer C') && hist.includes('27 พ.ย. 2026'));
check('AC6', 'บันทึกสถานะ "ไม่ได้เข้าพบ"', hist.includes('ไม่ได้เข้าพบ'));

// ---------- AC9 manager sees it ----------
await as('U-MGR1');
const mgrAfter = (await page.locator('tr', { hasText: 'กิตติ' }).first().innerText()).split('\t').map((s) => s.trim());
await shot('ac9-manager');
check('AC9', 'Manager เห็นการเข้าพบของกิตติเพิ่มขึ้น (นับเฉพาะที่เข้าพบจริง)', Number(mgrAfter[3]) === Number(mgrBefore[3]) + 1, `${mgrBefore[3]} → ${mgrAfter[3]}`);
check('AC9', 'Manager เห็น Feedback ที่ต้องปรับ', mgrAfter[4].includes('ต้องปรับ'), mgrAfter[4]);
await go('/visits');
check('AC9', 'Manager เห็นรายการการเข้าพบของทีมพร้อมชื่อผู้บันทึก', (await text()).includes('· กิตติ'));

// ---------- AC10 executive ----------
await as('U-EXE1');
const ex = await text();
const exeVisitsAfter = Number((await page.locator('.kpi', { hasText: 'การเข้าพบ' }).first().locator('.v').innerText()).match(/\d+/)[0]);
await shot('ac10-exec');
check('AC10', 'ผู้บริหารเห็นจำนวน Partner ตรงกับ dataset (42 ราย)', ex.includes('42 ราย'));
check('AC10', 'การเข้าพบระดับองค์กรเพิ่มตามที่ Marketing บันทึก', exeVisitsAfter === exeVisitsBefore + 1, `${exeVisitsBefore} → ${exeVisitsAfter}`);
check('AC10', 'มีประเด็นสำคัญ เกิดอะไรขึ้น / เพราะอะไร / ควรทำอะไร', ex.includes('เกิดอะไรขึ้น') && ex.includes('เพราะอะไร') && ex.includes('ควรพิจารณาทำอะไร'));

// ---------- AC11 drill-down & RBAC ----------
await page.locator('tr', { hasText: 'ทีม Marketing - กรุงเทพฯ' }).first().click(); await wait(300);
const l1 = (await text()).includes('ภาพรวมทีม · ทีม Marketing - กรุงเทพฯ');
await page.locator('tr', { hasText: 'กิตติ' }).first().click(); await wait(300);
const l2 = (await text()).includes('คำแนะนำรอบ');
await page.locator('tr', { hasText: 'Broker A' }).last().click(); await wait(300);
const l3 = (await text()).includes('Broker A');
await go('/team/U-MKT1');
await page.locator('a.exc').first().click(); await wait(300);
const l4 = (await text()).includes('รายละเอียดการเข้าพบ');
check('AC11', 'ผู้บริหารเจาะลง องค์กร → ทีม → Marketing → Partner → การเข้าพบ', l1 && l2 && l3 && l4, [l1, l2, l3, l4].join(','));
await as('U-MGR1');
await go('/team/U-MKT4'); await wait(200); const r1 = (await text()).includes('ไม่มีสิทธิ์เข้าถึง');
await go('/partner/P010'); await wait(200); const r2 = (await text()).includes('ไม่มีสิทธิ์เข้าถึง');
await go('/org/team/T-REG'); await wait(200); const r3 = (await text()).includes('ไม่มีสิทธิ์เข้าถึง');
check('AC11', 'Manager เปิดข้อมูลทีมอื่นและหน้าระดับองค์กรไม่ได้', r1 && r2 && r3, [r1, r2, r3].join(','));
await as('U-MKT1');
await go('/partner/P006'); await wait(200); const r4 = (await text()).includes('ไม่มีสิทธิ์เข้าถึง');
await go('/recs/R-2026-11-P010'); await wait(200); const r5 = (await text()).includes('ไม่มีสิทธิ์เข้าถึง');
check('AC11', 'Marketing เปิดคู่ค้าและคำแนะนำของคนอื่นไม่ได้', r4 && r5, [r4, r5].join(','));
await as('U-MGR1');
await go('/partner/P001?tab=talk');
const ro = await text();
check('AC11', 'Manager ดูหน้าคู่ค้าได้แบบอ่านอย่างเดียว', ro.includes('อ่านอย่างเดียว') && !ro.includes('บันทึกผลการเข้าพบ'));

// ---------- AC12 DEMO DATA on every route ----------
const routes = {
  'U-MKT1': ['/', '/recs', '/recs/R-2026-11-P001', '/scenario', '/partner/P001', '/visit/new/P001', '/visits', '/report', '/profile'],
  'U-MGR1': ['/', '/team/U-MKT1', '/visits', '/partner/P001'],
  'U-EXE1': ['/', '/org/team/T-REG', '/team/U-MKT4'],
};
let rTotal = 0, rOk = 0;
for (const [uid, rs] of Object.entries(routes)) {
  await as(uid);
  for (const r of rs) { await go(r); rTotal++; if (await hasRibbon()) rOk++; }
}
check('AC12', 'ป้าย DEMO DATA อยู่ทุกหน้าทุกบทบาท', rOk === rTotal && ribbonOk === 9, `${rOk}/${rTotal} หน้า + หน้าแรก ${ribbonOk}/9`);
await page.setViewportSize({ width: 1280, height: 728 });
await page.goto(`${BASE}presentation.html?r=${Date.now()}#5`); await wait(1000);
const deckTitle = await page.locator('h1.title').innerText();
check('AC12', 'สไลด์ที่ใช้ข้อมูลใน presentation ติดป้ายข้อมูลจำลอง (booth slide 5)', (await page.locator('.tag-demo').count()) === 1 && deckTitle.includes('หลักฐาน'), deckTitle.slice(0, 60));
await page.setViewportSize({ width: 390, height: 844 });

// ---------- AC14 (UI part) estimates labelled ----------
await as('U-MKT1');
await go('/recs/R-2026-11-P001'); await page.getByRole('tab', { name: 'เหตุผล AI' }).click(); await wait(150);
const why = await text();
check('AC14', 'มูลค่าโอกาสติดป้ายประมาณการพร้อมสูตรและสมมติฐาน', why.includes('ประมาณการ') && why.includes('× 12') && why.includes('ดูสูตรและสมมติฐาน'));
await go('/recs/R-2026-11-P003'); await page.getByRole('tab', { name: 'เหตุผล AI' }).click(); await wait(150);
check('AC14', 'ไม่มีฐานคำนวณ = ไม่แสดงตัวเลข (โอกาส EV)', (await text()).includes('ยังประเมินมูลค่าไม่ได้'));

// ---------- Required states (spec M01: loading, no data, error) ----------
await page.goto(`${BASE}?r=${Date.now()}#/`); await wait(120);
const loading = (await page.locator('[aria-busy="true"]').count()) > 0;
await wait(800);
check('States', 'มีสถานะกำลังโหลด', loading);
await go('/recs'); await page.fill('input[aria-label="ค้นหาคู่ค้า"]', 'ไม่มีชื่อนี้');
check('States', 'มีสถานะไม่พบข้อมูล (ค้นหาไม่เจอ)', (await text()).includes('ไม่พบคู่ค้าตามเงื่อนไข'));
await go('/recs/NOPE'); check('States', 'มีสถานะไม่พบรายการ', (await text()).includes('ไม่พบคำแนะนำนี้'));
await go('/nope'); check('States', 'มีหน้าไม่พบหน้า', (await text()).includes('ไม่พบหน้านี้'));
await as('U-MKT6'); await go('/partner/P012'); check('States', 'แจ้งข้อมูลขาดเดือน (data unavailable) และไม่นับเป็นศูนย์ (Dealer L)', (await text()).includes('ระบบไม่นับเป็นศูนย์'));

// ---------- Responsive ----------
const sizes = [[360, 740], [768, 1024], [1280, 800]];
let rs = 0, rsTotal = 0, worst = '';
for (const [w, h] of sizes) {
  await page.setViewportSize({ width: w, height: h });
  for (const [uid, list] of [['U-MKT1', ['/', '/recs/R-2026-11-P001', '/partner/P001?tab=mix', '/visit/new/P001', '/scenario']], ['U-MGR1', ['/', '/team/U-MKT1']], ['U-EXE1', ['/']]]) {
    await as(uid);
    for (const r of list) {
      await go(r); await wait(150); rsTotal++;
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw <= w) rs++; else worst = `${w}px ${uid} ${r} scrollWidth=${sw}`;
    }
  }
}
check('Responsive', 'ไม่มีจอเลื่อนแนวนอนที่ 360 / 768 / 1280 px', rs === rsTotal, `${rs}/${rsTotal} ${worst}`);
await page.setViewportSize({ width: 390, height: 844 });

// ---------- Thai UI ----------
const bad = ['undefined', 'NaN', 'Loading', 'Submit', 'Cancel', 'Error:', '[object Object]'];
let found = [];
for (const [uid, list] of Object.entries(routes)) {
  await as(uid);
  for (const r of list) { await go(r); const t = await text(); for (const b of bad) if (t.includes(b)) found.push(`${r}:${b}`); }
}
check('Thai UI', 'ไม่พบคำ UI ภาษาอังกฤษทั่วไปหรือค่าเสีย (undefined/NaN)', found.length === 0, found.slice(0, 5).join(', '));

check('Quality', 'ไม่มี error ใน console ตลอดการทดสอบ', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed\n`);
console.log('| AC | การทดสอบ | ผล | หลักฐาน |\n|---|---|---|---|');
for (const r of results) console.log(`| ${r.ac} | ${r.name} | ${r.ok ? 'ผ่าน' : '**ไม่ผ่าน**'} | ${r.evidence} |`);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
process.exit(failed ? 1 : 0);
