// Booth deck behaviour: QR target, autoplay (booth mode) + pause on interaction, ROI calculator math.
// Usage: npx vite preview --port 4173 (another shell), then node scripts/check-booth.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container
const BASE = (process.env.BASE_URL ?? 'http://localhost:4173/') + 'presentation.html';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 728 }, locale: 'th-TH' });
const slideNo = async () => Number((await page.locator('.controls span').innerText()).split('/')[0]);

// Autoplay: cover lasts 8s in booth mode, then advances
await page.goto(`${BASE}?booth=1#1`); await page.waitForTimeout(500);
check('Booth mode starts on the cover', (await slideNo()) === 1);
await page.waitForTimeout(8600);
check('Booth mode auto-advances after 8s', (await slideNo()) === 2, `slide ${await slideNo()}`);
await page.mouse.click(640, 300); // interaction pauses
check('Interaction pauses autoplay', (await page.locator('.controls').innerText()).includes('พักชั่วคราว'));
await page.waitForTimeout(11000);
check('Stays on the slide while paused', (await slideNo()) === 2);

// Wraps around at the end
await page.goto(`${BASE}?booth=1&r=1#11`); await page.waitForTimeout(10600);
check('Booth mode loops from last slide back to the cover', (await slideNo()) === 1, `slide ${await slideNo()}`);

// ROI calculator
await page.goto(`${BASE}?r=2#10`); await page.waitForTimeout(900);
const out = async () => page.locator('.roi-out').innerText();
let t = await out();
check('ROI defaults: 10×12×60min×30% = 36 h/month', t.includes('36 ชม.'));
check('ROI defaults: time value 36×12×400 = 0.17 MB/yr', t.includes('0.17 ล้านบาท'));
check('ROI defaults: renewal 100 MB × 0.5pp = 0.50 MB/yr', t.includes('0.50 ล้านบาท'));
check('ROI needs a cost before showing a %', t.includes('กรอกค่าใช้จ่ายระบบเพื่อดู ROI'));
await page.getByLabel('จำนวน Marketing / ทีมขาย (ตัวเลข)').fill('20');
await page.getByLabel('ค่าใช้จ่ายระบบต่อปี').fill('100000');
t = await out();
// 20×12×60×0.3/60 = 72 h → 72×12×400 = 345,600 → ROI = (345,600−100,000)/100,000 = 245.6%; payback = 100,000/(28,800) = 3.5 months
check('ROI recomputes: 72 h/month', t.includes('72 ชม.'));
check('ROI = (345,600 − 100,000) ÷ 100,000 = 245.6%', t.includes('245.6%'), t.match(/[\d.,]+%/)?.[0]);
check('Payback ≈ 3.5 months', t.includes('คืนทุนใน ≈ 3.5 เดือน'));
check('Typing in the calculator does not change slides', (await slideNo()) === 10);

// QR points at the GitHub Pages demo
const svg = await (await page.request.get(BASE.replace('presentation.html', 'deck/qr-demo.svg'))).text();
check('QR asset is served', svg.startsWith('<svg'));
await b.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
