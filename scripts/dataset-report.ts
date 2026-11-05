// Prints a review table of the demo dataset and the Nov-2026 recommendation batch.
import { buildDemoData } from '../src/data/dataset';
import { PRIORITY_BANDS } from '../src/engine/config';
import { priorityOf } from '../src/engine/recommend';
import { renewalRate, totalPremium } from '../src/engine/metrics';

const d = buildDemoData();
const batch = d.recommendations.filter((r) => r.batchMonth === '2026-11');
const mb = (x: number | null) => (x == null ? '—' : (x / 1e6).toFixed(2));
const pct = (x: number | null) => (x == null ? '—' : (x * 100).toFixed(1) + '%');

console.log(`partners=${d.partners.length} monthlyRows=${d.monthly.length} vehSeg=${d.vehicleSegments.length}`);
console.log(`visits=${d.visits.length} feedback=${d.feedback.length} followUps=${d.followUps.length} opps=${d.opportunities.length}`);
console.log(`recs by batch:`, Object.fromEntries(['2026-08', '2026-09', '2026-10', '2026-11'].map((m) => [m, d.recommendations.filter((r) => r.batchMonth === m).length])));
console.log('\n| Partner | Owner | Score | Spec band | Proposed band | Primary | Renew | Sales | Mix | Seg | Contact | Opp (MB) | Conf | Story |');
console.log('|---|---|---:|---|---|---|---:|---:|---:|---:|---:|---:|---|---|');
const all = d.partners.map((p) => ({ p, r: batch.find((x) => x.partnerId === p.id) }));
all.sort((a, b) => (b.r?.score ?? -1) - (a.r?.score ?? -1));
for (const { p, r } of all) {
  const owner = d.users.find((u) => u.id === p.ownerId)!.name;
  if (!r) { console.log(`| ${p.name} | ${owner} | — | not recommended | | | | | | | | | | ${p.storyTag ?? ''} |`); continue; }
  const s = (k: string) => { const x = r.signals.find((y) => y.key === k)!; return `${x.points}${x.triggered ? '*' : ''}`; };
  console.log(`| ${p.isHero ? '**' + p.name + '**' : p.name} | ${owner} | ${r.score} | ${priorityOf(r.score, PRIORITY_BANDS.spec)} | ${priorityOf(r.score, PRIORITY_BANDS.proposed)} | ${r.primarySignal} | ${s('renewal')} | ${s('sales')} | ${s('mix')} | ${s('segment')} | ${s('contact')} | ${mb(r.opportunity.value)} | ${r.confidence} | ${p.storyTag ?? ''} |`);
}
console.log('\nHero latest-month snapshot (Oct-2026):');
for (const p of d.partners.filter((x) => x.isHero)) {
  const rows = d.series.get(p.id)!;
  console.log(p.name, 'prem', mb(totalPremium(rows[11])), 'prevPrem', mb(totalPremium(rows[10])), 'RR', pct(renewalRate(rows[11])), 'RR-3', pct(renewalRate(rows[8])));
}
const r = batch.find((x) => x.partnerId === 'P001');
console.log('\nBroker A detail:', JSON.stringify(r, null, 1).slice(0, 3000));

// Thai explanation preview for hero partners
import { explain } from '../src/engine/explain';
console.log('\n=== Thai explanations (Nov-2026 batch) ===');
for (const p of d.partners.filter((x) => x.isHero)) {
  const rec = batch.find((x) => x.partnerId === p.id);
  if (!rec) { console.log(`\n## ${p.name} — ไม่ถูกแนะนำ`); continue; }
  const vIds = new Set(d.visits.filter((v) => v.partnerId === p.id).map((v) => v.id));
  const fus = d.followUps.filter((f) => vIds.has(f.visitId) && f.status !== 'done' && f.dueDate < '2026-11-01');
  const e = explain(rec, p, fus);
  console.log(`\n## ${p.name} — ${rec.priority} (${rec.score}) — ${e.headline}`);
  e.reasons.forEach((x) => console.log('- ' + x));
  console.log('ทำไมตอนนี้: ' + e.whyNow);
  console.log('ประเด็นพูดคุย: ' + e.talkingPoints.map((t) => t.topic).join(' / '));
  console.log('โอกาส: ' + e.opportunity.label + ' — ' + e.opportunity.valueText);
  if (e.opportunity.calc) console.log('สูตร: ' + e.opportunity.formula + '\n  = ' + e.opportunity.calc);
  console.log('ความเชื่อมั่น: ' + e.confidence.level + ' — ' + e.confidence.notes.join('; '));
}
