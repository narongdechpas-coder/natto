// Visit summary for one Partner (Marketing export, spec M06 "Export summary"). Pure data assembly.
import type { Feedback, FollowUp, SevenP, Visit } from '../domain/types';
import { SEVEN_P } from '../domain/types';
import { currentRecForPartner, isOverdue, partnerById, partnerKpis, userById, type Data } from './selectors';

export interface PartnerVisitSummary {
  partner: NonNullable<ReturnType<typeof partnerById>>;
  owner: string;
  kpis: ReturnType<typeof partnerKpis>;
  rec: ReturnType<typeof currentRecForPartner>;
  visits: Visit[]; // newest first, all statuses except planned
  shownVisits: Visit[]; // the rows that fit on one page
  latest: Visit | null; // latest completed visit
  latestFeedback: Feedback[];
  sevenP: { key: SevenP; total: number; negative: number; latest: Feedback | null }[];
  openActions: (FollowUp & { overdue: boolean })[];
  doneActions: number;
  nextPlan: Visit | null;
  counts: { visited: number; rescheduled: number; notVisited: number; feedback: number; negative: number };
}

export const MAX_VISIT_ROWS = 6;
export const MAX_ACTION_ROWS = 6;

export function buildPartnerSummary(d: Data, partnerId: string, today: string): PartnerVisitSummary | null {
  const partner = partnerById(d, partnerId);
  if (!partner) return null;
  const all = d.visits.filter((v) => v.partnerId === partnerId);
  const visits = all.filter((v) => v.status !== 'planned').sort((a, b) => b.date.localeCompare(a.date));
  const visitIds = new Set(all.map((v) => v.id));
  const fb = d.feedback.filter((f) => visitIds.has(f.visitId));
  const dateOf = new Map(all.map((v) => [v.id, v.date]));
  const latest = visits.find((v) => v.status === 'visited') ?? null;
  const fus = d.followUps.filter((f) => visitIds.has(f.visitId));
  const open = fus.filter((f) => f.status !== 'done')
    .map((f) => ({ ...f, overdue: isOverdue(f, today) }))
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.dueDate.localeCompare(b.dueDate));
  const sevenP = SEVEN_P.map((k) => {
    const xs = fb.filter((f) => f.category === k).sort((a, b) => (dateOf.get(b.visitId) ?? '').localeCompare(dateOf.get(a.visitId) ?? ''));
    return { key: k, total: xs.length, negative: xs.filter((f) => f.sentiment === 'negative').length, latest: xs[0] ?? null };
  });
  return {
    partner,
    owner: userById(d, partner.ownerId).name,
    kpis: partnerKpis(d, partnerId),
    rec: currentRecForPartner(d, partnerId),
    visits,
    shownVisits: visits.slice(0, MAX_VISIT_ROWS),
    latest,
    latestFeedback: latest ? fb.filter((f) => f.visitId === latest.id) : [],
    sevenP,
    openActions: open,
    doneActions: fus.length - open.length,
    nextPlan: all.filter((v) => v.status === 'planned' && v.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null,
    counts: {
      visited: visits.filter((v) => v.status === 'visited').length,
      rescheduled: visits.filter((v) => v.status === 'rescheduled').length,
      notVisited: visits.filter((v) => v.status === 'not_visited').length,
      feedback: fb.length,
      negative: fb.filter((f) => f.sentiment === 'negative').length,
    },
  };
}
