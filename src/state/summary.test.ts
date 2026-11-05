import { describe, expect, it } from 'vitest';
import { buildDemoData } from '../data/dataset';
import { DEMO_TODAY } from '../data/config';
import { buildPartnerSummary, MAX_VISIT_ROWS } from './summary';

const d = buildDemoData();

describe('Visit summary (per Partner)', () => {
  it('Broker H: latest visit, negative Product feedback and the overdue follow-up first', () => {
    const p = d.partners.find((x) => x.name === 'Broker H')!;
    const s = buildPartnerSummary(d, p.id, DEMO_TODAY)!;
    expect(s.latest!.date).toBe('2026-10-08');
    expect(s.latestFeedback.map((f) => f.category).sort()).toEqual(['Process', 'Product']);
    expect(s.sevenP.find((x) => x.key === 'Product')!.negative).toBe(1);
    expect(s.openActions[0].overdue).toBe(true);
  });
  it('counts match the visit records and never lists planned visits as history', () => {
    for (const p of d.partners) {
      const s = buildPartnerSummary(d, p.id, DEMO_TODAY)!;
      const vs = d.visits.filter((v) => v.partnerId === p.id && v.status !== 'planned');
      expect(s.visits.length).toBe(vs.length);
      expect(s.shownVisits.length).toBeLessThanOrEqual(MAX_VISIT_ROWS);
      expect(s.visits.every((v) => v.status !== 'planned')).toBe(true);
      expect(s.counts.visited + s.counts.rescheduled + s.counts.notVisited).toBe(vs.length);
    }
  });
  it('returns null for an unknown partner', () => {
    expect(buildPartnerSummary(d, 'NOPE', DEMO_TODAY)).toBeNull();
  });
});
