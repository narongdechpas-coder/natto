import { describe, expect, it } from 'vitest';
import { buildDemoData, DEMO_MARKETING_USER } from '../data/dataset';
import { explain } from './explain';
import { consecutiveDeclines, growth, renewalRate, sumOrNull, totalPremium } from './metrics';

const d = buildDemoData();
const nov = d.recommendations.filter((r) => r.batchMonth === '2026-11');
const rec = (name: string) => {
  const p = d.partners.find((x) => x.name === name)!;
  return { p, r: nov.find((x) => x.partnerId === p.id) };
};

describe('dataset', () => {
  it('is deterministic', () => {
    const d2 = buildDemoData();
    expect(d2.monthly).toEqual(d.monthly);
    expect(d2.recommendations.map((r) => [r.id, r.score])).toEqual(d.recommendations.map((r) => [r.id, r.score]));
  });
  it('has 12 hero + 30 background partners, 12 months each', () => {
    expect(d.partners.filter((p) => p.isHero)).toHaveLength(12);
    expect(d.partners.filter((p) => !p.isHero)).toHaveLength(30);
    expect(d.monthly).toHaveLength(42 * 12);
  });
  it('keeps missing months as null, never zero', () => {
    const l = d.series.get(d.partners.find((p) => p.name === 'Dealer L')!.id)!;
    expect(l[5].premiumByProduct).toBeNull();
    expect(totalPremium(l[5])).toBeNull();
    expect(renewalRate(l[5])).toBeNull();
    expect(sumOrNull([1, null, 2])).toBeNull();
  });
  it('every partner owner is a Marketing user in a team', () => {
    for (const p of d.partners) {
      const u = d.users.find((x) => x.id === p.ownerId)!;
      expect(u.role).toBe('marketing');
      expect(u.teamId).not.toBeNull();
    }
  });
});

describe('metrics', () => {
  it('growth handles zero / missing base', () => {
    expect(growth(10, 0)).toBeNull();
    expect(growth(null, 5)).toBeNull();
    expect(growth(110, 100)).toBeCloseTo(0.1);
  });
  it('counts consecutive declines', () => {
    expect(consecutiveDeclines([5, 4, 3, 2])).toBe(3);
    expect(consecutiveDeclines([1, 2, 3])).toBe(0);
    expect(consecutiveDeclines([3, 2, null, 1])).toBe(0);
  });
});

describe('recommendation stories (spec §12)', () => {
  it('Broker A is High priority with renewal as primary reason', () => {
    const { r } = rec('Broker A');
    expect(r!.priority).toBe('high');
    expect(r!.primarySignal).toBe('renewal');
  });
  it('Dealer B → sales, Dealer C → EV segment, Bank D → product mix, Broker H → follow-up', () => {
    expect(rec('Dealer B').r!.primarySignal).toBe('sales');
    expect(rec('Dealer C').r!.primarySignal).toBe('segment');
    expect(rec('Bank D').r!.primarySignal).toBe('mix');
    expect(rec('Broker H').r!.primarySignal).toBe('contact');
  });
  it('Bank G (low urgency) is not recommended', () => {
    expect(rec('Bank G').r).toBeUndefined();
  });
  it('Dealer L shows low confidence due to missing month', () => {
    expect(rec('Dealer L').r!.confidence).toBe('low');
  });
  it('every recommendation has at least one triggered signal', () => {
    for (const r of d.recommendations) expect(r.signals.some((s) => s.triggered)).toBe(true);
  });
  it('evidence matches the monthly series shown on Partner screens', () => {
    const { p, r } = rec('Broker A');
    const rows = d.series.get(p.id)!;
    const ev = r!.signals.find((s) => s.key === 'renewal')!.evidence[0];
    expect(ev.currentValue).toBeCloseTo(renewalRate(rows[11])!);
    expect(ev.comparisonValue).toBeCloseTo(renewalRate(rows[8])!);
  });
  it('opportunity value is recomputable from its disclosed inputs', () => {
    for (const r of nov) {
      const o = r.opportunity;
      if (o.value == null) continue;
      const i = o.inputs;
      const v = o.formula === 'renewal_gap_x_due_x12' ? (i.baselineRate! - i.currentRate!) * i.avgMonthlyRenewalDue! * 12
        : o.formula === 'qoq_gap_monthly_x12' ? (i.avgMonthlyPrev3! - i.avgMonthlyLast3!) * 12
        : (i.gapPp! / 100) * i.avgMonthlyPremium! * 12;
      expect(Math.abs(v - o.value)).toBeLessThan(2);
      expect(o.value).toBeGreaterThan(0);
    }
  });
  it('demo user current batch is undecided (for live demo)', () => {
    const ids = new Set(nov.filter((r) => r.marketingId === DEMO_MARKETING_USER).map((r) => r.id));
    expect(d.decisions.some((x) => ids.has(x.recommendationId))).toBe(false);
  });
});

describe('explanation (Thai)', () => {
  it('produces reasons, talking points and disclosed formula for Broker A', () => {
    const { p, r } = rec('Broker A');
    const e = explain(r!, p);
    expect(e.reasons.length).toBeGreaterThan(1);
    expect(e.talkingPoints[0].signal).toBe('renewal');
    expect(e.opportunity.formula).toContain('Renewal Rate');
    expect(e.reasons[0]).toContain('pp');
  });
  it('never shows a value for EV opportunity (no approved basis)', () => {
    const { p, r } = rec('Dealer C');
    expect(explain(r!, p).opportunity.formula).toBeNull();
  });
});
