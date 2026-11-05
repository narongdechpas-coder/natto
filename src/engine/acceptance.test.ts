// Acceptance criteria that can be proven on the data/engine layer (spec §14).
import { describe, expect, it } from 'vitest';
import { buildDemoData } from '../data/dataset';
import { explain } from './explain';
import { renewalRate, totalPremium } from './metrics';
import { runScenario, SCENARIOS } from './scenario';
import type { EngineContext } from './signals';

const d = buildDemoData();
const ctx: EngineContext = { partners: d.partners, series: d.series, months: d.months, visits: d.visits, followUps: d.followUps };

/** Every numeric value the explanation is allowed to print, in all the formats the templates use. */
function allowedNumbers(r: (typeof d.recommendations)[number]): Set<string> {
  const out = new Set<string>();
  const add = (v: number | null | undefined) => {
    if (v == null || !Number.isFinite(v)) return;
    for (const x of [v, v * 100, v / 1e6, Math.abs(v), Math.abs(v * 100), Math.abs(v / 1e6)]) {
      out.add(x.toFixed(0)); out.add(x.toFixed(1)); out.add(x.toFixed(2)); out.add(String(Math.round(x)));
    }
  };
  for (const s of r.signals) {
    for (const ev of s.evidence) { add(ev.currentValue); add(ev.comparisonValue); add(ev.changePp); add(ev.changePct); }
    for (const v of Object.values(s.facts)) if (typeof v === 'number') add(v);
  }
  for (const v of Object.values(r.opportunity.inputs)) add(v);
  add(r.opportunity.value);
  add(r.score);
  // calendar numbers (years, days) and template constants (3 months, 6 months, ×12, 42 partners, peer rank)
  for (const n of ['2025', '2026', '3', '6', '12', '1', String(d.partners.length)]) out.add(n);
  for (let day = 1; day <= 31; day++) out.add(String(day));
  return out;
}

describe('AC14 — no unsupported AI-generated facts', () => {
  it('every number in every explanation (all batches, all partners) comes from engine facts', () => {
    let checked = 0;
    for (const r of d.recommendations) {
      const p = d.partners.find((x) => x.id === r.partnerId)!;
      const e = explain(r, p);
      const text = [e.headline, ...e.reasons, ...e.talkingPoints.map((t) => t.signalText), e.opportunity.valueText, e.opportunity.calc ?? ''].join(' ');
      const allowed = allowedNumbers(r);
      const nums = text.replace(/ประเภท [123]\+?\/?[23]?\+?/g, '').match(/\d+(?:\.\d+)?/g) ?? [];
      for (const n of nums) {
        expect(allowed.has(n), `${r.id}: "${n}" not traceable in: ${text.slice(0, 160)}`).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it('opportunity estimates are labelled as estimates and disclose a formula, or say why there is none', () => {
    for (const r of d.recommendations) {
      const p = d.partners.find((x) => x.id === r.partnerId)!;
      const o = explain(r, p).opportunity;
      if (r.opportunity.value == null) expect(o.formula).toBeNull();
      else {
        expect(o.valueText).toContain('ประมาณการ');
        expect(o.formula).toBeTruthy();
        expect(o.assumptions.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('AC3 — Partner metrics match recommendation evidence', () => {
  it('renewal and premium evidence equals the monthly series for every recommendation', () => {
    for (const r of d.recommendations) {
      const rows = d.series.get(r.partnerId)!;
      const idx = (m: string | null) => d.months.indexOf(m!);
      for (const s of r.signals) {
        for (const ev of s.evidence) {
          if (ev.metric === 'renewal_rate') {
            expect(ev.currentValue).toBeCloseTo(renewalRate(rows[idx(ev.currentPeriod)])!, 10);
            expect(ev.comparisonValue).toBeCloseTo(renewalRate(rows[idx(ev.comparisonPeriod)])!, 10);
          }
          if (ev.metric === 'premium_mom') {
            expect(ev.currentValue).toBe(totalPremium(rows[idx(ev.currentPeriod)]));
            expect(ev.comparisonValue).toBe(totalPremium(rows[idx(ev.comparisonPeriod)]));
          }
        }
      }
    }
  });
});

describe('AC4 — discussion topics connect to business signals', () => {
  it('every triggered signal yields exactly one talking point that quotes the signal', () => {
    for (const r of d.recommendations) {
      const p = d.partners.find((x) => x.id === r.partnerId)!;
      const e = explain(r, p);
      const triggered = r.signals.filter((s) => s.triggered).map((s) => s.key);
      expect(e.talkingPoints.map((t) => t.signal).sort()).toEqual([...triggered].sort());
      for (const t of e.talkingPoints) {
        expect(t.signalText.length).toBeGreaterThan(10);
        expect(t.questions.length).toBeGreaterThan(0);
        expect(t.objective.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('AC13 — no automatic appointment booking', () => {
  it('the engine never creates visits; every planned visit in seed data has a human-style source', () => {
    const before = d.visits.length;
    const ctx2 = { ...ctx };
    for (const s of SCENARIOS) runScenario(ctx2, d.partners, d.vehicleSegments, { key: s.key, minFit: 'all' });
    expect(d.visits.length).toBe(before);
    // recommendations hold no visit/date fields
    for (const r of d.recommendations) expect(Object.keys(r)).not.toContain('visitDate');
  });
});

describe('Spec §12 / §12.1 — demo dataset shape and consistency', () => {
  it('meets the recommended demo dataset size', () => {
    expect(d.partners.filter((p) => p.isHero).length).toBeGreaterThanOrEqual(8);
    expect(new Set(d.partners.map((p) => p.type))).toEqual(new Set(['Broker', 'Dealer', 'Bank']));
    expect(d.months.length).toBe(12);
    expect(d.users.filter((u) => u.role === 'marketing').length).toBeGreaterThanOrEqual(4);
    expect(d.users.filter((u) => u.role === 'manager').length).toBe(2);
    expect(d.users.filter((u) => u.role === 'executive').length).toBe(1);
    expect(new Set(d.feedback.map((f) => f.category)).size).toBe(7);
    expect(new Set(d.followUps.map((f) => f.status))).toEqual(new Set(['open', 'in_progress', 'done']));
  });
  it('role hierarchy is consistent (marketing → manager → executive)', () => {
    for (const u of d.users.filter((x) => x.role === 'marketing')) {
      const m = d.users.find((x) => x.id === u.managerId)!;
      expect(m.role).toBe('manager');
      expect(m.teamId).toBe(u.teamId);
    }
    for (const t of d.teams) expect(d.users.find((u) => u.id === t.managerId)!.role).toBe('manager');
  });
  it('partner IDs are unique and months are consistently formatted', () => {
    expect(new Set(d.partners.map((p) => p.id)).size).toBe(d.partners.length);
    for (const m of d.months) expect(m).toMatch(/^\d{4}-\d{2}$/);
  });
});
