import type {
  FuelType,
  MonthlyPerformance,
  Partner,
  PartnerType,
  ProductCategory,
  VehicleSegment,
} from '../domain/types';
import { FUEL_TYPES, PRODUCT_CATEGORIES } from '../domain/types';
import { DATA_MONTHS, LATEST_DATA_MONTH, SEED } from './config';
import { REGIONS_BY_TEAM, USERS } from './org';
import { HERO_PROFILES, fuel, mix, type PartnerProfile } from './profiles';
import { between, hashString, jitter, mulberry32, pick, type Rng } from './random';

const BACKGROUND_OWNERS: Record<string, number> = {
  'U-MKT1': 2, 'U-MKT2': 5, 'U-MKT3': 6, 'U-MKT4': 6, 'U-MKT5': 6, 'U-MKT6': 5,
};

const TYPE_TEMPLATE: Record<PartnerType, { base: [number, number]; mix: Record<ProductCategory, number>; eligibleRate: number; renewal: [number, number] }> = {
  Broker: { base: [700_000, 2_600_000], mix: mix(47, 24, 10, 14, 5), eligibleRate: 0.055, renewal: [0.74, 0.82] },
  Dealer: { base: [500_000, 1_800_000], mix: mix(58, 14, 5, 21, 2), eligibleRate: 0.05, renewal: [0.64, 0.74] },
  Bank: { base: [900_000, 2_800_000], mix: mix(60, 13, 5, 11, 11), eligibleRate: 0.05, renewal: [0.76, 0.84] },
};

