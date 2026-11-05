import type { FuelType, PartnerType, ProductCategory } from '../domain/types';

/**
 * Partner profile = recipe for synthetic monthly data.
 * Hero partners are hand-designed to show each recommendation story in the spec (§12).
 * All values are synthetic DEMO DATA.
 */
export interface PartnerProfile {
  id: string;
  name: string;
  type: PartnerType;
  region: string;
  ownerId: string;
  isHero: boolean;
  storyTag: string | null;
  basePremium: number; // THB per month at index 0
  /** 12 multipliers on basePremium (Nov-2025 .. Oct-2026). */
  premiumMult: number[];
  mixStart: Record<ProductCategory, number>; // shares, any scale (normalized)
  mixEnd: Record<ProductCategory, number>;
  mixShiftFrom: number; // month index where drift starts (linear to index 11)
  renewalRate: number[]; // 12 values, 0..1
  renewalEligible: number; // policies due per month (approx)
  avgRenewalPremium: number; // THB per policy
  vehicles: number;
  fuelStart: Record<FuelType, number>;
  fuelEnd: Record<FuelType, number>;
  fuelShiftFrom: number;
  makeProfile: 'mass' | 'pickup' | 'ev_brand' | 'premium';
  missingMonths: number[]; // indexes with missing data (demonstrates missing ≠ zero)
}

const flat = (v: number) => Array(12).fill(v) as number[];
const mix = (t1: number, t23: number, t3: number, cmi: number, nm: number): Record<ProductCategory, number> => ({
  T1: t1, T23P: t23, T3: t3, CMI: cmi, NONMOTOR: nm,
});
const fuel = (ice: number, hyb: number, ev: number): Record<FuelType, number> => ({ ICE: ice, HYBRID: hyb, EV: ev });

