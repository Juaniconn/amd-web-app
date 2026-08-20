import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { machines, supplierMaterials, suppliers, workCenters } from "@/db/schema";
import { matchSheetMaterial } from "@/lib/quotes/match-material";
import { priceQuoteItem, type QuoteItemCosting } from "@/lib/quotes/costing";
import { DEFAULT_PLANT_RATES } from "@/lib/quotes/plant-rates";
import {
  buildRatesFromMachines,
  machineDisplayName,
  type MachineRateSource,
} from "@/lib/quotes/rates-from-machines";
import type { QuoteCostingCatalog } from "@/lib/quotes/calculator-catalog";
import type { MachineCalculatorSpecs } from "@/lib/quotes/center-calculator";

function num(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function listCalculatorMaterials() {
  return db
    .select({
      id: supplierMaterials.id,
      code: supplierMaterials.id,
      description: supplierMaterials.description,
      grade: supplierMaterials.grade,
      thicknessIn: supplierMaterials.thicknessIn,
      costPerKg: supplierMaterials.costPerKg,
      sheetWidthIn: supplierMaterials.sheetWidthIn,
      sheetLengthIn: supplierMaterials.sheetLengthIn,
      densityGCm3: supplierMaterials.densityGCm3,
      unit: supplierMaterials.unit,
      supplierId: supplierMaterials.supplierId,
      supplierName: suppliers.legalName,
    })
    .from(supplierMaterials)
    .innerJoin(suppliers, eq(suppliers.id, supplierMaterials.supplierId))
    .where(and(eq(supplierMaterials.active, true), isNull(suppliers.deletedAt)))
    .orderBy(asc(suppliers.legalName), asc(supplierMaterials.position));
}

export async function listCalculatorMachines() {
  return db
    .select({
      id: machines.id,
      name: machines.name,
      brand: machines.brand,
      model: machines.model,
      hourlyCost: machines.hourlyCost,
      bendLengthMm: machines.bendLengthMm,
      tonnageTon: machines.tonnageTon,
      calculatorSpecs: machines.calculatorSpecs,
      workCenterName: workCenters.name,
      workCenterCode: workCenters.code,
    })
    .from(machines)
    .innerJoin(workCenters, eq(machines.workCenterId, workCenters.id))
    .where(eq(machines.active, true))
    .orderBy(asc(workCenters.sortOrder), asc(machines.name));
}

export async function listCalculatorSuppliers() {
  const rows = await db
    .select({
      id: suppliers.id,
      code: suppliers.code,
      legalName: suppliers.legalName,
      phone: suppliers.phone,
      city: suppliers.city,
    })
    .from(suppliers)
    .innerJoin(supplierMaterials, eq(supplierMaterials.supplierId, suppliers.id))
    .where(and(isNull(suppliers.deletedAt), eq(supplierMaterials.active, true)))
    .orderBy(asc(suppliers.legalName));
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export async function priceQuoteItemFromErp(input: QuoteItemCosting) {
  const sheetMaterials = (await listCalculatorMaterials()).map((row) => ({
    id: row.id,
    code: row.code,
    description: row.description,
    grade: row.grade,
    thicknessIn: num(row.thicknessIn),
    costPerKg: num(row.costPerKg),
    supplierId: row.supplierId,
    supplierName: row.supplierName,
  }));
  const machinesForCost = await listCalculatorMachines();
  const sources: MachineRateSource[] = machinesForCost.map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    model: row.model,
    workCenterCode: row.workCenterCode,
    hourlyCost: row.hourlyCost,
    bendLengthMm: row.bendLengthMm,
    tonnageTon: row.tonnageTon,
    calculatorSpecs: (row.calculatorSpecs ?? null) as MachineCalculatorSpecs | null,
  }));
  const built = buildRatesFromMachines(sources);
  const material = matchSheetMaterial(input.material, input.thickness_in, sheetMaterials);

  const resolved = {
    ...built.rates,
    a36CostPerKg: material?.costPerKg ?? built.rates.a36CostPerKg,
    defaultMarginPct: input.margin_pct ?? DEFAULT_PLANT_RATES.defaultMarginPct,
  };

  const costingInput = {
    ...input,
    cost_per_kg: material?.costPerKg ?? resolved.a36CostPerKg,
    margin_pct: input.margin_pct ?? DEFAULT_PLANT_RATES.defaultMarginPct,
  };
  const breakdown = priceQuoteItem(costingInput, resolved);
  breakdown.warnings.push(...built.warnings);

  if (!material) {
    breakdown.warnings.push(
      "No hay partida de material del proveedor que coincida. Revisa grado y espesor en Proveedores.",
    );
  }

  const catalog: QuoteCostingCatalog = {
    materialId: material?.id ?? null,
    materialCode: material?.code ?? null,
    materialLabel: material
      ? `${material.grade ?? material.description}${material.thicknessIn ? ` ${material.thicknessIn} in` : ""}`
      : null,
    costPerKg: material?.costPerKg ?? resolved.a36CostPerKg,
    supplierId: material?.supplierId ?? null,
    supplierName: material?.supplierName ?? null,
    laserMachineId: built.laser?.id ?? null,
    laserName: machineDisplayName(built.laser),
    laserHourly: num(built.laser?.hourlyCost) ?? resolved.machineHourly,
    pressBrakeId: built.press?.id ?? null,
    pressName: machineDisplayName(built.press),
    pressHourly: num(built.press?.hourlyCost) ?? resolved.pressHourly,
  };

  return {
    costing: {
      ...costingInput,
      cut_min: breakdown.laser_min_each,
      bend_min: breakdown.bend_min_total,
      catalog,
      breakdown,
    } satisfies QuoteItemCosting,
    rates: resolved,
  };
}
