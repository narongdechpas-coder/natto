// "Calculate your own ROI" — visitors enter their organisation's numbers.
// Defaults are illustrative examples only (labelled as such); every output shows its formula.
import { useState } from 'react';

interface Field { key: keyof Inputs; label: string; unit: string; min: number; max: number; step: number }
export interface Inputs {
  staff: number; visits: number; minutes: number; savedPct: number; hourlyCost: number;
  renewalM: number; upliftPp: number; costPerYear: number;
}

export const EXAMPLE: Inputs = { staff: 10, visits: 12, minutes: 60, savedPct: 30, hourlyCost: 400, renewalM: 100, upliftPp: 0.5, costPerYear: 0 };

const FIELDS: Field[] = [
  { key: 'staff', label: 'จำนวน Marketing / ทีมขาย', unit: 'คน', min: 1, max: 200, step: 1 },
  { key: 'visits', label: 'การเข้าพบต่อคนต่อเดือน', unit: 'ครั้ง', min: 1, max: 60, step: 1 },
  { key: 'minutes', label: 'เวลาเตรียม + สรุปผลต่อการเข้าพบ (ปัจจุบัน)', unit: 'นาที', min: 10, max: 240, step: 5 },
  { key: 'savedPct', label: 'เวลาที่คาดว่าลดลงเมื่อใช้นัดโตะ', unit: '%', min: 0, max: 80, step: 5 },
  { key: 'hourlyCost', label: 'ต้นทุนต่อชั่วโมงของพนักงาน', unit: 'บาท', min: 100, max: 3000, step: 50 },
  { key: 'renewalM', label: 'เบี้ยต่ออายุที่ครบกำหนดต่อปี', unit: 'ล้านบาท', min: 0, max: 5000, step: 10 },
  { key: 'upliftPp', label: 'Renewal Rate ที่คาดว่าดีขึ้น', unit: 'pp', min: 0, max: 5, step: 0.1 },
];

export function computeRoi(i: Inputs) {
  const hoursPerMonth = (i.staff * i.visits * i.minutes * (i.savedPct / 100)) / 60;
  const fte = hoursPerMonth / (8 * 21);
  const timeValueYear = hoursPerMonth * 12 * i.hourlyCost;
  const renewalYear = i.renewalM * 1e6 * (i.upliftPp / 100);
  const roi = i.costPerYear > 0 ? (timeValueYear - i.costPerYear) / i.costPerYear : null;
  const paybackMonths = i.costPerYear > 0 && timeValueYear > 0 ? i.costPerYear / (timeValueYear / 12) : null;
  return { hoursPerMonth, fte, timeValueYear, renewalYear, roi, paybackMonths };
}

const n0 = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 0 });
const n1 = (v: number) => v.toLocaleString('th-TH', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const mb = (v: number) => `${(v / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ล้านบาท`;

export function RoiCalculator() {
  const [v, setV] = useState<Inputs>(EXAMPLE);
  const r = computeRoi(v);
  const set = (k: keyof Inputs, x: number) => setV((s) => ({ ...s, [k]: Number.isFinite(x) ? x : 0 }));
  const isExample = JSON.stringify(v) === JSON.stringify(EXAMPLE);
  return (
    <div className="roi">
      <div className="roi-in card">
        <div className="row-between"><b>ตัวเลขขององค์กรคุณ</b>{isExample ? <span className="pill">ค่าเริ่มต้น = ตัวอย่างสมมติ</span> : <button className="link" onClick={() => setV(EXAMPLE)}>คืนค่าตัวอย่าง</button>}</div>
        {FIELDS.map((f) => (
          <label key={f.key} className="roi-field">
            <span className="roi-label">{f.label}</span>
            <input type="range" min={f.min} max={f.max} step={f.step} value={v[f.key]} onChange={(e) => set(f.key, Number(e.target.value))} aria-label={f.label} />
            <span className="roi-val"><input type="number" min={f.min} max={f.max} step={f.step} value={v[f.key]} onChange={(e) => set(f.key, Number(e.target.value))} aria-label={`${f.label} (ตัวเลข)`} /> {f.unit}</span>
          </label>
        ))}
        <label className="roi-field">
          <span className="roi-label">ค่าใช้จ่ายระบบต่อปี (ถ้ามี)</span>
          <span />
          <span className="roi-val"><input type="number" min={0} step={10000} value={v.costPerYear} onChange={(e) => set('costPerYear', Number(e.target.value))} aria-label="ค่าใช้จ่ายระบบต่อปี" style={{ width: 110 }} /> บาท</span>
        </label>
      </div>
      <div className="roi-out">
        <div className="roi-kpi"><span>เวลาที่ได้คืนต่อเดือน</span><b className="num">{n0(r.hoursPerMonth)} ชม.</b><em>≈ {n1(r.fte)} คน (FTE) · = คน × ครั้ง × นาที × % ÷ 60</em></div>
        <div className="roi-kpi"><span>มูลค่าเวลาต่อปี</span><b className="num">{mb(r.timeValueYear)}</b><em>= ชั่วโมง/เดือน × 12 × ต้นทุนต่อชั่วโมง</em></div>
        <div className="roi-kpi"><span>เบี้ยต่ออายุที่รักษาไว้ได้ต่อปี</span><b className="num">{mb(r.renewalYear)}</b><em>= เบี้ยต่ออายุ × pp ที่ดีขึ้น · เป็นเบี้ยประกัน ไม่ใช่กำไร</em></div>
        <div className="roi-kpi accent">
          <span>ROI (นับเฉพาะมูลค่าเวลา)</span>
          {r.roi == null ? <b className="small-b">กรอกค่าใช้จ่ายระบบเพื่อดู ROI</b> : <b className="num">{n1(r.roi * 100)}%</b>}
          <em>{r.paybackMonths != null ? `คืนทุนใน ≈ ${n1(r.paybackMonths)} เดือน · ` : ''}= (มูลค่าเวลา − ค่าใช้จ่าย) ÷ ค่าใช้จ่าย · ไม่รวมเบี้ยต่ออายุ เพื่อให้ตัวเลขระมัดระวัง</em>
        </div>
        <p className="roi-note">ผลลัพธ์เป็นการคำนวณจากตัวเลขที่กรอก ไม่ใช่ผลลัพธ์ที่รับประกัน · % เวลาที่ลดลงและ pp ของ Renewal ควรวัดจริงใน pilot</p>
      </div>
    </div>
  );
}
