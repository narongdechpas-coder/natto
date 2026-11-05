import type {
  FollowUp,
  MonthlyPerformance,
  Partner,
  PartnerType,
  ProductCategory,
  SignalResult,
  Visit,
} from '../domain/types';
import { PRODUCT_CATEGORIES } from '../domain/types';
import { RULES, SIGNAL_WEIGHTS } from './config';
import {
  clamp01,
  consecutiveDeclines,
  fuelShare,
  growth,
  median,
  percentileRank,
  productShare,
  renewalRate,
  round1,
  sumOrNull,
  totalPremium,
} from './metrics';

export interface EngineContext {
  partners: Partner[];
  /** Monthly rows per partner, ordered by DATA_MONTHS. */
  series: Map<string, MonthlyPerformance[]>;
  months: string[];
  visits: Visit[];
  followUps: FollowUp[];
}

/** Peer statistics computed once per data month (peer group = same Partner type — To Validate). */
export interface PeerStats {
  medianShare: Record<PartnerType, Record<ProductCategory, number>>;
  renewalDue3m: number[]; // all partners, for percentile rank
}

const window = <T>(arr: T[], end: number, len: number) => arr.slice(Math.max(0, end - len + 1), end + 1);

function share3m(rows: MonthlyPerformance[], t: number, k: ProductCategory): number | null {
  const w = window(rows, t, 3);
  const tot = sumOrNull(w.map(totalPremium));
  const part = sumOrNull(w.map((r) => (r.premiumByProduct ? r.premiumByProduct[k] : null)));
  return tot && part != null ? part / tot : null;
}

export function computePeerStats(ctx: EngineContext, t: number): PeerStats {
  const medianShare = {} as PeerStats['medianShare'];
  for (const type of ['Broker', 'Dealer', 'Bank'] as PartnerType[]) {
    medianShare[type] = {} as Record<ProductCategory, number>;
    const ps = ctx.partners.filter((p) => p.type === type);
    for (const k of PRODUCT_CATEGORIES) {
      const vals = ps.map((p) => share3m(ctx.series.get(p.id)!, t, k)).filter((v): v is number => v != null);
      medianShare[type][k] = median(vals);
    }
  }
  const renewalDue3m = ctx.partners
    .map((p) => sumOrNull(window(ctx.series.get(p.id)!, t, 3).map((r) => r.renewalPremiumDue)))
    .filter((v): v is number => v != null);
  return { medianShare, renewalDue3m };
}

const pp = (x: number) => round1(x * 100);

// ---------- 1. Renewal risk ----------
export function renewalSignal(rows: MonthlyPerformance[], t: number, months: string[], peers: PeerStats): SignalResult {
  const R = RULES.renewal;
  const max = SIGNAL_WEIGHTS.renewal;
  const cur = renewalRate(rows[t]);
  const cmp = renewalRate(rows[t - R.lookbackMonths]);
  const due3 = sumOrNull(window(rows, t, 3).map((r) => r.renewalPremiumDue));
  const rateSeries = window(rows, t, 6).map(renewalRate);
  if (cur == null || cmp == null || due3 == null) {
    return { key: 'renewal', maxPoints: max, points: 0, triggered: false, evidence: [], facts: { insufficient: 'missing_month' } };
  }
  const dropPp = pp(cmp - cur);
  const rank = percentileRank(peers.renewalDue3m, due3);
  const dueRank = peers.renewalDue3m.filter((x) => x > due3).length + 1;
  const size = rank >= 0.75 ? R.sizeFactor.p75 : rank >= 0.5 ? R.sizeFactor.p50 : R.sizeFactor.other;
  const intensity = clamp01(dropPp / R.fullDropPp);
  const points = round1(max * intensity * size);
  return {
    key: 'renewal',
    maxPoints: max,
    points,
    triggered: dropPp >= R.triggerDropPp,
    evidence: [
      {
        metric: 'renewal_rate', currentValue: cur, comparisonValue: cmp, unit: 'pct',
        period: `latest month vs ${R.lookbackMonths} months earlier`,
        currentPeriod: months[t], comparisonPeriod: months[t - R.lookbackMonths],
        direction: dropPp > 0 ? 'down' : dropPp < 0 ? 'up' : 'flat', changePp: -dropPp,
      },
      {
        metric: 'renewal_premium_due_3m', currentValue: due3, comparisonValue: null, unit: 'thb',
        period: 'sum of last 3 months', currentPeriod: months[t], comparisonPeriod: months[t - 2], direction: 'na',
      },
    ],
    facts: {
      dropPp, consecutiveDeclines: consecutiveDeclines(rateSeries), due3, dueRank, dueCount: peers.renewalDue3m.length, sizeFactor: size,
    },
  };
}

