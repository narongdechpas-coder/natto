// Scenario-based recommendation (spec §4.4-B, M03). Template-driven, rule-based, explainable.
import type { FuelType, MonthlyPerformance, Partner, VehicleSegment } from '../domain/types';
import { PRODUCT_LABEL, fmtMillion, fmtMonth, fmtPct, fmtPp, fmtInt } from '../domain/labels';
import { RULES } from './config';
import { avgOrNull, clamp01, fuelShare, growth, renewalRate, sumOrNull, totalPremium } from './metrics';
import { computePeerStats, type EngineContext } from './signals';

export type ScenarioKey = 'renewal_push' | 'new_product' | 'ev_segment' | 'nonmotor';
export type NewProduct = 'ev_insurance' | 'hybrid_care';

export interface ScenarioInput {
  key: ScenarioKey;
  product?: NewProduct;
  partnerType?: 'all' | Partner['type'];
  minFit?: 'all' | 'medium' | 'high';
}

export interface ScenarioResult {
  partner: Partner;
  fit: number; // 0-100
  level: 'high' | 'medium' | 'low';
  reasons: string[];
  opportunityValue: number | null; // THB/year, estimate
  opportunityNote: string;
  metricValue: number | null; // scenario-specific headline metric (e.g. EV vehicles)
}

export const SCENARIOS: { key: ScenarioKey; title: string; desc: string }[] = [
  { key: 'renewal_push', title: 'ส่งเสริม Renewal', desc: 'หา Partner ที่ฐานต่ออายุใหญ่และ Renewal Rate กำลังลด' },
  { key: 'new_product', title: 'ขยายผลิตภัณฑ์ใหม่', desc: 'หา Partner ที่พอร์ตรถตรงกับกลุ่มเป้าหมายของผลิตภัณฑ์ใหม่' },
  { key: 'ev_segment', title: 'เจาะกลุ่ม EV', desc: 'หา Partner ที่มีรถ EV มากและกำลังเพิ่มขึ้น' },
  { key: 'nonmotor', title: 'เพิ่มยอดขาย Non-Motor', desc: 'หา Partner ที่ยังขาย Non-Motor น้อยกว่ากลุ่มเดียวกัน' },
];

export const NEW_PRODUCTS: { key: NewProduct; label: string; fuel: FuelType }[] = [
  { key: 'ev_insurance', label: 'ประกันรถ EV (ผลิตภัณฑ์จำลอง)', fuel: 'EV' },
  { key: 'hybrid_care', label: 'ประกันรถ Hybrid (ผลิตภัณฑ์จำลอง)', fuel: 'HYBRID' },
];

const levelOf = (fit: number): ScenarioResult['level'] => (fit >= 70 ? 'high' : fit >= 40 ? 'medium' : 'low');

