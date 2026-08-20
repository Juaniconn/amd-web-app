import {
  computeQuoteCosts,
  estimateBendMinutes,
  estimateCutMinutes,
  type CostBreakdown,
  type CostEngineInput,
} from "@/lib/quotes/cost-engine";
import type { QuoteCostingCatalog } from "@/lib/quotes/calculator-catalog";
import type { QuoteProcessStep } from "@/lib/quotes/infer-processes";
import { DEFAULT_PLANT_RATES, type PlantRates } from "@/lib/quotes/plant-rates";

export type QuoteItemCosting = CostEngineInput & {
  part_number?: string | null;
  part_name?: string | null;
  material?: string | null;
  revision?: string | null;
  cut_length_basis?: string | null;
  dxf_cut_length_in?: number | null;
  blank_width_in?: number | null;
  catalog?: QuoteCostingCatalog | null;
  breakdown?: CostBreakdown | null;
  material_id?: string | null;
  material_code?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
  pieces_per_stock?: number | null;
  processes?: QuoteProcessStep[] | null;
  cad?: {
    engine?: string;
    solids?: number;
    volume_mm3?: number;
    area_mm2?: number;
    bbox_mm?: { x: number; y: number; z: number };
    thickness_mm?: number | null;
    note?: string | null;
  } | null;
};

export function priceQuoteItem(
  input: CostEngineInput,
  rates: PlantRates = DEFAULT_PLANT_RATES,
): CostBreakdown {
  const cutMin =
    input.cut_min ??
    estimateCutMinutes({
      cutLengthIn: input.cut_length_in,
      holes: input.holes,
      slots: input.slots,
      speedIpm: rates.cutSpeedIpm,
      pierceSec: rates.pierceSec,
    });
  const bendMin = estimateBendMinutes({
    bends: input.bends,
    hemCount: input.hem_count,
    quantity: input.quantity,
    setupMin: rates.durmaSetupMin,
    secPerHit: rates.durmaSecPerHit,
  });
  return computeQuoteCosts(
    {
      ...input,
      cut_min: cutMin,
      load_min: input.load_min ?? rates.loadMin,
      unload_min: input.unload_min ?? rates.unloadMin,
      bend_min: bendMin,
    },
    rates,
  );
}