/** Background partners: 30 synthetic partners with mild, randomly drawn behaviour. */
function buildBackgroundProfiles(rng: Rng): PartnerProfile[] {
  const out: PartnerProfile[] = [];
  let n = 13;
  for (const [ownerId, count] of Object.entries(BACKGROUND_OWNERS)) {
    const owner = USERS.find((u) => u.id === ownerId)!;
    for (let i = 0; i < count; i++, n++) {
      const type = pick(rng, ['Broker', 'Dealer', 'Bank'] as const);
      const t = TYPE_TEMPLATE[type];
      const base = Math.round(between(rng, t.base[0], t.base[1]) / 10_000) * 10_000;
      const trend = between(rng, -0.012, 0.022);
      // ~1 in 6 gets a late shock (sales drop or renewal drop) so the list is not all-quiet.
      const shock = rng();
      const premiumMult = Array.from({ length: 12 }, (_, m) => {
        let v = 1 + trend * m;
        if (shock < 0.1 && m >= 9) v *= 1 - 0.05 * (m - 8);
        return v;
      });
      const r0 = between(rng, t.renewal[0], t.renewal[1]);
      const renewalRate = Array.from({ length: 12 }, (_, m) => {
        let v = r0 + jitter(rng) * 0.008;
        if (shock >= 0.1 && shock < 0.18 && m >= 8) v -= 0.025 * (m - 7);
        return Math.round(v * 1000) / 1000;
      });
      const mixStart = { ...t.mix };
      for (const k of PRODUCT_CATEGORIES) mixStart[k] = Math.max(0.5, mixStart[k] + jitter(rng) * mixStart[k] * 0.35);
      const mixEnd = { ...mixStart };
      const evStart = between(rng, 2, 9);
      const evEnd = evStart + between(rng, 0, 5);
      const hyb = between(rng, 7, 16);
      out.push({
        id: `P${String(n).padStart(3, '0')}`,
        name: `${type} ${n}`,
        type,
        region: pick(rng, REGIONS_BY_TEAM[owner.teamId!]),
        ownerId,
        isHero: false,
        storyTag: shock < 0.1 ? 'bg: late sales drop' : shock < 0.18 ? 'bg: renewal drop' : null,
        basePremium: base,
        premiumMult,
        mixStart, mixEnd, mixShiftFrom: 6,
        renewalRate,
        renewalEligible: Math.round((base * t.eligibleRate) / 1000) * 1 + 20,
        avgRenewalPremium: Math.round(between(rng, 11_000, 16_000) / 100) * 100,
        vehicles: Math.round(base / 800),
        fuelStart: fuel(100 - hyb - evStart, hyb, evStart),
        fuelEnd: fuel(100 - hyb - evEnd, hyb, evEnd),
        fuelShiftFrom: 3,
        makeProfile: type === 'Bank' ? pick(rng, ['mass', 'premium'] as const) : pick(rng, ['mass', 'pickup'] as const),
        missingMonths: [],
      });
    }
  }
  return out;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function blend<K extends string>(start: Record<K, number>, end: Record<K, number>, from: number, m: number): Record<K, number> {
  const t = m <= from ? 0 : (m - from) / (11 - from);
  const out = {} as Record<K, number>;
  let sum = 0;
  for (const k of Object.keys(start) as K[]) {
    out[k] = lerp(start[k], end[k], t);
    sum += out[k];
  }
  for (const k of Object.keys(out) as K[]) out[k] /= sum;
  return out;
}

function buildMonthly(p: PartnerProfile): MonthlyPerformance[] {
  const rng = mulberry32(hashString(p.id) ^ SEED);
  const noise = p.isHero ? 0.008 : 0.025;
  return DATA_MONTHS.map((month, m) => {
    if (p.missingMonths.includes(m)) {
      return {
        partnerId: p.id, month,
        premiumByProduct: null, renewalEligiblePolicies: null, renewedPolicies: null,
        renewalPremiumDue: null, vehiclesByFuel: null,
      };
    }
    const total = p.basePremium * p.premiumMult[m] * (1 + jitter(rng) * noise);
    const shares = blend(p.mixStart, p.mixEnd, p.mixShiftFrom, m);
    const premiumByProduct = {} as Record<ProductCategory, number>;
    for (const k of PRODUCT_CATEGORIES) premiumByProduct[k] = Math.round((total * shares[k]) / 100) * 100;
    const eligible = Math.round(p.renewalEligible * (1 + jitter(rng) * 0.06));
    const renewed = Math.round(eligible * p.renewalRate[m]);
    const renewalPremiumDue = Math.round((eligible * p.avgRenewalPremium * (1 + jitter(rng) * 0.03)) / 100) * 100;
    const growth = p.premiumMult[m] / p.premiumMult[0];
    const vehTotal = Math.round(p.vehicles * (0.97 + 0.03 * growth));
    const f = blend(p.fuelStart, p.fuelEnd, p.fuelShiftFrom, m);
    const vehiclesByFuel = {} as Record<FuelType, number>;
    for (const k of FUEL_TYPES) vehiclesByFuel[k] = Math.round(vehTotal * f[k]);
    return {
      partnerId: p.id, month,
      premiumByProduct, renewalEligiblePolicies: eligible, renewedPolicies: renewed,
      renewalPremiumDue, vehiclesByFuel,
    };
  });
}

// ---- Vehicle detail (latest month) ----
interface ModelDef { make: string; model: string; fuel: FuelType; cc: string }
const MODEL_LIBRARY: Record<PartnerProfile['makeProfile'], ModelDef[]> = {
  mass: [
    { make: 'Toyota', model: 'Yaris Ativ', fuel: 'ICE', cc: '1,201-1,500' },
    { make: 'Toyota', model: 'Corolla Cross', fuel: 'HYBRID', cc: '1,501-1,800' },
    { make: 'Honda', model: 'City', fuel: 'ICE', cc: '≤1,200' },
    { make: 'Honda', model: 'HR-V', fuel: 'HYBRID', cc: '1,501-1,800' },
    { make: 'Mazda', model: 'CX-5', fuel: 'ICE', cc: '2,001-2,500' },
    { make: 'Isuzu', model: 'D-Max', fuel: 'ICE', cc: '>2,500' },
    { make: 'BYD', model: 'Atto 3', fuel: 'EV', cc: 'EV' },
    { make: 'MG', model: 'MG4', fuel: 'EV', cc: 'EV' },
  ],
  pickup: [
    { make: 'Isuzu', model: 'D-Max', fuel: 'ICE', cc: '>2,500' },
    { make: 'Toyota', model: 'Hilux Revo', fuel: 'ICE', cc: '2,001-2,500' },
    { make: 'Ford', model: 'Ranger', fuel: 'ICE', cc: '2,001-2,500' },
    { make: 'Toyota', model: 'Yaris Cross', fuel: 'HYBRID', cc: '1,201-1,500' },
    { make: 'Honda', model: 'City', fuel: 'ICE', cc: '≤1,200' },
    { make: 'BYD', model: 'Dolphin', fuel: 'EV', cc: 'EV' },
  ],
  ev_brand: [
    { make: 'BYD', model: 'Atto 3', fuel: 'EV', cc: 'EV' },
    { make: 'BYD', model: 'Seal', fuel: 'EV', cc: 'EV' },
    { make: 'BYD', model: 'Sealion 6', fuel: 'HYBRID', cc: '1,501-1,800' },
    { make: 'Toyota', model: 'Yaris Ativ', fuel: 'ICE', cc: '1,201-1,500' },
    { make: 'Honda', model: 'City', fuel: 'ICE', cc: '≤1,200' },
    { make: 'Isuzu', model: 'D-Max', fuel: 'ICE', cc: '>2,500' },
  ],
  premium: [
    { make: 'Mercedes-Benz', model: 'C-Class', fuel: 'HYBRID', cc: '1,501-2,000' },
    { make: 'BMW', model: '3 Series', fuel: 'ICE', cc: '1,501-2,000' },
    { make: 'Toyota', model: 'Camry', fuel: 'HYBRID', cc: '2,001-2,500' },
    { make: 'Honda', model: 'Accord', fuel: 'HYBRID', cc: '1,501-2,000' },
    { make: 'Volvo', model: 'EX30', fuel: 'EV', cc: 'EV' },
    { make: 'Toyota', model: 'Fortuner', fuel: 'ICE', cc: '>2,500' },
  ],
};
const YEAR_BANDS = ['2024-2026', '2021-2023', '≤2020'] as const;

function buildVehicleSegments(p: PartnerProfile, latest: MonthlyPerformance): VehicleSegment[] {
  if (!latest.vehiclesByFuel) return [];
  const rng = mulberry32(hashString(p.id + 'veh') ^ SEED);
  const lib = MODEL_LIBRARY[p.makeProfile];
  const out: VehicleSegment[] = [];
  for (const f of FUEL_TYPES) {
    const models = lib.filter((d) => d.fuel === f);
    const total = latest.vehiclesByFuel[f];
    if (!models.length || total === 0) continue;
    const weights = models.map(() => 0.5 + rng());
    const wSum = weights.reduce((a, b) => a + b, 0);
    let remaining = total;
    models.forEach((d, i) => {
      const modelTotal = i === models.length - 1 ? remaining : Math.round((total * weights[i]) / wSum);
      remaining -= modelTotal;
      // EV skews newer
      const ys = f === 'EV' ? [0.75, 0.25, 0] : f === 'HYBRID' ? [0.45, 0.4, 0.15] : [0.25, 0.4, 0.35];
      let left = modelTotal;
      YEAR_BANDS.forEach((yb, j) => {
        const c = j === YEAR_BANDS.length - 1 ? left : Math.round(modelTotal * ys[j]);
        left -= c;
        if (c > 0) out.push({ partnerId: p.id, month: latest.month, make: d.make, model: d.model, yearBand: yb, ccBand: d.cc, fuel: f, count: c });
      });
    });
  }
  return out;
}

export interface DemoDataset {
  partners: Partner[];
  monthly: MonthlyPerformance[];
  vehicleSegments: VehicleSegment[];
  profiles: PartnerProfile[];
}

export function generateDataset(): DemoDataset {
  const rng = mulberry32(SEED);
  const profiles = [...HERO_PROFILES, ...buildBackgroundProfiles(rng)];
  const partners: Partner[] = profiles.map((p) => ({
    id: p.id, name: p.name, type: p.type, region: p.region, ownerId: p.ownerId,
    isHero: p.isHero, storyTag: p.storyTag, mainLine: 'Motor',
  }));
  const monthly: MonthlyPerformance[] = [];
  const vehicleSegments: VehicleSegment[] = [];
  for (const p of profiles) {
    const rows = buildMonthly(p);
    monthly.push(...rows);
    const latest = rows.find((r) => r.month === LATEST_DATA_MONTH)!;
    vehicleSegments.push(...buildVehicleSegments(p, latest));
  }
  return { partners, monthly, vehicleSegments, profiles };
}
