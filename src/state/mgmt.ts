// Aggregations for Manager (M07) and Executive (M08) dashboards. Pure functions over the merged data.
import type { Partner, PartnerType, SevenP, User } from '../domain/types';
import { SEVEN_P } from '../domain/types';
import { fmtDate } from '../domain/labels';
import { sumOrNull, totalPremium } from '../engine/metrics';
import { CURRENT_BATCH, decisionFor, isOverdue, seriesOf, type Data } from './selectors';

export const MGMT_MONTHS = ['2026-08', '2026-09', '2026-10', '2026-11'];

const prevMonth = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
};
const lastDay = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
};

/** Date window for a month. The current month is month-to-date; its comparison uses the same days of the previous month. */
export function periodOf(month: string, today: string) {
  const isCurrent = today.startsWith(month);
  const from = `${month}-01`;
  const to = isCurrent ? today : lastDay(month);
  const pm = prevMonth(month);
  const day = Number(to.slice(8));
  const pTo = isCurrent ? `${pm}-${String(Math.min(day, Number(lastDay(pm).slice(8)))).padStart(2, '0')}` : lastDay(pm);
  return { month, from, to, isCurrent, prev: { month: pm, from: `${pm}-01`, to: pTo } };
}
const inRange = (d: string, r: { from: string; to: string }) => d >= r.from && d <= r.to;

export const teamMembers = (d: Data, teamId: string) => d.users.filter((u) => u.role === 'marketing' && u.teamId === teamId);
export const partnersOfUsers = (d: Data, ids: string[]) => d.partners.filter((p) => ids.includes(p.ownerId));

export interface Stats {
  partners: number;
  recs: number;
  acted: number; // prepare + plan_contact
  deferred: number; // not_now + not_relevant
  pending: number;
  visits: number;
  visitsPrev: number;
  partnersVisited: number;
  coverage90: number | null; // share of partners visited in the last 90 days
  feedback: number;
  negative: number;
  openActions: number;
  overdue: number;
  oppCount: number;
  oppValue: number;
}

export function statsFor(d: Data, partners: Partner[], month: string, today: string): Stats {
  const ids = new Set(partners.map((p) => p.id));
  const per = periodOf(month, today);
  const recs = d.recommendations.filter((r) => r.batchMonth === month && ids.has(r.partnerId));
  const dec = recs.map((r) => decisionFor(d, r.id)?.decision);
  const visited = d.visits.filter((v) => ids.has(v.partnerId) && v.status === 'visited');
  const inM = visited.filter((v) => inRange(v.date, per));
  const vIds = new Set(inM.map((v) => v.id));
  const fb = d.feedback.filter((f) => vIds.has(f.visitId));
  const allVisitIds = new Set(d.visits.filter((v) => ids.has(v.partnerId)).map((v) => v.id));
  const fus = d.followUps.filter((f) => allVisitIds.has(f.visitId) && f.status !== 'done');
  const from90 = new Date(Date.parse(per.to) - 90 * 86_400_000).toISOString().slice(0, 10);
  const covered = new Set(visited.filter((v) => v.date > from90 && v.date <= per.to).map((v) => v.partnerId));
  const opps = d.opportunities.filter((o) => ids.has(o.partnerId) && inRange(o.createdDate, per));
  return {
    partners: partners.length,
    recs: recs.length,
    acted: dec.filter((x) => x === 'prepare' || x === 'plan_contact').length,
    deferred: dec.filter((x) => x === 'not_now' || x === 'not_relevant').length,
    pending: dec.filter((x) => !x).length,
    visits: inM.length,
    visitsPrev: visited.filter((v) => inRange(v.date, per.prev)).length,
    partnersVisited: new Set(inM.map((v) => v.partnerId)).size,
    coverage90: partners.length ? covered.size / partners.length : null,
    feedback: fb.length,
    negative: fb.filter((f) => f.sentiment === 'negative').length,
    openActions: fus.length,
    overdue: fus.filter((f) => isOverdue(f, today)).length,
    oppCount: opps.length,
    oppValue: opps.reduce((a, o) => a + (o.estimatedValue ?? 0), 0),
  };
}

export function visitsByMonth(d: Data, partners: Partner[], months: string[], today: string) {
  const ids = new Set(partners.map((p) => p.id));
  return months.map((m) => {
    const per = periodOf(m, today);
    return { month: m, value: d.visits.filter((v) => ids.has(v.partnerId) && v.status === 'visited' && inRange(v.date, per)).length };
  });
}

