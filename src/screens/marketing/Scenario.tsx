import { Car, ChevronRight, Layers, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DATA_AS_OF } from '../../data/config';
import type { User } from '../../domain/types';
import { fmtInt, fmtMillion } from '../../domain/labels';
import { NEW_PRODUCTS, SCENARIOS, runScenario, type NewProduct, type ScenarioInput, type ScenarioKey, type ScenarioResult } from '../../engine/scenario';
import type { EngineContext } from '../../engine/signals';
import { scopePartners } from '../../state/selectors';
import { useStore } from '../../state/store';
import { AsOf, Note, PageHeader, PartnerIcon, StateView } from '../../ui/common';

const ICON: Record<ScenarioKey, typeof Car> = { renewal_push: RotateCcw, new_product: Layers, ev_segment: Car, nonmotor: ShieldCheck };
const LEVEL = { high: { t: 'เหมาะสมสูง', c: 'high' }, medium: { t: 'เหมาะสมปานกลาง', c: 'medium' }, low: { t: 'เหมาะสมต่ำ', c: 'low' } } as const;

export default function Scenario({ user }: { user: User }) {
  const { data } = useStore();
  const [input, setInput] = useState<ScenarioInput>({ key: 'new_product', product: 'ev_insurance', partnerType: 'all', minFit: 'medium' });
  const [ran, setRan] = useState<ScenarioInput | null>(null);
  const [scope, setScope] = useState<'mine' | 'team'>('mine');
  const partners = useMemo(() => {
    if (scope === 'mine') return scopePartners(data, user);
    const team = data.users.filter((u) => u.teamId === user.teamId).map((u) => u.id);
    return data.partners.filter((p) => team.includes(p.ownerId));
  }, [scope, data, user]);
  const results: ScenarioResult[] = useMemo(() => {
    if (!ran) return [];
    const ctx: EngineContext = { partners: data.partners, series: data.series, months: data.months, visits: data.visits, followUps: data.followUps };
    return runScenario(ctx, partners, data.vehicleSegments, ran);
  }, [ran, partners, data]);
  const total = results.reduce((a, r) => a + (r.opportunityValue ?? 0), 0);
  const withValue = results.filter((r) => r.opportunityValue != null).length;
  const set = (patch: Partial<ScenarioInput>) => setInput((s) => ({ ...s, ...patch }));
  const meta = SCENARIOS.find((s) => s.key === input.key)!;

  return (
    <>
      <PageHeader title="ค้นหาตามโจทย์ธุรกิจ" backTo="/recs" />
      <div className="page">
        <h2 style={{ fontSize: 16, color: 'var(--navy)' }}>ต้องการค้นหาคู่ค้าเพื่ออะไร</h2>
        <div className="kpi-grid" style={{ marginTop: 8 }}>
          {SCENARIOS.map((s) => {
            const I = ICON[s.key];
            const on = input.key === s.key;
            return (
              <button key={s.key} className="kpi" aria-pressed={on} onClick={() => set({ key: s.key })}
                style={on ? { boxShadow: 'inset 0 0 0 2px var(--cobalt)', background: 'var(--cobalt-soft)' } : undefined}>
                <I size={22} /><span className="l" style={{ fontWeight: 600 }}>{s.title}</span>
              </button>
            );
          })}
        </div>
        <p className="small muted">{meta.desc}</p>

        <div className="card">
          {input.key === 'new_product' && (
            <div className="field"><label htmlFor="prod">ผลิตภัณฑ์</label>
              <select id="prod" className="select" value={input.product} onChange={(e) => set({ product: e.target.value as NewProduct })}>
                {NEW_PRODUCTS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
          )}
          <div className="row">
            <div className="field grow"><label htmlFor="ptype">ประเภทคู่ค้า</label>
              <select id="ptype" className="select" value={input.partnerType} onChange={(e) => set({ partnerType: e.target.value as ScenarioInput['partnerType'] })}>
                <option value="all">ทั้งหมด</option><option value="Broker">Broker</option><option value="Dealer">Dealer</option><option value="Bank">Bank</option>
              </select>
            </div>
            <div className="field grow"><label htmlFor="fit">ความเหมาะสมขั้นต่ำ</label>
              <select id="fit" className="select" value={input.minFit} onChange={(e) => set({ minFit: e.target.value as ScenarioInput['minFit'] })}>
                <option value="all">แสดงทั้งหมด</option><option value="medium">ปานกลางขึ้นไป</option><option value="high">สูงเท่านั้น</option>
              </select>
            </div>
          </div>
          {user.teamId && (
            <div className="field"><label htmlFor="scope">ขอบเขต</label>
              <select id="scope" className="select" value={scope} onChange={(e) => setScope(e.target.value as 'mine' | 'team')}>
                <option value="mine">คู่ค้าที่ฉันดูแล</option><option value="team">คู่ค้าทั้งทีม (เพื่อดูภาพรวม)</option>
              </select>
            </div>
          )}
          <button className="btn primary block" onClick={() => setRan({ ...input })}><Search size={18} /> วิเคราะห์คู่ค้า</button>
        </div>

        {ran && (
          <div className="section">
            <div className="section-title"><h2>ผลการวิเคราะห์ ({results.length} ราย)</h2></div>
            {results.length > 0 && (
              <div className="kpi-grid three" style={{ marginBottom: 10 }}>
                <div className="kpi"><span className="v num">{results.length}</span><span className="l">คู่ค้าที่เกี่ยวข้อง</span></div>
                <div className="kpi"><span className="v num">{withValue ? `≈${(total / 1e6).toFixed(1)}` : '—'}</span><span className="l">{withValue ? 'มูลค่าโอกาสรวม (ลบ./ปี)' : 'ยังประเมินมูลค่าไม่ได้'}</span></div>
                <div className="kpi"><span className="v num">{results.filter((r) => r.level === 'high').length}</span><span className="l">เหมาะสมสูง</span></div>
              </div>
            )}
            {results.length ? results.map((r, i) => (
              <a key={r.partner.id} className="card p-card" href={`#/partner/${r.partner.id}`}>
                <PartnerIcon type={r.partner.type} />
                <div className="grow">
                  <div className="row between"><span className="p-name">{i + 1}. {r.partner.name}</span><span className={`badge ${LEVEL[r.level].c}`}>{LEVEL[r.level].t}</span></div>
                  <ul className="small" style={{ margin: '4px 0', paddingLeft: 18 }}>{r.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
                  <div className="xs muted">
                    ความเหมาะสม {r.fit}/100 · {r.opportunityValue != null ? `โอกาส ≈ ${fmtMillion(r.opportunityValue)}/ปี (ประมาณการ)` : r.opportunityNote}
                  </div>
                </div>
                <ChevronRight size={18} className="muted" />
              </a>
            )) : <StateView kind="empty" title="ไม่พบคู่ค้าที่เข้าเงื่อนไข" text="ลองลดความเหมาะสมขั้นต่ำ หรือขยายขอบเขตเป็นทั้งทีม" />}
            {withValue > 0 && <div className="section"><Note>{results.find((r) => r.opportunityValue != null)?.opportunityNote} มูลค่าเป็นประมาณการ ไม่ใช่รายได้จริง</Note></div>}
            {ran.key !== 'renewal_push' && ran.key !== 'nonmotor' && (
              <div className="section xs muted">รถในพอร์ตรวม {fmtInt(results.reduce((a, r) => a + (r.metricValue ?? 0), 0))} คันในกลุ่มเป้าหมาย · ใช้จำนวนคัน (รอยืนยันว่าจะนับคันหรือถ่วงตามเบี้ย)</div>
            )}
            <div className="section"><AsOf date={DATA_AS_OF} /></div>
          </div>
        )}
      </div>
    </>
  );
}
