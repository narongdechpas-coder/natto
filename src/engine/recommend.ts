import type {
  Confidence,
  MonthlyPerformance,
  OpportunityEstimate,
  Priority,
  Recommendation,
  SignalKey,
  SignalResult,
} from '../domain/types';
import { ACTIVE_BANDS, PRIORITY_BANDS, RULES } from './config';
import { avgOrNull, renewalRate, round1, sumOrNull, totalPremium } from './metrics';
import {
  computePeerStats,
  contactSignal,
  mixSignal,
  renewalSignal,
  salesSignal,
  segmentSignal,
  type EngineContext,
} from './signals';

export function priorityOf(score: number, bands = PRIORITY_BANDS[ACTIVE_BANDS]): Priority {
  return score >= bands.high ? 'high' : score >= bands.medium ? 'medium' : 'low';
}

const SIGNAL_ORDER: SignalKey[] = ['renewal', 'sales', 'mix', 'segment', 'contact'];

/**
 * Primary signal = triggered business signal with the highest intensity (points / max); ties → spec weight order.
 * Follow-up context ('contact') is primary only when no triggered business signal reaches intensity 0.5.
 */
function primaryOf(signals: SignalResult[]): SignalKey {
  const ratio = (s: SignalResult) => s.points / s.maxPoints;
  const byIntensity = (a: SignalResult, b: SignalResult) =>
    ratio(b) - ratio(a) || SIGNAL_ORDER.indexOf(a.key) - SIGNAL_ORDER.indexOf(b.key);
  const business = signals.filter((s) => s.triggered && s.key !== 'contact').sort(byIntensity);
  const contact = signals.find((s) => s.key === 'contact' && s.triggered);
  if (business.length && (ratio(business[0]) >= 0.5 || !contact)) return business[0].key;
  if (contact) return 'contact';
  return [...signals].sort(byIntensity)[0].key;
}

/**
 * Estimated opportunity — ประมาณการ, annualized, formula disclosed (spec §9.4).
 * Every input is stored so the UI can show the calculation.
 */
export function estimateOpportunity(
  primary: SignalKey, signals: SignalResult[], rows: MonthlyPerformance[], t: number,
): OpportunityEstimate {
  const A = RULES.annualizeMonths;
  const sig = (k: SignalKey) => signals.find((s) => s.key === k)!;
  if (primary === 'renewal') {
    const baseline = avgOrNull([t - 5, t - 4, t - 3].map((i) => renewalRate(rows[i])));
    const current = renewalRate(rows[t]);
    const avgDue = avgOrNull([t - 2, t - 1, t].map((i) => rows[i].renewalPremiumDue));
    if (baseline == null || current == null || avgDue == null) {
      return { type: 'renewal_retention', value: null, formula: 'renewal_gap_x_due_x12', inputs: {}, insufficientReason: 'missing_month' };
    }
    const gap = Math.max(0, baseline - current);
    return {
      type: 'renewal_retention', value: Math.round(gap * avgDue * A), formula: 'renewal_gap_x_due_x12',
      inputs: { baselineRate: baseline, currentRate: current, avgMonthlyRenewalDue: avgDue, months: A }, insufficientReason: null,
    };
  }
  if (primary === 'sales') {
    const f = sig('sales').facts;
    const last3 = f.last3 as number, prev3 = f.prev3 as number;
    if (prev3 <= last3) {
      return { type: 'sales_recovery', value: null, formula: 'qoq_gap_monthly_x12', inputs: { avgMonthlyPrev3: prev3 / 3, avgMonthlyLast3: last3 / 3 }, insufficientReason: 'no_quarter_decline' };
    }
    return {
      type: 'sales_recovery', value: Math.round(((prev3 - last3) / 3) * A), formula: 'qoq_gap_monthly_x12',
      inputs: { avgMonthlyPrev3: prev3 / 3, avgMonthlyLast3: last3 / 3, months: A }, insufficientReason: null,
    };
  }
  if (primary === 'mix') {
    const f = sig('mix').facts;
    const gapPp = f.gapPp as number;
    const avgPrem = avgOrNull([t - 2, t - 1, t].map((i) => totalPremium(rows[i])));
    if (!gapPp || avgPrem == null) {
      return { type: 'product_mix', value: null, formula: 'peer_gap_x_premium_x12', inputs: {}, insufficientReason: 'no_peer_gap' };
    }
    return {
      type: f.driver === 'cross_sell' ? 'partner_growth' : 'product_mix',
      value: Math.round((gapPp / 100) * avgPrem * A), formula: 'peer_gap_x_premium_x12',
      inputs: { gapPp, avgMonthlyPremium: avgPrem, months: A }, insufficientReason: null,
    };
  }
  if (primary === 'segment') {
    return {
      type: 'ev_segment', value: null, formula: 'none', inputs: {},
      insufficientReason: 'no_ev_premium_basis', // no approved EV product premium per vehicle yet
    };
  }
  return { type: 'follow_up', value: null, formula: 'none', inputs: {}, insufficientReason: 'not_applicable' };
}

function confidenceOf(rows: MonthlyPerformance[], t: number): { level: Confidence; reasons: string[] } {
  const reasons: string[] = [];
  const recent = rows.slice(Math.max(0, t - 6), t + 1);
  if (recent.some((r) => r.premiumByProduct == null)) reasons.push('missing_month_in_window');
  const avgEligible = avgOrNull(rows.slice(t - 2, t + 1).map((r) => r.renewalEligiblePolicies));
  if (avgEligible != null && avgEligible < RULES.minEligibleForHighConfidence) reasons.push('small_renewal_base');
  const level: Confidence = reasons.includes('missing_month_in_window') ? 'low' : reasons.length ? 'medium' : 'high';
  return { level, reasons };
}

export interface BatchOptions {
  /** Data month index used as "latest". */
  dataMonthIndex: number;
  batchMonth: string; // e.g. '2026-11'
  dataAsOf: string; // e.g. '2026-10-31'
}

/** Run the rule engine for every Partner and return recommendations (only Partners with ≥1 triggered signal). */
export function runBatch(ctx: EngineContext, opt: BatchOptions): Recommendation[] {
  const t = opt.dataMonthIndex;
  const peers = computePeerStats(ctx, t);
  const issueDate = `${opt.batchMonth}-01`;
  const out: Recommendation[] = [];
  for (const p of ctx.partners) {
    const rows = ctx.series.get(p.id)!;
    const signals = [
      renewalSignal(rows, t, ctx.months, peers),
      salesSignal(rows, t, ctx.months),
      mixSignal(rows, t, ctx.months, p.type, peers),
      segmentSignal(rows, t, ctx.months),
      contactSignal(p.id, issueDate, ctx.visits, ctx.followUps),
    ];
    if (!signals.some((s) => s.triggered)) continue;
    const score = round1(sumOrNull(signals.map((s) => s.points))!);
    const primary = primaryOf(signals);
    const conf = confidenceOf(rows, t);
    out.push({
      id: `R-${opt.batchMonth}-${p.id}`,
      batchMonth: opt.batchMonth,
      dataAsOf: opt.dataAsOf,
      partnerId: p.id,
      marketingId: p.ownerId,
      score: Math.round(score),
      priority: priorityOf(score),
      signals,
      primarySignal: primary,
      opportunity: estimateOpportunity(primary, signals, rows, t),
      confidence: conf.level,
      confidenceReasons: conf.reasons,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}
