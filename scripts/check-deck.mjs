// Renders every slide at 1280×720, checks overflow / console errors, and a phone reading-mode pass.
// Usage: npx vite preview --port 4173 (another shell), then node scripts/check-deck.mjs [outDir]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container
const BASE = (process.env.BASE_URL ?? 'http://localhost:4173/') + 'presentation.html';
const OUT = process.argv[2] ?? 'deck-shots';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 728 }, locale: 'th-TH' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
let fails = 0;
await page.goto(BASE + '#1'); await page.waitForTimeout(1200);
const total = await page.evaluate(() => Number(document.querySelector('.controls span').textContent.split('/')[1]));
for (let n = 1; n <= total; n++) {
  await page.waitForTimeout(250);
  const info = await page.evaluate(() => {
    const s = document.querySelector('.slide');
    // Only visible content counts (layout containers may stretch into the padding).
    const content = 'img, p, li, td, th, h1, h3, svg, .card, .shot, .phone, .big, .formula';
    const sr = s.getBoundingClientRect();
    const limit = sr.bottom - 50 * (sr.height / 720); // keep clear of footer zone
    const over = [...s.querySelectorAll(content)].filter((el) => {
      if (el.closest('.footer')) return false;
      const r = el.getBoundingClientRect();
      return r.height > 0 && (r.bottom > limit + 1 || r.right > sr.right + 1);
    }).map((el) => `${el.tagName}.${el.className}`).slice(0, 3);
    const imgs = [...s.querySelectorAll('img')].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src);
    return { over, imgs };
  });
  const ok = !info.over.length && !info.imgs.length;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} slide ${n}`, info.over.length ? `overflow:${info.over.join(',')}` : '', info.imgs.length ? `broken:${info.imgs}` : '');
  await page.screenshot({ path: `${OUT}/slide-${String(n).padStart(2, '0')}.png` });
  await page.keyboard.press('ArrowRight');
}
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '?m=1'); await page.waitForTimeout(1000);
const w = await page.evaluate(() => document.documentElement.scrollWidth);
console.log(`${w <= 390 ? 'PASS' : 'FAIL'} reading mode no horizontal scroll (scrollWidth=${w})`); if (w > 390) fails++;
const sections = await page.locator('section.slide').count();
console.log(`${sections === total ? 'PASS' : 'FAIL'} reading mode shows all ${total} slides`); if (sections !== total) fails++;
await page.screenshot({ path: `${OUT}/reading.png`, fullPage: true });
console.log(`${errors.length ? 'FAIL' : 'PASS'} no console errors ${errors.slice(0, 3).join(' | ')}`); if (errors.length) fails++;
await b.close();
process.exit(fails ? 1 : 0);
