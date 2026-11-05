// Read-only helpers shared by screens. No React here.
import { BATCH_MONTHS, LATEST_DATA_MONTH } from '../data/config';
import type { DemoData } from '../data/dataset';
import type {
  FollowUp, MonthlyPerformance, Partner, PartnerType, ProductCategory, Recommendation, RecommendationDecision, User, Visit,
} from '../domain/types';
import { PRODUCT_CATEGORIES } from '../domain/types';
import { growth, productShare, renewalRate, sumOrNull, totalPremium } from '../engine/metrics';

export type Data = Omit<DemoData, 'decisions'> & { decisions: RecommendationDecision[] };
export const CURRENT_BATCH = BATCH_MONTHS[BATCH_MONTHS.length - 1];

export const userById = (d: Data, id: string) => d.users.find((u) => u.id === id)!;
export const partnerById = (d: Data, id: string) => d.partners.find((p) => p.id === id);

/** Data scope by role (RBAC for the demo). */
export function scopePartners(d: Data, user: User): Partner[] {
  if (user.role === 'executive') return d.partners;
  if (user.role === 'manager') {
    const team = d.users.filter((u) => u.teamId === user.teamId && u.role === 'marketing').map((u) => u.id);
    return d.partners.filter((p) => team.includes(p.ownerId));
  }
  return d.partners.filter((p) => p.ownerId === user.id);
}
export function scopeUsers(d: Data, user: User): User[] {
  if (user.role === 'executive') return d.users.filter((u) => u.role === 'marketing');
  if (user.role === 'manager') return d.users.filter((u) => u.role === 'marketing' && u.teamId === user.teamId);
  return [user];
}

export const recsFor = (d: Data, partnerIds: Set<string>, batch = CURRENT_BATCH) =>
  d.recommendations.filter((r) => r.batchMonth === batch && partnerIds.has(r.partnerId));
export const decisionFor = (d: Data, recId: string) => d.decisions.find((x) => x.recommendationId === recId) ?? null;
export const currentRecForPartner = (d: Data, partnerId: string): Recommendation | undefined =>
  d.recommendations.find((r) => r.batchMonth === CURRENT_BATCH && r.partnerId === partnerId);

export const seriesOf = (d: Data, partnerId: string): MonthlyPerformance[] => d.series.get(partnerId)!;

export function partnerKpis(d: Data, partnerId: string) {
  const rows = seriesOf(d, partnerId);
  const t = rows.length - 1;
  const ytdRows = rows.filter((r) => r.month >= '2026-01');
  const ytd = sumOrNull(ytdRows.map(totalPremium));
  const prem = totalPremium(rows[t]);
  const premPrev = totalPremium(rows[t - 1]);
  const rr = renewalRate(rows[t]);
  const rrPrev = renewalRate(rows[t - 1]);
  const shares = PRODUCT_CATEGORIES.map((k) => ({ k, s: productShare(rows[t], k) }));
  const missingMonths = rows.filter((r) => r.premiumByProduct == null).map((r) => r.month);
  return {
    month: rows[t].month, ytd, ytdMonths: ytdRows.length, prem, premPrev, premMoM: growth(prem, premPrev),
    rr, rrPrev, rrPp: rr != null && rrPrev != null ? (rr - rrPrev) * 100 : null, shares, missingMonths,
  };
}

export const followUpsOfVisit = (d: Data, visitId: string) => d.followUps.filter((f) => f.visitId === visitId);
export const isOverdue = (f: FollowUp, today: string) => f.status !== 'done' && f.dueDate < today;

export function openFollowUpsForPartner(d: Data, partnerId: string) {
  const ids = new Set(d.visits.filter((v) => v.partnerId === partnerId).map((v) => v.id));
  return d.followUps.filter((f) => ids.has(f.visitId) && f.status !== 'done');
}

/** Visit list status used on history: completed vs needs follow-up. */
export function visitTrack(d: Data, v: Visit): 'done' | 'follow' | 'planned' | 'other' {
  if (v.status === 'planned') return 'planned';
  if (v.status !== 'visited') return 'other';
  return followUpsOfVisit(d, v.id).some((f) => f.status !== 'done') ? 'follow' : 'done';
}

export function lastVisit(d: Data, partnerId: string, before: string): Visit | null {
  return [...d.visits].reverse().find((v) => v.partnerId === partnerId && v.status === 'visited' && v.date <= before) ?? null;
}

/** Monthly insight for a set of partners: the Partner type whose aggregate Renewal Rate moved most MoM. */
export function monthlyInsight(d: Data, partners: Partner[]) {
  const types: PartnerType[] = ['Broker', 'Dealer', 'Bank'];
  const t = d.months.indexOf(LATEST_DATA_MONTH);
  let best: { type: PartnerType; pp: number; n: number } | null = null;
  for (const type of types) {
    const ps = partners.filter((p) => p.type === type);
    if (!ps.length) continue;
    const agg = (i: number) => {
      const rows = ps.map((p) => seriesOf(d, p.id)[i]);
      const e = sumOrNull(rows.map((r) => r.renewalEligiblePolicies));
      const r = sumOrNull(rows.map((r) => r.renewedPolicies));
      return e && r != null ? r / e : null;
    };
    const a = agg(t), b = agg(t - 1);
    if (a == null || b == null) continue;
    const pp = (a - b) * 100;
    if (!best || Math.abs(pp) > Math.abs(best.pp)) best = { type, pp, n: ps.length };
  }
  return best;
}

export const productShareRow = (r: MonthlyPerformance, k: ProductCategory) => productShare(r, k);
