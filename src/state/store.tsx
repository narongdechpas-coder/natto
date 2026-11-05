// App state = immutable demo dataset + an "overlay" of user actions (persisted in localStorage).
// Reset demo = clear the overlay. Business logic stays in src/engine; this file only merges.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildDemoData, DEMO_MARKETING_USER, type DemoData } from '../data/dataset';
import { DEMO_TODAY } from '../data/config';
import type {
  Feedback, FollowUp, FollowUpStatus, Opportunity, RecommendationDecision, Visit,
} from '../domain/types';

const STORAGE_KEY = 'natto-demo-v1';

export interface Overlay {
  decisions: RecommendationDecision[];
  visits: Visit[]; // new or edited (same id overrides base)
  feedback: Feedback[];
  followUps: FollowUp[]; // new or edited
  opportunities: Opportunity[];
  talkingPoints: Record<string, string[]>; // key: recommendationId or partnerId → edited topics
}

const EMPTY: Overlay = { decisions: [], visits: [], feedback: [], followUps: [], opportunities: [], talkingPoints: {} };

export interface Session { userId: string | null }

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable: demo still works in memory */ }
}

const mergeById = <T extends { id: string }>(base: T[], over: T[]) => {
  const m = new Map(base.map((x) => [x.id, x]));
  for (const o of over) m.set(o.id, o);
  return [...m.values()];
};

export interface Store {
  base: DemoData;
  data: Omit<DemoData, 'decisions'> & { decisions: RecommendationDecision[] };
  today: string;
  session: Session;
  overlay: Overlay;
  login: (userId: string) => void;
  logout: () => void;
  decide: (d: Omit<RecommendationDecision, 'date' | 'marketingId'>) => void;
  saveVisit: (input: SaveVisitInput) => string;
  setFollowUpStatus: (id: string, status: FollowUpStatus) => void;
  setTalkingPoints: (key: string, topics: string[]) => void;
  reset: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

export interface SaveVisitInput {
  visit: Omit<Visit, 'id'> & { id?: string };
  feedback: Omit<Feedback, 'id' | 'visitId'>[];
  actions: { action: string; ownerName: string; dueDate: string; feedbackIndex: number | null }[];
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const base = useMemo(() => buildDemoData(), []);
  const [overlay, setOverlay] = useState<Overlay>(() => load(STORAGE_KEY, EMPTY));
  const [session, setSession] = useState<Session>(() => load(STORAGE_KEY + '-session', { userId: null }));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => save(STORAGE_KEY, overlay), [overlay]);
  useEffect(() => save(STORAGE_KEY + '-session', session), [session]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const data = useMemo(() => {
    const decisions = [...base.decisions.filter((d) => !overlay.decisions.some((o) => o.recommendationId === d.recommendationId)), ...overlay.decisions];
    return {
      ...base,
      decisions,
      visits: mergeById(base.visits, overlay.visits).sort((a, b) => a.date.localeCompare(b.date)),
      feedback: [...base.feedback, ...overlay.feedback],
      followUps: mergeById(base.followUps, overlay.followUps),
      opportunities: [...base.opportunities, ...overlay.opportunities],
    };
  }, [base, overlay]);

  const login = useCallback((userId: string) => setSession({ userId }), []);
  const logout = useCallback(() => setSession({ userId: null }), []);

  const decide: Store['decide'] = useCallback((d) => {
    setOverlay((o) => ({
      ...o,
      decisions: [...o.decisions.filter((x) => x.recommendationId !== d.recommendationId), {
        ...d, marketingId: session.userId ?? DEMO_MARKETING_USER, date: DEMO_TODAY,
      }],
    }));
  }, [session.userId]);

  const saveVisit: Store['saveVisit'] = useCallback((input) => {
    // IDs are generated here (not inside the state updater) so the caller gets the visit id back.
    const stamp = Date.now().toString(36);
    let n = 0;
    const nid = (p: string) => `${p}-U${stamp}${n++}`;
    const visitId = input.visit.id ?? nid('V');
    const visit: Visit = { ...input.visit, id: visitId };
    const fb: Feedback[] = input.feedback.map((f) => ({ ...f, id: nid('F'), visitId }));
    const fus: FollowUp[] = input.actions.map((a) => ({
      id: nid('A'), visitId, feedbackId: a.feedbackIndex != null ? fb[a.feedbackIndex]?.id ?? null : null,
      action: a.action, ownerName: a.ownerName, dueDate: a.dueDate, status: 'open', createdDate: visit.date, completedDate: null,
    }));
    const opps: Opportunity[] = [];
    const rec = visit.recommendationId ? base.recommendations.find((r) => r.id === visit.recommendationId) : null;
    if (visit.status === 'visited' && rec && visit.outcome !== 'not_met' && rec.opportunity.value != null) {
      opps.push({ id: nid('O'), partnerId: visit.partnerId, visitId, type: rec.opportunity.type, stage: 'identified', estimatedValue: rec.opportunity.value, createdDate: visit.date });
    }
    setOverlay((o) => ({
      ...o,
      visits: [...o.visits.filter((v) => v.id !== visitId), visit],
      feedback: [...o.feedback.filter((f) => f.visitId !== visitId), ...fb],
      followUps: [...o.followUps.filter((f) => f.visitId !== visitId), ...fus],
      opportunities: [...o.opportunities.filter((x) => x.visitId !== visitId), ...opps],
    }));
    return visitId;
  }, [base]);

  const setFollowUpStatus: Store['setFollowUpStatus'] = useCallback((id, status) => {
    setOverlay((o) => {
      const cur = mergeById(base.followUps, o.followUps).find((f) => f.id === id);
      if (!cur) return o;
      const next: FollowUp = { ...cur, status, completedDate: status === 'done' ? DEMO_TODAY : null };
      return { ...o, followUps: [...o.followUps.filter((f) => f.id !== id), next] };
    });
  }, [base]);

  const setTalkingPoints: Store['setTalkingPoints'] = useCallback((key, topics) => {
    setOverlay((o) => ({ ...o, talkingPoints: { ...o.talkingPoints, [key]: topics } }));
  }, []);

  const reset = useCallback(() => {
    setOverlay(EMPTY);
    setToast('รีเซ็ตข้อมูล demo แล้ว');
  }, []);

  const value: Store = {
    base, data, today: DEMO_TODAY, session, overlay,
    login, logout, decide, saveVisit, setFollowUpStatus, setTalkingPoints, reset,
    toast, showToast: setToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