export const HERO_PROFILES: PartnerProfile[] = [
  {
    id: 'P001', name: 'Broker A', type: 'Broker', region: 'กรุงเทพฯ', ownerId: 'U-MKT1', isHero: true,
    storyTag: 'Renewal decline with high renewal portfolio',
    basePremium: 3_250_000,
    premiumMult: [1.0, 1.02, 0.99, 1.01, 1.03, 1.0, 1.02, 1.04, 1.03, 0.98, 0.92, 0.81],
    mixStart: mix(52, 22, 9, 14, 3), mixEnd: mix(42, 28, 13, 14, 3), mixShiftFrom: 8,
    renewalRate: [0.78, 0.77, 0.79, 0.78, 0.76, 0.77, 0.78, 0.77, 0.72, 0.68, 0.64, 0.60],
    renewalEligible: 190, avgRenewalPremium: 13_800,
    vehicles: 4200, fuelStart: fuel(88, 8, 4), fuelEnd: fuel(86, 9, 5), fuelShiftFrom: 0,
    makeProfile: 'mass', missingMonths: [],
  },
  {
    id: 'P002', name: 'Dealer B', type: 'Dealer', region: 'ปริมณฑล', ownerId: 'U-MKT1', isHero: true,
    storyTag: 'Sales decline for two consecutive months',
    basePremium: 1_650_000,
    premiumMult: [1.0, 1.01, 1.03, 1.02, 1.04, 1.05, 1.03, 1.06, 1.05, 1.07, 0.94, 0.82],
    mixStart: mix(55, 15, 6, 22, 2), mixEnd: mix(50, 17, 8, 23, 2), mixShiftFrom: 9,
    renewalRate: [0.66, 0.67, 0.65, 0.66, 0.68, 0.67, 0.66, 0.67, 0.66, 0.65, 0.64, 0.63],
    renewalEligible: 95, avgRenewalPremium: 12_500,
    vehicles: 2100, fuelStart: fuel(80, 15, 5), fuelEnd: fuel(79, 15, 6), fuelShiftFrom: 0,
    makeProfile: 'pickup', missingMonths: [],
  },
  {
    id: 'P003', name: 'Dealer C', type: 'Dealer', region: 'กรุงเทพฯ', ownerId: 'U-MKT1', isHero: true,
    storyTag: 'EV portfolio opportunity',
    basePremium: 1_200_000,
    premiumMult: [1.0, 1.02, 1.05, 1.07, 1.1, 1.14, 1.17, 1.2, 1.24, 1.27, 1.31, 1.35],
    mixStart: mix(62, 12, 4, 20, 2), mixEnd: mix(68, 9, 3, 18, 2), mixShiftFrom: 4,
    renewalRate: [0.7, 0.71, 0.7, 0.72, 0.71, 0.72, 0.73, 0.72, 0.73, 0.74, 0.73, 0.74],
    renewalEligible: 60, avgRenewalPremium: 16_500,
    vehicles: 1600, fuelStart: fuel(78, 12, 10), fuelEnd: fuel(60, 13, 27), fuelShiftFrom: 4,
    makeProfile: 'ev_brand', missingMonths: [],
  },
  {
    id: 'P004', name: 'Bank D', type: 'Bank', region: 'กรุงเทพฯ', ownerId: 'U-MKT1', isHero: true,
    storyTag: 'Product mix concentration',
    basePremium: 2_800_000,
    premiumMult: [1.0, 1.01, 1.0, 1.02, 1.01, 1.03, 1.02, 1.03, 1.04, 1.03, 1.05, 1.04],
    mixStart: mix(80, 8, 2, 9, 1), mixEnd: mix(82, 7, 2, 8, 1), mixShiftFrom: 6,
    renewalRate: [0.8, 0.79, 0.81, 0.8, 0.8, 0.81, 0.8, 0.79, 0.8, 0.81, 0.8, 0.8],
    renewalEligible: 140, avgRenewalPremium: 15_200,
    vehicles: 3300, fuelStart: fuel(85, 11, 4), fuelEnd: fuel(84, 11, 5), fuelShiftFrom: 0,
    makeProfile: 'mass', missingMonths: [],
  },
  {
    id: 'P005', name: 'Broker E', type: 'Broker', region: 'ภาคกลาง', ownerId: 'U-MKT1', isHero: true,
    storyTag: 'Strong growth and cross-sell potential',
    basePremium: 1_900_000,
    premiumMult: [1.0, 1.03, 1.06, 1.09, 1.12, 1.15, 1.19, 1.22, 1.26, 1.3, 1.34, 1.38],
    mixStart: mix(45, 25, 10, 17, 2.5), mixEnd: mix(46, 26, 10, 16, 2), mixShiftFrom: 6,
    renewalRate: [0.79, 0.8, 0.79, 0.81, 0.8, 0.82, 0.81, 0.82, 0.83, 0.82, 0.83, 0.84],
    renewalEligible: 110, avgRenewalPremium: 12_900,
    vehicles: 2600, fuelStart: fuel(86, 10, 4), fuelEnd: fuel(84, 11, 5), fuelShiftFrom: 0,
    makeProfile: 'mass', missingMonths: [],
  },
  {
    id: 'P006', name: 'Dealer F', type: 'Dealer', region: 'ปริมณฑล', ownerId: 'U-MKT2', isHero: true,
    storyTag: 'New product fit (young hybrid/EV portfolio)',
    basePremium: 1_350_000,
    premiumMult: [1.0, 1.01, 1.03, 1.04, 1.04, 1.06, 1.07, 1.08, 1.1, 1.11, 1.12, 1.14],
    mixStart: mix(60, 14, 4, 20, 2), mixEnd: mix(61, 14, 4, 19, 2), mixShiftFrom: 6,
    renewalRate: [0.72, 0.71, 0.73, 0.72, 0.73, 0.72, 0.74, 0.73, 0.73, 0.74, 0.74, 0.75],
    renewalEligible: 70, avgRenewalPremium: 15_800,
    vehicles: 1800, fuelStart: fuel(66, 26, 8), fuelEnd: fuel(58, 28, 14), fuelShiftFrom: 2,
    makeProfile: 'mass', missingMonths: [],
  },
  {
    id: 'P007', name: 'Bank G', type: 'Bank', region: 'กรุงเทพฯ', ownerId: 'U-MKT2', isHero: true,
    storyTag: 'Positive performance, low urgency',
    basePremium: 2_400_000,
    premiumMult: [1.0, 1.01, 1.02, 1.02, 1.03, 1.04, 1.04, 1.05, 1.06, 1.06, 1.07, 1.08],
    mixStart: mix(55, 15, 6, 12, 12), mixEnd: mix(54, 15, 6, 12, 13), mixShiftFrom: 6,
    renewalRate: [0.82, 0.83, 0.82, 0.83, 0.84, 0.83, 0.84, 0.84, 0.85, 0.84, 0.85, 0.85],
    renewalEligible: 120, avgRenewalPremium: 14_100,
    vehicles: 2900, fuelStart: fuel(84, 11, 5), fuelEnd: fuel(83, 11, 6), fuelShiftFrom: 0,
    makeProfile: 'premium', missingMonths: [],
  },
  {
    id: 'P008', name: 'Broker H', type: 'Broker', region: 'ภาคกลาง', ownerId: 'U-MKT1', isHero: true,
    storyTag: 'Negative Product feedback requiring follow-up',
    basePremium: 1_500_000,
    premiumMult: [1.0, 1.0, 1.01, 0.99, 1.0, 1.01, 1.0, 0.99, 0.98, 0.99, 0.97, 0.96],
    mixStart: mix(48, 24, 10, 14, 4), mixEnd: mix(45, 25, 12, 14, 4), mixShiftFrom: 7,
    renewalRate: [0.76, 0.75, 0.76, 0.75, 0.76, 0.75, 0.74, 0.75, 0.74, 0.72, 0.71, 0.7],
    renewalEligible: 85, avgRenewalPremium: 13_200,
    vehicles: 2000, fuelStart: fuel(87, 9, 4), fuelEnd: fuel(86, 9, 5), fuelShiftFrom: 0,
    makeProfile: 'mass', missingMonths: [],
  },
  {
    id: 'P009', name: 'Dealer I', type: 'Dealer', region: 'ภาคกลาง', ownerId: 'U-MKT3', isHero: true,
    storyTag: 'Moderate renewal decline',
    basePremium: 1_100_000,
    premiumMult: [1.0, 1.01, 1.0, 1.02, 1.01, 1.0, 1.01, 1.0, 0.99, 0.98, 0.97, 0.97],
    mixStart: mix(58, 14, 5, 21, 2), mixEnd: mix(57, 14, 6, 21, 2), mixShiftFrom: 6,
    renewalRate: [0.7, 0.71, 0.7, 0.69, 0.7, 0.71, 0.7, 0.69, 0.69, 0.66, 0.63, 0.61],
    renewalEligible: 65, avgRenewalPremium: 12_000,
    vehicles: 1500, fuelStart: fuel(82, 13, 5), fuelEnd: fuel(81, 13, 6), fuelShiftFrom: 0,
    makeProfile: 'pickup', missingMonths: [],
  },
  {
    id: 'P010', name: 'Bank J', type: 'Bank', region: 'ภาคเหนือ', ownerId: 'U-MKT4', isHero: true,
    storyTag: 'Sales decline (quarter)',
    basePremium: 2_100_000,
    premiumMult: [1.0, 1.02, 1.01, 1.03, 1.02, 1.04, 1.03, 1.02, 0.97, 0.93, 0.9, 0.87],
    mixStart: mix(65, 12, 4, 11, 8), mixEnd: mix(66, 12, 4, 11, 7), mixShiftFrom: 6,
    renewalRate: [0.8, 0.8, 0.79, 0.8, 0.81, 0.8, 0.79, 0.8, 0.79, 0.78, 0.78, 0.77],
    renewalEligible: 100, avgRenewalPremium: 14_400,
    vehicles: 2400, fuelStart: fuel(86, 10, 4), fuelEnd: fuel(85, 10, 5), fuelShiftFrom: 0,
    makeProfile: 'mass', missingMonths: [],
  },
  {
    id: 'P011', name: 'Broker K', type: 'Broker', region: 'ภาคตะวันออก', ownerId: 'U-MKT5', isHero: true,
    storyTag: 'EV segment growing',
    basePremium: 1_700_000,
    premiumMult: [1.0, 1.01, 1.02, 1.03, 1.04, 1.05, 1.06, 1.07, 1.08, 1.09, 1.1, 1.11],
    mixStart: mix(50, 22, 9, 14, 5), mixEnd: mix(51, 22, 8, 14, 5), mixShiftFrom: 6,
    renewalRate: [0.77, 0.78, 0.77, 0.78, 0.79, 0.78, 0.79, 0.78, 0.79, 0.8, 0.79, 0.8],
    renewalEligible: 90, avgRenewalPremium: 13_600,
    vehicles: 2200, fuelStart: fuel(84, 10, 6), fuelEnd: fuel(74, 11, 15), fuelShiftFrom: 4,
    makeProfile: 'mass', missingMonths: [],
  },
  {
    id: 'P012', name: 'Dealer L', type: 'Dealer', region: 'ภาคอีสาน', ownerId: 'U-MKT6', isHero: true,
    storyTag: 'Missing month (data quality demo)',
    basePremium: 900_000,
    premiumMult: [1.0, 1.0, 1.01, 0.99, 1.0, 1.01, 1.0, 1.0, 1.01, 0.99, 0.93, 0.86],
    mixStart: mix(54, 16, 6, 22, 2), mixEnd: mix(54, 16, 6, 22, 2), mixShiftFrom: 6,
    renewalRate: [0.68, 0.69, 0.68, 0.67, 0.68, 0.0, 0.68, 0.67, 0.68, 0.67, 0.67, 0.66],
    renewalEligible: 50, avgRenewalPremium: 11_500,
    vehicles: 1200, fuelStart: fuel(85, 11, 4), fuelEnd: fuel(85, 11, 4), fuelShiftFrom: 0,
    makeProfile: 'pickup', missingMonths: [5],
  },
];

export { flat, mix, fuel };
