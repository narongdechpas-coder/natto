// Metric definitions — PROPOSED, To Validate with Business Owner / Data Owner (spec §8.2).
// Every function returns null when data is missing. Missing is never treated as zero.
import type { FuelType, MonthlyPerformance, ProductCategory } from '../domain/types';
import { PRODUCT_CATEGORIES } from '../domain/types';

export const totalPremium = (r: MonthlyPerformance | undefined): number | null =>
  r?.premiumByProduct ? PRODUCT_CATEGORIES.reduce((s, k) => s + r.premiumByProduct![k], 0) : null;

/** Renewal Rate = renewed policies / eligible policies (policy-count basis). */
export const renewalRate = (r: MonthlyPerformance | undefined): number | null =>
  r && r.renewedPolicies != null && r.renewalEligiblePolicies ? r.renewedPolicies / r.renewalEligiblePolicies : null;

export const productShare = (r: MonthlyPerformance | undefined, k: ProductCategory): number | null => {
  const t = totalPremium(r);
  return t && r?.premiumByProduct ? r.premiumByProduct[k] / t : null;
};

export const totalVehicles = (r: MonthlyPerformance | undefined): number | null =>
  r?.vehiclesByFuel ? Object.values(r.vehiclesByFuel).reduce((a, b) => a + b, 0) : null;

export const fuelShare = (r: MonthlyPerformance | undefined, f: FuelType): number | null => {
  const t = totalVehicles(r);
  return t && r?.vehiclesByFuel ? r.vehiclesByFuel[f] / t : null;
};

/** (a - b) / b ; null if any input missing or base is zero. */
export const growth = (a: number | null, b: number | null): number | null =>
  a == null || b == null || b === 0 ? null : (a - b) / b;

export const sumOrNull = (xs: (number | null)[]): number | null =>
  xs.some((x) => x == null) ? null : (xs as number[]).reduce((a, b) => a + b, 0);

export const avgOrNull = (xs: (number | null)[]): number | null => {
  const s = sumOrNull(xs);
  return s == null ? null : s / xs.length;
};

/** Number of consecutive month-on-month declines ending at the last element. */
export function consecutiveDeclines(series: (number | null)[]): number {
  let n = 0;
  for (let i = series.length - 1; i > 0; i--) {
    const a = series[i], b = series[i - 1];
    if (a == null || b == null || a >= b) break;
    n++;
  }
  return n;
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function percentileRank(xs: number[], v: number): number {
  if (!xs.length) return 0;
  return xs.filter((x) => x <= v).length / xs.length;
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const round1 = (x: number) => Math.round(x * 10) / 10;
