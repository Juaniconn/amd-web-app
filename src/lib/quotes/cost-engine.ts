import { DEFAULT_PLANT_RATES, type PlantRates } from "@/lib/quotes/plant-rates";

const LB_PER_KG = 2.2046226218;
const IN2_PER_M2 = 1550.0031;

export type CostEngineInput = {
  quantity: number;
  unit_weight_lb?: number | null;
  scrap_weight_lb?: number | null;
  net_area_in2?: number | null;
  cut_length_in?: number | null;
  holes?: number;
  slots?: number;
  bends?: number;
  hem_count?: number;
  cut_min?: number | null;
  load_min?: number | null;
  unload_min?: number | null;
  bend_min?: number | null;
  finish?: string | null;
  finish_cost?: number;
  margin_pct?: number | null;
  thickness_in?: number | null;
  blank_length_in?: number | null;
  cost_per_kg?: number | null;
};

export type CostBreakdown = {
  quantity: number;
  billed_weight_lb: number | null;
  billed_weight_kg: number | null;
  material_cost: number;
  cut_cost: number;
  bend_cost: number;
  finish_cost: number;
  engineering_cost: number;
  packing_cost: number;
  subtotal_cost: number;
  margin_pct: number;
  profit: number;
  total: number;
  unit_price: number;
  laser_min_each: number;
  bend_hits: number;
  bend_min_total: number;
  press_hourly: number;
  finish_kind: "electrostatic_powder" | null;
  finish_label: string;
  coated_area_m2: number;
  warnings: string[];
};

export function kgFromLb(lb: number | null | undefined) {
  if (lb == null) return null;
  return lb / LB_PER_KG;
}

export function areaM2FromIn2(in2: number | null | undefined) {
  if (in2 == null) return null;
  return in2 / IN2_PER_M2;
}

export function estimateCutMinutes(input: {
  cutLengthIn: number | null | undefined;
  holes?: number;
  slots?: number;
  speedIpm?: number;
  pierceSec?: number;
}) {
  if (input.cutLengthIn == null || !input.speedIpm) return null;
  const pierces = 1 + Number(input.holes || 0) + Number(input.slots || 0);
  const cutMin = input.cutLengthIn / input.speedIpm;
  const pierceMin = (pierces * (input.pierceSec ?? DEFAULT_PLANT_RATES.pierceSec)) / 60;
  return round4(cutMin + pierceMin + 0.35);
}

export function estimateBendMinutes(input: {
  bends?: number;
  hemCount?: number;
  quantity?: number;
  setupMin?: number;
  secPerHit?: number;
}) {
  const hits = Number(input.bends || 0) + Number(input.hemCount || 0);
  if (!hits) return 0;
  const setupMin = input.setupMin ?? DEFAULT_PLANT_RATES.durmaSetupMin;
  const secPerHit = input.secPerHit ?? DEFAULT_PLANT_RATES.durmaSecPerHit;
  const quantity = Math.max(1, Number(input.quantity || 1));
  const first = setupMin + (hits * secPerHit) / 60;
  if (quantity <= 1) return round4(first);
  return round4(first + ((quantity - 1) * hits * secPerHit) / 60);
}

export function isElectrostaticFinish(finish: string | null | undefined) {
  const s = String(finish || "").toLowerCase();
  return (
    s.includes("powder") ||
    s.includes("electrost") ||
    s.includes("pintura en polvo") ||
    s.includes("pintura electrost")
  );
}

