// Recommendation rules — DEMO ASSUMPTIONS, not approved business rules (spec §9.2).
// All thresholds are in one place so the Business Owner can review them.
import type { SignalKey } from '../domain/types';

export const SIGNAL_WEIGHTS: Record<SignalKey, number> = {
  renewal: 30,
  sales: 25,
  mix: 20,
  segment: 15,
  contact: 10,
};

export const RULES = {
  renewal: {
    lookbackMonths: 3, // compare latest month vs 3 months earlier
    fullDropPp: 12, // a 12pp drop = full intensity
    triggerDropPp: 5,
    sizeFactor: { p75: 1.0, p50: 0.75, other: 0.5 }, // renewal premium due (3m) rank
  },
  sales: {
    fullConsecutive: 3,
    fullQoqDecline: 0.15,
    triggerConsecutive: 2,
    triggerQoq: -0.08,
    triggerStreakDrop: -0.05, // a decline streak must add up to ≥5% to trigger
  },
  mix: {
    fullGapPp: 12, // gap vs peer median (same Partner type)
    fullDeclinePp: 12, // own share decline vs 6 months earlier
    triggerPp: 8,
    crossSellMinQoq: 0.08,
    crossSellFullQoq: 0.15,
    crossSellWeight: 0.8,
    crossSellCategory: 'NONMOTOR' as const,
  },
  segment: {
    fuel: 'EV' as const,
    fullShare: 0.2,
    fullChangePp: 10,
    lookbackMonths: 6,
    triggerShare: 0.1,
    triggerChangePp: 5,
  },
  contact: {
    // days since last completed visit → share of max points
    bands: [
      { minDays: 90, share: 1 },
      { minDays: 60, share: 0.7 },
      { minDays: 30, share: 0.4 },
    ],
    // Days since visit only adds points; it never triggers a recommendation on its own.
  },
  /** Opportunity estimates are annualized (×12) — demo assumption. */
  annualizeMonths: 12,
  /** Minimum eligible policies per month for a "high" confidence renewal rate. */
  minEligibleForHighConfidence: 60,
};

/**
 * Priority bands. Spec §9.2 proposes High ≥80 / Medium ≥60.
 * See docs/phase1-review.md: with an additive score, single-signal Partners can never exceed
 * the weight of that signal, so we keep both band sets and let the Business Owner choose.
 */
export const PRIORITY_BANDS = {
  spec: { high: 80, medium: 60 },
  proposed: { high: 60, medium: 30 },
};
export const ACTIVE_BANDS: keyof typeof PRIORITY_BANDS = 'proposed';