export function runScenario(
  ctx: EngineContext, partners: Partner[], segments: VehicleSegment[], input: ScenarioInput,
): ScenarioResult[] {
  const t = ctx.months.length - 1;
  const m = ctx.months;
  const peers = computePeerStats(ctx, t);
  const out: ScenarioResult[] = [];
  for (const p of partners) {
    if (input.partnerType && input.partnerType !== 'all' && p.type !== input.partnerType) continue;
    const rows: MonthlyPerformance[] = ctx.series.get(p.id)!;
    let fit = 0;
    const reasons: string[] = [];
    let value: number | null = null;
    let note = '';
    let metric: number | null = null;

    if (input.key === 'renewal_push') {
      const cur = renewalRate(rows[t]), cmp = renewalRate(rows[t - 3]);
      const due3 = sumOrNull(rows.slice(t - 2).map((r) => r.renewalPremiumDue));
      if (cur == null || cmp == null || due3 == null) { reasons.push('ข้อมูลไม่ครบ คำนวณไม่ได้'); }
      else {
        const drop = (cmp - cur) * 100;
        const rank = peers.renewalDue3m.filter((x) => x <= due3).length / peers.renewalDue3m.length;
        fit = 100 * (0.6 * clamp01(drop / RULES.renewal.fullDropPp) + 0.4 * rank);
        reasons.push(`Renewal Rate ${fmtPct(cur)} (${fmtMonth(m[t])}) เทียบ ${fmtPct(cmp)} (${fmtMonth(m[t - 3])}) ${fmtPp(-drop)}`);
        reasons.push(`เบี้ยต่ออายุครบกำหนด 3 เดือนล่าสุด ${fmtMillion(due3)} มากกว่า ${Math.round(rank * 100)}% ของ Partner ทั้งหมด`);
        const base = avgOrNull([t - 5, t - 4, t - 3].map((i) => renewalRate(rows[i])));
        if (base != null && base > cur) value = (base - cur) * (due3 / 3) * 12;
        note = 'สูตรเดียวกับหน้าแนะนำ: (Renewal Rate ฐาน − ล่าสุด) × เบี้ยต่ออายุเฉลี่ยต่อเดือน × 12';
        metric = due3;
      }
    } else if (input.key === 'new_product' || input.key === 'ev_segment') {
      const fuel: FuelType = input.key === 'ev_segment' ? 'EV' : NEW_PRODUCTS.find((x) => x.key === (input.product ?? 'ev_insurance'))!.fuel;
      const share = fuelShare(rows[t], fuel), before = fuelShare(rows[t - 6], fuel);
      const vehicles = rows[t].vehiclesByFuel?.[fuel] ?? null;
      if (share == null || before == null) { reasons.push('ข้อมูลไม่ครบ คำนวณไม่ได้'); }
      else {
        const chg = (share - before) * 100;
        const fuelName = fuel === 'EV' ? 'EV' : 'Hybrid';
        if (input.key === 'ev_segment') {
          fit = 100 * (0.5 * clamp01(share / 0.2) + 0.5 * clamp01(chg / 10));
        } else {
          const segs = segments.filter((s) => s.partnerId === p.id);
          const total = segs.reduce((a, s) => a + s.count, 0);
          const young = segs.filter((s) => s.yearBand === '2024-2026').reduce((a, s) => a + s.count, 0);
          const youngShare = total ? young / total : 0;
          const qoq = growth(sumOrNull(rows.slice(t - 2).map(totalPremium)), sumOrNull(rows.slice(t - 5, t - 2).map(totalPremium)));
          fit = 100 * (0.5 * clamp01(share / 0.25) + 0.25 * clamp01((qoq ?? 0) / 0.1) + 0.25 * clamp01(youngShare / 0.5));
          reasons.push(`รถอายุ 2024–2026 คิดเป็น ${fmtPct(youngShare)} ของพอร์ต (${fmtMonth(m[t])})`);
          if (qoq != null) reasons.push(`เบี้ยประกัน 3 เดือนล่าสุด ${qoq >= 0 ? 'โต' : 'ลดลง'} ${fmtPct(Math.abs(qoq))} เทียบ 3 เดือนก่อนหน้า`);
        }
        reasons.unshift(`รถ ${fuelName} ${fmtInt(vehicles)} คัน (${fmtPct(share)} ของพอร์ต) เปลี่ยนไป ${fmtPp(chg)} ใน 6 เดือน`);
        note = 'ยังไม่ประเมินมูลค่า เพราะยังไม่มีเบี้ยเฉลี่ยต่อคันของผลิตภัณฑ์ใหม่ที่อนุมัติ';
        metric = vehicles;
      }
    } else if (input.key === 'nonmotor') {
      const w = rows.slice(t - 2);
      const tot = sumOrNull(w.map(totalPremium));
      const nm = sumOrNull(w.map((r) => r.premiumByProduct?.NONMOTOR ?? null));
      if (tot == null || nm == null) { reasons.push('ข้อมูลไม่ครบ คำนวณไม่ได้'); }
      else {
        const share = nm / tot;
        const med = peers.medianShare[p.type].NONMOTOR;
        const gapPp = (med - share) * 100;
        const sizeRank = ctx.partners.filter((x) => (sumOrNull(ctx.series.get(x.id)!.slice(t - 2).map(totalPremium)) ?? 0) <= tot).length / ctx.partners.length;
        fit = 100 * (0.7 * clamp01(gapPp / 10) + 0.3 * sizeRank);
        reasons.push(`สัดส่วน ${PRODUCT_LABEL.NONMOTOR} ${fmtPct(share)} เทียบค่ากลางกลุ่ม ${p.type} ${fmtPct(med)} (${gapPp >= 0 ? 'ต่ำกว่า' : 'สูงกว่า'} ${Math.abs(gapPp).toFixed(1)} pp)`);
        reasons.push(`เบี้ยประกันรวม 3 เดือนล่าสุด ${fmtMillion(tot)}`);
        if (gapPp > 0) value = (gapPp / 100) * (tot / 3) * 12;
        note = 'สูตร: ส่วนต่างจากค่ากลางกลุ่ม × เบี้ยเฉลี่ยต่อเดือน × 12 (สมมติเป็นยอดใหม่)';
        metric = share;
      }
    }
    const f = Math.round(fit);
    out.push({ partner: p, fit: f, level: levelOf(f), reasons, opportunityValue: value == null ? null : Math.round(value), opportunityNote: note, metricValue: metric });
  }
  const min = input.minFit === 'high' ? 70 : input.minFit === 'medium' ? 40 : 0;
  return out.filter((r) => r.fit >= min).sort((a, b) => b.fit - a.fit);
}
