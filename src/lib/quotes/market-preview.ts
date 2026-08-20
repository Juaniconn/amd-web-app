import { priceQuoteItem, type QuoteItemCosting } from "@/lib/quotes/costing";
import { inferQuoteProcesses } from "@/lib/quotes/infer-processes";
import { DEFAULT_PLANT_RATES, type PlantRates } from "@/lib/quotes/plant-rates";

export type QuoteAgentExtract = {
  source_file?: string;
  part_number?: string | null;
  part_name?: string | null;
  revision?: string | null;
  material?: string | null;
  thickness_in?: number | null;
  unit_weight_lb?: number | null;
  scrap_weight_lb?: number | null;
  net_area_in2?: number | null;
  cut_length_in?: number | null;
  holes?: number | null;
  slots?: number | null;
  bends?: number | null;
  hem_count?: number | null;
  finish?: string | null;
  blank_length_in?: number | null;
  blank_width_in?: number | null;
  market_cost_per_kg?: number | null;
  notes?: string | null;
};

export type QuoteAgentPreviewItem = {
  id: string;
  sourceFile: string;
  description: string;
  documentId?: string | null;
  costing: QuoteItemCosting;
};

export type QuoteAgentPreview = {
  model: string;
  createdAt: string;
  note: string;
  rates: PlantRates;
  items: QuoteAgentPreviewItem[];
};

export function parseAgentJson(text: string): { items: QuoteAgentExtract[] } {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced?.[1]?.trim() ?? trimmed;
  const start = payload.indexOf("{");
  const end = payload.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("El agente no devolvió JSON de partidas.");
  }
  const parsed = JSON.parse(payload.slice(start, end + 1)) as {
    items?: QuoteAgentExtract[];
  };
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error("El agente no detectó partidas en los PDF.");
  }
  return { items: parsed.items };
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildPreviewCosting(
  extract: QuoteAgentExtract,
  rates: PlantRates,
  quantity = 1,
): QuoteItemCosting {
  const qty = Math.max(1, Math.floor(Number(quantity || 1)));
  const material = extract.material?.trim() || "Acero comercial (mercado)";
  const costPerKg = num(extract.market_cost_per_kg) ?? rates.a36CostPerKg;
  const processes = inferQuoteProcesses({
    cutLengthIn: num(extract.cut_length_in),
    bends: Number(extract.bends || 0),
    hemCount: Number(extract.hem_count || 0),
    finish: extract.finish,
    holes: Number(extract.holes || 0),
  });
  const costing: QuoteItemCosting = {
    quantity: qty,
    part_number: extract.part_number ?? null,
    part_name: extract.part_name ?? null,
    material,
    revision: extract.revision ?? null,
    unit_weight_lb: num(extract.unit_weight_lb),
    scrap_weight_lb: num(extract.scrap_weight_lb),
    net_area_in2: num(extract.net_area_in2),
    cut_length_in: num(extract.cut_length_in),
    holes: Number(extract.holes || 0),
    slots: Number(extract.slots || 0),
    bends: Number(extract.bends || 0),
    hem_count: Number(extract.hem_count || 0),
    thickness_in: num(extract.thickness_in),
    finish: extract.finish ?? null,
    blank_length_in: num(extract.blank_length_in),
    blank_width_in: num(extract.blank_width_in),
    cut_length_basis: "Preliminar de mercado (PDF)",
    cost_per_kg: costPerKg,
    margin_pct: rates.defaultMarginPct,
    supplier_id: null,
    supplier_name: "Mercado (preliminar)",
    material_id: null,
    material_code: null,
    processes,
    cad: null,
  };
  const breakdown = priceQuoteItem(costing, rates);
  breakdown.warnings.push(
    "Preliminar de mercado. Proveedores se asignan cuando Dirección entregue la lista.",
  );
  return {
    ...costing,
    breakdown,
    catalog: {
      materialId: null,
      materialCode: null,
      materialLabel: material,
      costPerKg,
      supplierId: null,
      supplierName: "Mercado (preliminar)",
    },
  };
}

export function scalePreviewItem(
  item: QuoteAgentPreviewItem,
  quantity: number,
  rates: PlantRates,
): QuoteAgentPreviewItem {
  const costing = buildPreviewCosting(
    {
      source_file: item.sourceFile,
      part_number: item.costing.part_number,
      part_name: item.costing.part_name,
      revision: item.costing.revision,
      material: item.costing.material,
      thickness_in: item.costing.thickness_in,
      unit_weight_lb: item.costing.unit_weight_lb,
      scrap_weight_lb: item.costing.scrap_weight_lb,
      net_area_in2: item.costing.net_area_in2,
      cut_length_in: item.costing.cut_length_in,
      holes: item.costing.holes,
      slots: item.costing.slots,
      bends: item.costing.bends,
      hem_count: item.costing.hem_count,
      finish: item.costing.finish,
      blank_length_in: item.costing.blank_length_in,
      blank_width_in: item.costing.blank_width_in,
      market_cost_per_kg: item.costing.cost_per_kg,
    },
    rates,
    quantity,
  );
  return {
    ...item,
    costing,
  };
}

export function previewGrandTotal(items: QuoteAgentPreviewItem[]) {
  return items.reduce((sum, item) => sum + Number(item.costing.breakdown?.total || 0), 0);
}

export const MARKET_PREVIEW_NOTE =
  "Preliminar de mercado. Cambia la cantidad; el total se actualiza sin volver a leer los planos.";
