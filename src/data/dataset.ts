// Single source of truth for the demo: every screen reads from buildDemoData().
import type {
  DecisionReason,
  DecisionType,
  MonthlyPerformance,
  Opportunity,
  OpportunityStage,
  Recommendation,
  RecommendationDecision,
} from '../domain/types';
import { runBatch } from '../engine/recommend';
import type { EngineContext } from '../engine/signals';
import { generateActivity, type ActivityData } from './activity';
import { BATCH_MONTHS, DATA_MONTHS, DEMO_TODAY, SEED } from './config';
import { generateDataset, type DemoDataset } from './generate';
import { TEAMS, USERS } from './org';
import { mulberry32, pick } from './random';

export const DEMO_MARKETING_USER = 'U-MKT1';

export interface DemoData extends DemoDataset, ActivityData {
  teams: typeof TEAMS;
  users: typeof USERS;
  months: string[];
  series: Map<string, MonthlyPerformance[]>;
  recommendations: Recommendation[];
  decisions: RecommendationDecision[];
  opportunities: Opportunity[];
}

const lastDayOf = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
const prevMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
};

export function buildDemoData(): DemoData {
  const base = generateDataset();
  const activity = generateActivity(base.partners);
  const series = new Map<string, MonthlyPerformance[]>();
  for (const p of base.partners) {
    series.set(p.id, DATA_MONTHS.map((m) => base.monthly.find((r) => r.partnerId === p.id && r.month === m)!));
  }
  const ctx: EngineContext = {
    partners: base.partners, series, months: DATA_MONTHS, visits: activity.visits, followUps: activity.followUps,
  };

  const recommendations: Recommendation[] = [];
  for (const batchMonth of BATCH_MONTHS) {
    const dataMonth = prevMonth(batchMonth);
    recommendations.push(
      ...runBatch(ctx, { dataMonthIndex: DATA_MONTHS.indexOf(dataMonth), batchMonth, dataAsOf: lastDayOf(dataMonth) }),
    );
  }

  // Link visits to the recommendation of the same month (if one exists)
  for (const v of activity.visits) {
    const rec = recommendations.find((r) => r.partnerId === v.partnerId && r.batchMonth === v.date.slice(0, 7));
    if (rec) v.recommendationId = rec.id;
  }

  // Synthetic Marketing decisions. The demo user's current batch stays undecided for the live demo.
  const rng = mulberry32(SEED ^ 0xdec1de);
  const decisions: RecommendationDecision[] = [];
  const currentBatch = BATCH_MONTHS[BATCH_MONTHS.length - 1];
  for (const r of recommendations) {
    const visited = activity.visits.some((v) => v.recommendationId === r.id);
    const isLiveDemo = r.batchMonth === currentBatch && r.marketingId === DEMO_MARKETING_USER;
    if (isLiveDemo) continue;
    if (r.batchMonth === currentBatch && !visited && rng() < 0.45) continue; // still pending
    let decision: DecisionType;
    let reason: DecisionReason | null = null;
    if (visited) decision = 'prepare';
    else {
      const x = rng();
      decision = x < 0.35 ? 'plan_contact' : x < 0.7 ? 'not_now' : 'not_relevant';
      if (decision !== 'plan_contact') {
        reason = pick(rng, ['recently_visited', 'already_discussed', 'partner_not_ready', 'relationship_context', 'data_mismatch', 'other'] as const);
      }
    }
    decisions.push({
      recommendationId: r.id, marketingId: r.marketingId, decision, reason,
      comment: null, date: `${r.batchMonth}-0${1 + Math.floor(rng() * 8)}`,
    });
  }

  // Opportunities: created from visited visits linked to a recommendation with an estimate.
  const opportunities: Opportunity[] = [];
  let oN = 1;
  for (const v of activity.visits) {
    if (v.status !== 'visited' || !v.recommendationId || v.outcome === 'not_met') continue;
    const r = recommendations.find((x) => x.id === v.recommendationId)!;
    const ageDays = (Date.parse(DEMO_TODAY) - Date.parse(v.date)) / 86_400_000;
    const x = rng();
    const stage: OpportunityStage =
      ageDays < 20 ? 'identified' : ageDays < 50 ? (x < 0.6 ? 'qualified' : 'in_progress')
      : x < 0.35 ? 'won' : x < 0.55 ? 'closed_lost' : 'in_progress';
    opportunities.push({
      id: `O${String(oN++).padStart(3, '0')}`, partnerId: v.partnerId, visitId: v.id,
      type: r.opportunity.type, stage, estimatedValue: r.opportunity.value, createdDate: v.date,
    });
  }

  return {
    ...base, ...activity, teams: TEAMS, users: USERS, months: DATA_MONTHS, series,
    recommendations, decisions, opportunities,
  };
}
