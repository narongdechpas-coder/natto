// Captures real app screens for the presentation (public/deck/*.png → converted to webp separately).
// Usage: npx vite preview --port 4173 (another shell), then node scripts/capture-deck.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = 'public/deck';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

async function session(viewport, uid) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'th-TH' });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate((u) => { localStorage.clear(); localStorage.setItem('natto-demo-v1-session', JSON.stringify({ userId: u })); sessionStorage.setItem('natto-welcome-seen', '1'); }, uid);
  return { ctx, page };
}
const go = async (page, route, uid) => { await page.goto(`${BASE}?s=${uid}-${Date.now()}#${route}`); await page.waitForTimeout(900); };

// Marketing (mobile)
const m = await session({ width: 390, height: 844 }, 'U-MKT1');
await go(m.page, '/', 'U-MKT1');
await m.page.screenshot({ path: `${OUT}/m-home.png` });
await go(m.page, '/recs/R-2026-11-P001', 'U-MKT1');
await m.page.screenshot({ path: `${OUT}/m-rec.png` });
await m.page.getByRole('tab', { name: 'เหตุผล AI' }).click();
await m.page.evaluate(() => window.scrollTo(0, 520));
await m.page.waitForTimeout(200);
await m.page.screenshot({ path: `${OUT}/m-formula.png` });
// Decide "prepare" through the UI so management screens show the action, then capture visit prep
await m.page.getByRole('button', { name: /เตรียมเข้าพบ/ }).click();
await m.page.waitForTimeout(400);
await m.page.screenshot({ path: `${OUT}/m-talk.png` });
// Record a visit so management screens reflect it
await go(m.page, '/visit/new/P001?rec=R-2026-11-P001', 'U-MKT1');
await m.page.fill('#sum', 'Partner บอกว่าเงื่อนไขซ่อมห้างไม่ครอบคลุมรถเก่า ลูกค้าย้ายไปเจ้าอื่น และออกกรมธรรม์ช้า');
await m.page.getByRole('button', { name: 'ถัดไป' }).click();
await m.page.getByRole('button', { name: /ให้นัดโตะช่วยจัดหมวด/ }).click();
await m.page.waitForTimeout(200);
await m.page.screenshot({ path: `${OUT}/m-7p.png` });
await m.page.getByRole('button', { name: 'ถัดไป' }).click();
await m.page.getByLabel('ฉันตรวจสอบข้อมูล').check();
await m.page.getByRole('button', { name: /ตรวจสอบและบันทึก/ }).click();
await m.page.waitForTimeout(600);
const storage = await m.page.evaluate(() => localStorage.getItem('natto-demo-v1'));

// Management (desktop) — reuse the overlay so the recorded visit is visible
for (const [uid, file] of [['U-MGR1', 'd-manager'], ['U-EXE1', 'd-exec']]) {
  const d = await session({ width: 1280, height: 800 }, uid);
  await d.page.evaluate((s) => localStorage.setItem('natto-demo-v1', s), storage);
  await go(d.page, '/', uid);
  await d.page.screenshot({ path: `${OUT}/${file}.png` });
  if (uid === 'U-EXE1') {
    await d.page.locator('text=ประเด็นสำคัญสำหรับผู้บริหาร').scrollIntoViewIfNeeded();
    await d.page.evaluate(() => window.scrollBy(0, -80));
    await d.page.waitForTimeout(200);
    await d.page.screenshot({ path: `${OUT}/d-exec-insight.png` });
  }
  await d.ctx.close();
}
await browser.close();
console.log('captured');