export function computeQuoteCosts(
  input: CostEngineInput,
  rates: PlantRates = DEFAULT_PLANT_RATES,
): CostBreakdown {
  const qty = Math.max(1, Number(input.quantity || 1));
  const marginPct = Number(input.margin_pct ?? rates.defaultMarginPct);
  const weightLb = input.unit_weight_lb != null ? Number(input.unit_weight_lb) : null;
  const scrapLb = input.scrap_weight_lb != null ? Number(input.scrap_weight_lb) : null;
  const billedLb = weightLb == null ? null : weightLb + (scrapLb || 0);
  const billedKg = billedLb == null ? null : kgFromLb(billedLb);

  const kgCost = Number(input.cost_per_kg ?? rates.a36CostPerKg) || 0;
  const materialCostEach =
    billedKg != null ? billedKg * kgCost : 0;

  const cutMinEach = Number(input.cut_min || 0);
  const loadMinEach = Number(input.load_min ?? rates.loadMin);
  const unloadMinEach = Number(input.unload_min ?? rates.unloadMin);
  const laserMinEach = cutMinEach + loadMinEach + unloadMinEach;
  const cutCostEach = (laserMinEach / 60) * Number(rates.machineHourly || 0);

  const bendHits = Number(input.bends || 0) + Number(input.hem_count || 0);
  const bendMinTotal = Number(input.bend_min || 0);
  const pressHourly = Number(rates.pressHourly || 0);
  const bendFromTime = (bendMinTotal / 60) * pressHourly;
  const bendFromHits = bendHits * Number(rates.bendUnitCost || 0) * qty;
  const bend_cost = round2(pressHourly ? bendFromTime : bendFromHits);

  const areaM2 = areaM2FromIn2(input.net_area_in2);
  const bothSides = areaM2 == null ? 0 : areaM2 * 2;
  const powder = Math.max(
    Number(rates.powderCoatMin || 0),
    bothSides * Number(rates.powderCoatPerM2 || 0),
  );
  const electrostatic = isElectrostaticFinish(input.finish);
  const finishCostEach = electrostatic ? powder : Number(input.finish_cost || 0);

  const engineeringLot =
    Number(rates.engineeringHours || 0) * Number(rates.engineeringHourly || 0);
  const packingEach = Number(rates.packingUnit || 0);

  const material_cost = round2(materialCostEach * qty);
  const cut_cost = round2(cutCostEach * qty);
  const finish_cost = round2(finishCostEach * qty);
  const engineering_cost = round2(engineeringLot);
  const packing_cost = round2(packingEach * qty);
  const subtotal_cost = round2(
    material_cost + cut_cost + bend_cost + finish_cost + engineering_cost + packing_cost,
  );

  const margin = Math.min(95, Math.max(0, marginPct));
  const total = margin >= 100 ? subtotal_cost : round2(subtotal_cost / (1 - margin / 100));
  const profit = round2(total - subtotal_cost);
  const unit_price = round2(total / qty);

  const warnings: string[] = [];
  if (rates.isPlaceholder) {
    warnings.push("Faltan tarifas de máquina. Revisa la ficha de cada centro.");
  }
  if (input.blank_length_in != null) {
    const lengthMm = input.blank_length_in * 25.4;
    if (lengthMm > rates.pressBendLengthMm) {
      warnings.push(
        `Largo de doblez ${lengthMm.toFixed(0)} mm excede mesa ${rates.pressBendLengthMm} mm`,
      );
    }
  }

  return {
    quantity: qty,
    billed_weight_lb: billedLb,
    billed_weight_kg: billedKg == null ? null : round4(billedKg),
    material_cost,
    cut_cost,
    bend_cost,
    finish_cost,
    engineering_cost,
    packing_cost,
    subtotal_cost,
    margin_pct: margin,
    profit,
    total,
    unit_price,
    laser_min_each: round4(laserMinEach),
    bend_hits: bendHits,
    bend_min_total: bendMinTotal,
    press_hourly: pressHourly,
    finish_kind: electrostatic ? "electrostatic_powder" : null,
    finish_label: electrostatic ? "Pintura electrostática" : "Acabado",
    coated_area_m2: round4(bothSides),
    warnings,
  };
}

function round2(n: number) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function round4(n: number) {
  return Math.round((Number(n) + Number.EPSILON) * 10000) / 10000;
}
