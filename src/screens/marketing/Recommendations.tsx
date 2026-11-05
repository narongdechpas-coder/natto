import { Compass, Info, Search } from 'lucide-react';
import { useState } from 'react';
import { BATCH_MONTHS } from '../../data/config';
import type { PartnerType, Priority, SignalKey, User } from '../../domain/types';
import { SIGNAL_LABEL, fmtDate, fmtMonth } from '../../domain/labels';
import { PRIORITY_BANDS, ACTIVE_BANDS, SIGNAL_WEIGHTS } from '../../engine/config';
import { CURRENT_BATCH, partnerById, recsFor, scopePartners } from '../../state/selectors';
import { useStore } from '../../state/store';
import { Chips, MASCOT, PageHeader, Sheet, StateView } from '../../ui/common';
import { RecCard } from './shared';

type F = 'all' | Priority | 'opportunity';

export default function Recommendations({ user }: { user: User }) {
  const { data } = useStore();
  const [f, setF] = useState<F>('all');
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | PartnerType>('all');
  const [reason, setReason] = useState<'all' | SignalKey>('all');
  const [batch, setBatch] = useState(CURRENT_BATCH);
  const [how, setHow] = useState(false);
  const ids = new Set(scopePartners(data, user).map((p) => p.id));
  const all = recsFor(data, ids, batch);
  const count = (x: F) => all.filter((r) => x === 'all' || (x === 'opportunity' ? isOpp(r.primarySignal) : r.priority === x)).length;
  const list = all.filter((r) => {
    const p = partnerById(data, r.partnerId)!;
    if (f !== 'all' && (f === 'opportunity' ? !isOpp(r.primarySignal) : r.priority !== f)) return false;
    if (type !== 'all' && p.type !== type) return false;
    if (reason !== 'all' && r.primarySignal !== reason) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const asOf = all[0]?.dataAsOf;
  const bands = PRIORITY_BANDS[ACTIVE_BANDS];

  return (
    <>
      <PageHeader title="AI แนะนำคู่ค้า" backTo="/" right={<a className="icon-btn" href="#/scenario" aria-label="ค้นหาตามโจทย์ธุรกิจ"><Compass size={18} /></a>} />
      <div className="page">
        <Chips value={f} onChange={setF} items={[
          { key: 'all', label: `ทั้งหมด (${count('all')})` },
          { key: 'high', label: `สูง (${count('high')})` },
          { key: 'medium', label: `ปานกลาง (${count('medium')})` },
          { key: 'low', label: `ต่ำ (${count('low')})` },
          { key: 'opportunity', label: `เชิงโอกาส (${count('opportunity')})` },
        ]} />
        <div className="search" style={{ marginTop: 8 }}>
          <Search size={16} />
          <input className="input" placeholder="ค้นหาคู่ค้า..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาคู่ค้า" />
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="ประเภทคู่ค้า">
            <option value="all">ทุกประเภท</option><option value="Broker">Broker</option><option value="Dealer">Dealer</option><option value="Bank">Bank</option>
          </select>
          <select className="select" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} aria-label="เหตุผล">
            <option value="all">ทุกเหตุผล</option>
            {(Object.keys(SIGNAL_LABEL) as SignalKey[]).map((k) => <option key={k} value={k}>{SIGNAL_LABEL[k]}</option>)}
          </select>
          <select className="select" value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="รอบคำแนะนำ">
            {[...BATCH_MONTHS].reverse().map((m) => <option key={m} value={m}>รอบ {fmtMonth(m)}</option>)}
          </select>
        </div>

        <div className="section stack">
          {list.length ? list.map((r) => <RecCard key={r.id} r={r} />) : (
            all.length
              ? <StateView kind="empty" title="ไม่พบคู่ค้าตามเงื่อนไข" text="ลองเปลี่ยนตัวกรองหรือคำค้นหา" />
              : <StateView kind="empty" title="ยังไม่มีคำแนะนำในรอบนี้" text="ไม่มีคู่ค้าในความดูแลที่มีสัญญาณต้องพิจารณา" />
          )}
        </div>

        <div className="card row section">
          <img src={MASCOT} alt="" style={{ width: 54 }} />
          <div className="grow small">
            นัดโตะคัดเลือกจากข้อมูลรายเดือน{asOf ? ` ณ ${fmtDate(asOf)}` : ''}
            <div className="xs muted">นัดโตะแค่แนะนำ ไม่จองนัดให้อัตโนมัติ</div>
          </div>
          <button className="icon-btn" aria-label="วิธีคำนวณ" onClick={() => setHow(true)}><Info size={18} /></button>
        </div>
      </div>

      <Sheet open={how} onClose={() => setHow(false)} title="นัดโตะจัดลำดับอย่างไร">
        <p className="small" style={{ marginTop: 0 }}>คะแนนรวม 100 มาจาก 5 สัญญาณ (สมมติฐานสำหรับ demo รอ Business Owner อนุมัติ)</p>
        <table className="table">
          <tbody>
            {(Object.keys(SIGNAL_WEIGHTS) as SignalKey[]).map((k) => (
              <tr key={k}><td>{SIGNAL_LABEL[k]}</td><td className="r num">{SIGNAL_WEIGHTS[k]}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="small">ระดับความสำคัญ: สูง ≥ {bands.high} · ปานกลาง {bands.medium}–{bands.high - 1} · ต่ำ &lt; {bands.medium}</p>
        <p className="small muted">คู่ค้าจะถูกแนะนำเมื่อมีสัญญาณที่เข้าเงื่อนไขอย่างน้อย 1 ข้อ ตัวเลขทุกตัวมาจากข้อมูลรายเดือนชุดเดียวกับหน้าข้อมูลคู่ค้า</p>
        <button className="btn primary block" onClick={() => setHow(false)}>เข้าใจแล้ว</button>
      </Sheet>
    </>
  );
}

const isOpp = (k: SignalKey) => k === 'mix' || k === 'segment';
