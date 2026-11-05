// Domain types for NATTO MVP demo.
// All identifiers are English; user-facing labels live in src/domain/labels.ts.

export type Role = 'marketing' | 'manager' | 'executive';
export type PartnerType = 'Broker' | 'Dealer' | 'Bank';
export type Month = string; // 'YYYY-MM'
export type ISODate = string; // 'YYYY-MM-DD'

export interface Team {
  id: string;
  name: string;
  businessUnit: string;
  managerId: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  teamId: string | null; // executive has no team
  managerId: string | null;
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  region: string;
  ownerId: string; // Marketing user assigned
  isHero: boolean; // hand-designed story partner (demo storyline)
  storyTag: string | null; // internal note on the designed story, not shown as AI fact
  mainLine: string; // e.g. 'Motor'
}

export const PRODUCT_CATEGORIES = ['T1', 'T23P', 'T3', 'CMI', 'NONMOTOR'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const FUEL_TYPES = ['ICE', 'HYBRID', 'EV'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

/** Monthly performance summary per Partner. null = data missing (never treat as zero). */
export interface MonthlyPerformance {
  partnerId: string;
  month: Month;
  premiumByProduct: Record<ProductCategory, number> | null; // THB, written premium
  renewalEligiblePolicies: number | null;
  renewedPolicies: number | null;
  renewalPremiumDue: number | null; // THB, premium of policies due for renewal in the month
  vehiclesByFuel: Record<FuelType, number> | null; // insured vehicle count (count basis — To Validate)
}

/** Latest-month vehicle portfolio breakdown. */
export interface VehicleSegment {
  partnerId: string;
  month: Month;
  make: string;
  model: string;
  yearBand: string; // e.g. '2024-2026'
  ccBand: string; // e.g. '1,201-1,800' or 'EV'
  fuel: FuelType;
  count: number;
}

export type VisitStatus = 'planned' | 'visited' | 'rescheduled' | 'not_visited';
export type VisitOutcome = 'met_objective' | 'partial' | 'not_met';

export interface Visit {
  id: string;
  partnerId: string;
  marketingId: string;
  date: ISODate;
  status: VisitStatus;
  outcome: VisitOutcome | null;
  objective: string;
  summary: string;
  recommendationId: string | null;
  /** Plan details entered before the visit (kept separate from the post-visit summary). */
  plan?: VisitPlan;
}

export interface VisitPlan { time?: string; attendees?: string; topics?: string[] }

export const SEVEN_P = [
  'Product',
  'Price',
  'Place',
  'Promotion',
  'People',
  'Process',
  'PhysicalEvidence',
] as const;
export type SevenP = (typeof SEVEN_P)[number];
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type Severity = 'high' | 'medium' | 'low';

export interface Feedback {
  id: string;
  visitId: string;
  category: SevenP;
  sentiment: Sentiment;
  severity: Severity | null; // required when sentiment = negative
  detail: string;
  productLine: ProductCategory | null;
  responsibleDept: string | null;
}

export type FollowUpStatus = 'open' | 'in_progress' | 'done';

export interface FollowUp {
  id: string;
  visitId: string;
  feedbackId: string | null;
  action: string;
  ownerName: string;
  dueDate: ISODate;
  status: FollowUpStatus;
  createdDate: ISODate;
  completedDate: ISODate | null;
}

export type OpportunityStage = 'identified' | 'qualified' | 'in_progress' | 'won' | 'closed_lost';

export interface Opportunity {
  id: string;
  partnerId: string;
  visitId: string | null;
  type: OpportunityType;
  stage: OpportunityStage;
  estimatedValue: number | null; // THB — estimate, never actual revenue
  createdDate: ISODate;
}

export type OpportunityType =
  | 'renewal_retention'
  | 'sales_recovery'
  | 'product_mix'
  | 'ev_segment'
  | 'partner_growth'
  | 'follow_up';

export type DecisionType = 'prepare' | 'plan_contact' | 'not_now' | 'not_relevant';
export type DecisionReason =
  | 'recently_visited'
  | 'already_discussed'
  | 'partner_not_ready'
  | 'relationship_context'
  | 'data_mismatch'
  | 'other';

export interface RecommendationDecision {
  recommendationId: string;
  marketingId: string;
  decision: DecisionType;
  reason: DecisionReason | null;
  comment: string | null;
  date: ISODate;
}

// ---- Recommendation engine output ----

export type SignalKey = 'renewal' | 'sales' | 'mix' | 'segment' | 'contact';
export type Priority = 'high' | 'medium' | 'low';
export type Confidence = 'high' | 'medium' | 'low';

export interface Evidence {
  metric: string; // English identifier, e.g. 'renewal_rate'
  currentValue: number | null;
  comparisonValue: number | null;
  unit: 'pct' | 'thb' | 'count' | 'days' | 'months';
  period: string; // English description of the period
  currentPeriod: Month | null;
  comparisonPeriod: Month | null;
  direction: 'up' | 'down' | 'flat' | 'na';
  changePp?: number; // for rates/shares, percentage points
  changePct?: number; // for amounts, relative %
}

export interface SignalResult {
  key: SignalKey;
  maxPoints: number;
  points: number;
  triggered: boolean;
  evidence: Evidence[];
  facts: Record<string, number | string | null>; // inputs for explanation templates
}

export interface OpportunityEstimate {
  type: OpportunityType;
  value: number | null; // THB
  formula: string; // English formula id; Thai rendering in explain layer
  inputs: Record<string, number | null>;
  insufficientReason: string | null;
}

export interface Recommendation {
  id: string;
  batchMonth: Month; // month the recommendation is issued (data month + 1)
  dataAsOf: ISODate;
  partnerId: string;
  marketingId: string;
  score: number;
  priority: Priority;
  signals: SignalResult[];
  primarySignal: SignalKey;
  opportunity: OpportunityEstimate;
  confidence: Confidence;
  confidenceReasons: string[];
}