// ---------- 2. Sales decline ----------
export function salesSignal(rows: MonthlyPerformance[], t: number, months: string[]): SignalResult {
  const R = RULES.sales;
  const max = SIGNAL_WEIGHTS.sales;
  const prem = rows.map(totalPremium);
  const last3 = sumOrNull(window(prem, t, 3));
  const prev3 = sumOrNull(window(prem, t - 3, 3));
  const qoq = growth(last3, prev3);
  const mom = growth(prem[t], prem[t - 1]);
  if (qoq == null || mom == null) {
    return { key: 'sales', maxPoints: max, points: 0, triggered: false, evidence: [], facts: { insufficient: 'missing_month' } };
  }
  const n = consecutiveDeclines(window(prem, t, 6));
  const streakDrop = n > 0 ? growth(prem[t], prem[t - n]) : 0; // cumulative change over the decline streak
  const intensity = 0.5 * clamp01(n / R.fullConsecutive) + 0.5 * clamp01(-qoq / R.fullQoqDecline);
  return {
    key: 'sales',
    maxPoints: max,
    points: round1(max * intensity),
    triggered: (n >= R.triggerConsecutive && (streakDrop ?? 0) <= R.triggerStreakDrop) || qoq <= R.triggerQoq,
    evidence: [
      {
        metric: 'premium_mom', currentValue: prem[t], comparisonValue: prem[t - 1], unit: 'thb',
        period: 'latest month vs previous month', currentPeriod: months[t], comparisonPeriod: months[t - 1],
        direction: mom < 0 ? 'down' : mom > 0 ? 'up' : 'flat', changePct: mom,
      },
      {
        metric: 'premium_qoq', currentValue: last3, comparisonValue: prev3, unit: 'thb',
        period: 'last 3 months vs previous 3 months', currentPeriod: months[t], comparisonPeriod: months[t - 3],
        direction: qoq < 0 ? 'down' : qoq > 0 ? 'up' : 'flat', changePct: qoq,
      },
    ],
    facts: { consecutiveDeclines: n, streakDrop, qoq, mom, last3, prev3 },
  };
}

// ---------- 3. Product mix opportunity ----------
export function mixSignal(
  rows: MonthlyPerformance[], t: number, months: string[], type: PartnerType, peers: PeerStats,
): SignalResult {
  const R = RULES.mix;
  const max = SIGNAL_WEIGHTS.mix;
  let gapCat: ProductCategory | null = null, gapPp = 0;
  let declCat: ProductCategory | null = null, declPp = 0;
  for (const k of PRODUCT_CATEGORIES) {
    const s = share3m(rows, t, k);
    if (s == null) {
      return { key: 'mix', maxPoints: max, points: 0, triggered: false, evidence: [], facts: { insufficient: 'missing_month' } };
    }
    const g = pp(peers.medianShare[type][k] - s);
    if (g > gapPp) { gapPp = g; gapCat = k; }
    const before = productShare(rows[t - 6], k);
    const now = productShare(rows[t], k);
    if (before != null && now != null) {
      const d = pp(before - now);
      if (d > declPp) { declPp = d; declCat = k; }
    }
  }
  const prem = rows.map(totalPremium);
  const qoq = growth(sumOrNull(window(prem, t, 3)), sumOrNull(window(prem, t - 3, 3)));
  const csShare = share3m(rows, t, R.crossSellCategory);
  const csGapPp = csShare == null ? 0 : pp(peers.medianShare[type][R.crossSellCategory] - csShare);
  const crossSell =
    qoq != null && qoq >= R.crossSellMinQoq && csGapPp > 0 ? clamp01(qoq / R.crossSellFullQoq) * R.crossSellWeight : 0;
  if (crossSell > 0 && clamp01(gapPp / R.fullGapPp) < crossSell && clamp01(declPp / R.fullDeclinePp) < crossSell) {
    gapCat = R.crossSellCategory; gapPp = csGapPp; // cross-sell is the driver → report its category
  }
  const intensity = Math.max(clamp01(gapPp / R.fullGapPp), clamp01(declPp / R.fullDeclinePp), crossSell);
  const driver = intensity === 0 ? 'none'
    : intensity === crossSell && crossSell > 0 ? 'cross_sell'
    : clamp01(gapPp / R.fullGapPp) >= clamp01(declPp / R.fullDeclinePp) ? 'peer_gap' : 'share_decline';
  const evidence: SignalResult['evidence'] = [];
  if (gapCat) {
    evidence.push({
      metric: `share_${gapCat}_vs_peer`, currentValue: share3m(rows, t, gapCat), comparisonValue: peers.medianShare[type][gapCat],
      unit: 'pct', period: 'last 3 months share vs peer median (same Partner type)',
      currentPeriod: months[t], comparisonPeriod: months[t], direction: 'down', changePp: -gapPp,
    });
  }
  if (declCat) {
    evidence.push({
      metric: `share_${declCat}_change`, currentValue: productShare(rows[t], declCat), comparisonValue: productShare(rows[t - 6], declCat),
      unit: 'pct', period: 'latest month vs 6 months earlier', currentPeriod: months[t], comparisonPeriod: months[t - 6],
      direction: 'down', changePp: -declPp,
    });
  }
  return {
    key: 'mix', maxPoints: max, points: round1(max * intensity),
    triggered: gapPp >= R.triggerPp || declPp >= R.triggerPp || crossSell > 0,
    evidence,
    facts: { gapCat, gapPp, declCat, declPp, qoq, driver },
  };
}

