// Netlify landing rule (index.html inline script): desktop root → presentation; everything else → app.
// Simulated locally with ?netlify-landing-test. Usage: npx vite preview --port 4173, then node scripts/check-landing.mjs
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const T = 'netlify-landing-test';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const b = await chromium.launch();
const land = async (ctxOpts, url) => {
  const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage();
  await p.goto(url); await p.waitForTimeout(900);
  const u = p.url(); await ctx.close(); return u;
};
const desk = { viewport: { width: 1440, height: 900 } };
let u = await land(desk, `${BASE}?${T}`);
check('Desktop, Netlify root → presentation', u.includes('presentation.html'), u);
u = await land(devices['iPhone 13'], `${BASE}?${T}`);
check('iPhone, Netlify root → app', !u.includes('presentation.html'), u);
u = await land(devices['Pixel 7'], `${BASE}?${T}`);
check('Android phone, Netlify root → app', !u.includes('presentation.html'), u);
u = await land(devices['iPad Pro 11'], `${BASE}?${T}`);
check('iPad, Netlify root → app', !u.includes('presentation.html'), u);
u = await land({ viewport: { width: 900, height: 700 } }, `${BASE}?${T}`);
check('Narrow desktop window (<1024px) → app', !u.includes('presentation.html'), u);
u = await land(desk, `${BASE}?${T}#/recs`);
check('Desktop deep link (#/recs) → app', !u.includes('presentation.html'), u);
u = await land(desk, `${BASE}index.html?${T}`);
check('Desktop /index.html (back-to-app target) → app', !u.includes('presentation.html'), u);
u = await land(desk, BASE);
check('Desktop on other hosts (GitHub Pages / localhost) → app', !u.includes('presentation.html'), u);
// Round trip: land on deck, press "กลับแอป", stay in the app
const ctx = await b.newContext(desk); const p = await ctx.newPage();
await p.goto(`${BASE}?${T}`); await p.waitForTimeout(1200);
await p.getByRole('link', { name: 'กลับไปที่แอปนัดโตะ' }).click(); await p.waitForTimeout(1500);
check('Deck "กลับแอป" opens the app and stays there', p.url().includes('index.html') && (await p.locator('body').innerText()).includes('นัดโตะ'), p.url());
await b.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