export function feedbackBy7P(d: Data, partners: Partner[], from: string, to: string) {
  const ids = new Set(partners.map((p) => p.id));
  const vIds = new Set(d.visits.filter((v) => ids.has(v.partnerId) && v.date >= from && v.date <= to).map((v) => v.id));
  const fb = d.feedback.filter((f) => vIds.has(f.visitId));
  return SEVEN_P.map((k) => {
    const xs = fb.filter((f) => f.category === k);
    return { key: k, total: xs.length, negative: xs.filter((f) => f.sentiment === 'negative').length, high: xs.filter((f) => f.severity === 'high').length };
  });
}

export interface Exception { kind: 'unvisited_high' | 'overdue' | 'high_negative'; text: string; sub: string; href: string }

export function exceptionsFor(d: Data, partners: Partner[], today: string): Exception[] {
  const ids = new Set(partners.map((p) => p.id));
  const name = (pid: string) => d.partners.find((p) => p.id === pid)!.name;
  const owner = (uid: string) => d.users.find((u) => u.id === uid)!.name;
  const out: Exception[] = [];
  for (const r of d.recommendations.filter((x) => x.batchMonth === CURRENT_BATCH && ids.has(x.partnerId) && x.priority !== 'low')) {
    const visited = d.visits.some((v) => v.partnerId === r.partnerId && v.status === 'visited' && v.date >= `${CURRENT_BATCH}-01`);
    const dec = decisionFor(d, r.id)?.decision;
    if (!visited && dec !== 'not_relevant') {
      out.push({ kind: 'unvisited_high', text: `${name(r.partnerId)} — ความสำคัญ${r.priority === 'high' ? 'สูง' : 'ปานกลาง'} ยังไม่ได้เข้าพบ`, sub: `ผู้ดูแล ${owner(r.marketingId)} · ${dec ? 'ตัดสินใจแล้ว แต่ยังไม่เข้าพบ' : 'ยังไม่ตัดสินใจ'}`, href: `#/recs/${r.id}` });
    }
  }
  const vById = new Map(d.visits.map((v) => [v.id, v]));
  for (const f of d.followUps) {
    const v = vById.get(f.visitId);
    if (!v || !ids.has(v.partnerId) || !isOverdue(f, today)) continue;
    out.push({ kind: 'overdue', text: `${name(v.partnerId)}: ${f.action}`, sub: `กำหนด ${fmtDate(f.dueDate)} (เกินแล้ว) · ${f.ownerName}`, href: `#/visits/${v.id}` });
  }
  for (const fb of d.feedback.filter((x) => x.severity === 'high')) {
    const v = vById.get(fb.visitId);
    if (!v || !ids.has(v.partnerId) || v.date < '2026-09-01') continue;
    const open = d.followUps.some((f) => f.visitId === v.id && f.status !== 'done');
    if (!open) continue;
    out.push({ kind: 'high_negative', text: `${name(v.partnerId)}: ${fb.detail}`, sub: `Feedback ${fb.category} ความรุนแรงสูง · ยังมีงานค้าง`, href: `#/visits/${v.id}` });
  }
  return out;
}

export function decisionReasons(d: Data, partners: Partner[], months: string[]) {
  const ids = new Set(partners.map((p) => p.id));
  const recs = d.recommendations.filter((r) => months.includes(r.batchMonth) && ids.has(r.partnerId));
  const counts = new Map<string, number>();
  for (const r of recs) {
    const x = decisionFor(d, r.id);
    if (x?.reason) counts.set(x.reason, (counts.get(x.reason) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Aggregate monthly Renewal Rate and premium by Partner type (for executive Partner signals). */
export function segmentTrend(d: Data, partners: Partner[], type: PartnerType) {
  const ps = partners.filter((p) => p.type === type);
  return d.months.map((m, i) => {
    const rows = ps.map((p) => seriesOf(d, p.id)[i]).filter((r) => r.premiumByProduct != null);
    const e = sumOrNull(rows.map((r) => r.renewalEligiblePolicies));
    const rn = sumOrNull(rows.map((r) => r.renewedPolicies));
    return {
      month: m,
      renewal: e && rn != null ? rn / e : null,
      premium: sumOrNull(rows.map(totalPremium)),
      partners: rows.length,
    };
  });
}

export const negShare = (x: { total: number; negative: number }) => (x.total ? x.negative / x.total : 0);
export const topNegative = (rows: ReturnType<typeof feedbackBy7P>): { key: SevenP; negative: number } | null =>
  [...rows].sort((a, b) => b.negative - a.negative)[0]?.negative ? [...rows].sort((a, b) => b.negative - a.negative)[0] : null;

export function canSeeUser(viewer: User, target: User) {
  if (viewer.role === 'executive') return true;
  if (viewer.role === 'manager') return target.teamId === viewer.teamId;
  return viewer.id === target.id;
}

