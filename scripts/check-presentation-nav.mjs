// App ↔ presentation navigation: Welcome and Profile open the deck in the same tab; the deck links back.
// Usage: npx vite preview --port 4173 (another shell), then node scripts/check-presentation-nav.mjs [outDir]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container
const S = process.argv[2] ?? 'nav-shots'; fs.mkdirSync(S, { recursive: true });
const b = await chromium.launch(); let ok = 0, n = 0;
 const check = (name, c, x='') => { n++; if (c) ok++; console.log(`${c?'PASS':'FAIL'} ${name} ${x}`); };
 for (const [w,h,tag] of [[847,664,'desk'],[390,844,'phone'],[360,640,'small']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: 'th-TH' });
  await p.goto('http://localhost:4173/?t='+tag); await p.waitForTimeout(3200);
  const r = await p.evaluate(() => { const f = document.querySelector('.welcome-footer').getBoundingClientRect(); const a = document.querySelector('.welcome-actions').getBoundingClientRect(); return { overlap: f.top < a.bottom, inView: f.bottom <= innerHeight, sw: document.documentElement.scrollWidth }; });
  check(`${tag}: footer below actions, in view, no h-scroll`, !r.overlap && r.inView && r.sw <= w, JSON.stringify(r));
  await p.screenshot({ path: `${S}/welcome-pres-${tag}.png` });
  await p.getByRole('link', { name: 'App Presentation' }).click(); await p.waitForTimeout(1500);
  check(`${tag}: opens presentation in same tab`, p.url().includes('presentation.html'));
  await p.screenshot({ path: `${S}/deck-${tag}.png` });
  await p.getByRole('link', { name: 'กลับไปที่แอปนัดโตะ' }).click(); await p.waitForTimeout(1200);
  check(`${tag}: back to app`, p.url().includes('index.html') && (await p.locator('body').innerText()).includes('นัดโตะ'));
  await p.close();
 }
 // profile entry
 const p = await b.newPage({ viewport: { width: 390, height: 844 } });
 await p.goto('http://localhost:4173/'); await p.evaluate(() => { localStorage.setItem('natto-demo-v1-session', JSON.stringify({ userId: 'U-MKT1' })); sessionStorage.setItem('natto-welcome-seen','1'); });
 await p.goto('http://localhost:4173/?q=1#/profile'); await p.waitForTimeout(900);
 check('profile has App Presentation button', (await p.getByRole('link', { name: /App Presentation/ }).count()) === 1);
await b.close(); console.log(`${ok}/${n} passed`); process.exit(ok === n ? 0 : 1);
