// Netlify landing: site root serves the booth deck (netlify.toml rewrite); presentation.html sends phones,
// tablets and the installed app on to the app. Simulated with a local server that rewrites "/" like Netlify.
// Usage: npm run build, then node scripts/check-landing.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const { chromium, devices } = createRequire(import.meta.url)('playwright'); // pre-installed globally in the dev container

const DIST = path.resolve('dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const file = u.pathname === '/' ? 'presentation.html' : decodeURIComponent(u.pathname.slice(1)); // like the Netlify rewrite
  const p = path.join(DIST, file);
  if (!p.startsWith(DIST) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end('404'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] ?? 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(4175, r));
const BASE = 'http://localhost:4175/';
const T = '?netlify-landing-test';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const b = await chromium.launch();
const land = async (opts, url, shot) => {
  const ctx = await b.newContext(opts); const p = await ctx.newPage();
  await p.goto(url); await p.waitForTimeout(1200);
  const r = { url: p.url(), deck: (await p.locator('section.slide').count()) > 0, noAnim: await p.evaluate(() => document.documentElement.classList.contains('no-anim')) };
  if (shot) await p.screenshot({ path: shot });
  await ctx.close(); return r;
};
const desk = { viewport: { width: 1440, height: 900 } };
let r = await land(desk, BASE + T, process.argv[2]);
check('Desktop, root → presentation (served at /)', r.deck && !r.url.includes('index.html'), r.url);
check('Automated browser gets final frame (no-anim)', r.noAnim);
r = await land({ viewport: { width: 1024, height: 640 } }, BASE + T);
check('Small desktop viewport (thumbnail-like) → presentation', r.deck, r.url);
for (const d of ['iPhone 13', 'Pixel 7', 'iPad Pro 11']) {
  r = await land(devices[d], BASE + T);
  check(`${d}, root → app`, r.url.includes('index.html') && !r.deck, r.url);
}
r = await land(devices['iPhone 13'], BASE + 'index.html' + T);
check('Phone opening /index.html → app', !r.deck, r.url);
r = await land(desk, BASE + 'presentation.html' + T);
check('Desktop /presentation.html → presentation', r.deck);
// Round trip on desktop: deck → "กลับแอป" → app stays
const ctx = await b.newContext(desk); const p = await ctx.newPage();
await p.goto(BASE + T); await p.waitForTimeout(1200);
await p.getByRole('link', { name: 'กลับไปที่แอปนัดโตะ' }).click(); await p.waitForTimeout(1500);
check('Deck "กลับแอป" → app', p.url().includes('index.html') && (await p.locator('section.slide').count()) === 0, p.url());
await b.close(); server.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