// ---------- 4. Vehicle segment (EV) ----------
export function segmentSignal(rows: MonthlyPerformance[], t: number, months: string[]): SignalResult {
  const R = RULES.segment;
  const max = SIGNAL_WEIGHTS.segment;
  const cur = fuelShare(rows[t], R.fuel);
  const before = fuelShare(rows[t - R.lookbackMonths], R.fuel);
  if (cur == null || before == null) {
    return { key: 'segment', maxPoints: max, points: 0, triggered: false, evidence: [], facts: { insufficient: 'missing_month' } };
  }
  const changePp = pp(cur - before);
  const intensity = 0.5 * clamp01(cur / R.fullShare) + 0.5 * clamp01(changePp / R.fullChangePp);
  return {
    key: 'segment', maxPoints: max, points: round1(max * intensity),
    triggered: cur >= R.triggerShare || changePp >= R.triggerChangePp,
    evidence: [{
      metric: 'ev_share_vehicles', currentValue: cur, comparisonValue: before, unit: 'pct',
      period: `latest month vs ${R.lookbackMonths} months earlier`, currentPeriod: months[t],
      comparisonPeriod: months[t - R.lookbackMonths], direction: changePp > 0 ? 'up' : changePp < 0 ? 'down' : 'flat', changePp,
    }],
    facts: { evShare: cur, changePp },
  };
}

// ---------- 5. Contact / follow-up context ----------
const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

export function contactSignal(partnerId: string, asOfDate: string, visits: Visit[], followUps: FollowUp[]): SignalResult {
  const R = RULES.contact;
  const max = SIGNAL_WEIGHTS.contact;
  const past = visits
    .filter((v) => v.partnerId === partnerId && v.status === 'visited' && v.date < asOfDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  const last = past[0] ?? null;
  const days = last ? dayDiff(asOfDate, last.date) : null;
  const band = days == null ? { share: 1 } : R.bands.find((b) => days >= b.minDays) ?? { share: 0 };
  const visitIds = new Set(visits.filter((v) => v.partnerId === partnerId).map((v) => v.id));
  const overdue = followUps.filter(
    (f) => visitIds.has(f.visitId) && f.createdDate < asOfDate && f.dueDate < asOfDate &&
      !(f.completedDate && f.completedDate < asOfDate),
  );
  const share = overdue.length ? 1 : band.share;
  return {
    key: 'contact', maxPoints: max, points: round1(max * share),
    triggered: overdue.length > 0,
    evidence: [{
      metric: 'days_since_last_visit', currentValue: days, comparisonValue: null, unit: 'days',
      period: `as of ${asOfDate}`, currentPeriod: null, comparisonPeriod: null, direction: 'na',
    }, ...(overdue.length ? [{
      metric: 'overdue_follow_ups', currentValue: overdue.length, comparisonValue: null, unit: 'count' as const,
      period: `as of ${asOfDate}`, currentPeriod: null, comparisonPeriod: null, direction: 'na' as const,
    }] : [])],
    facts: { daysSinceVisit: days, lastVisitDate: last?.date ?? null, overdueFollowUps: overdue.length },
  };
}
