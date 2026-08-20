/** Tarifas de planta para láser + doblez. Dirección las confirma en /settings/calculator. */
export const DEFAULT_PLANT_RATES = {
  isPlaceholder: true,
  defaultMarginPct: 30,
  a36CostPerKg: 38,
  machineHourly: 1200,
  pressHourly: 650,
  bendUnitCost: 18,
  powderCoatMin: 480,
  powderCoatPerM2: 165,
  engineeringHours: 1.5,
  engineeringHourly: 450,
  packingUnit: 75,
  cutSpeedIpm: 100,
  pierceSec: 1.2,
  loadMin: 1.5,
  unloadMin: 1,
  durmaSetupMin: 12,
  durmaSecPerHit: 18,
  pressBendLengthMm: 3050,
  pressTonnageTon: 220,
} as const;

export type PlantRates = {
  isPlaceholder: boolean;
  defaultMarginPct: number;
  a36CostPerKg: number;
  machineHourly: number;
  pressHourly: number;
  bendUnitCost: number;
  powderCoatMin: number;
  powderCoatPerM2: number;
  engineeringHours: number;
  engineeringHourly: number;
  packingUnit: number;
  cutSpeedIpm: number;
  pierceSec: number;
  loadMin: number;
  unloadMin: number;
  durmaSetupMin: number;
  durmaSecPerHit: number;
  pressBendLengthMm: number;
  pressTonnageTon: number;
};

export function clonePlantRates(source: PlantRates = DEFAULT_PLANT_RATES): PlantRates {
  return {
    isPlaceholder: source.isPlaceholder,
    defaultMarginPct: source.defaultMarginPct,
    a36CostPerKg: source.a36CostPerKg,
    machineHourly: source.machineHourly,
    pressHourly: source.pressHourly,
    bendUnitCost: source.bendUnitCost,
    powderCoatMin: source.powderCoatMin,
    powderCoatPerM2: source.powderCoatPerM2,
    engineeringHours: source.engineeringHours,
    engineeringHourly: source.engineeringHourly,
    packingUnit: source.packingUnit,
    cutSpeedIpm: source.cutSpeedIpm,
    pierceSec: source.pierceSec,
    loadMin: source.loadMin,
    unloadMin: source.unloadMin,
    durmaSetupMin: source.durmaSetupMin,
    durmaSecPerHit: source.durmaSecPerHit,
    pressBendLengthMm: source.pressBendLengthMm,
    pressTonnageTon: source.pressTonnageTon,
  };
}

export const PLANT_RATES: PlantRates = clonePlantRates();

export function toPlantRates(row?: Partial<Record<keyof PlantRates, unknown>> | null): PlantRates {
  const next = clonePlantRates();
  if (!row) return next;
  next.isPlaceholder = row.isPlaceholder !== false;
  next.defaultMarginPct = num(row.defaultMarginPct, next.defaultMarginPct);
  next.a36CostPerKg = num(row.a36CostPerKg, next.a36CostPerKg);
  next.machineHourly = num(row.machineHourly, next.machineHourly);
  next.pressHourly = num(row.pressHourly, next.pressHourly);
  next.bendUnitCost = num(row.bendUnitCost, next.bendUnitCost);
  next.powderCoatMin = num(row.powderCoatMin, next.powderCoatMin);
  next.powderCoatPerM2 = num(row.powderCoatPerM2, next.powderCoatPerM2);
  next.engineeringHours = num(row.engineeringHours, next.engineeringHours);
  next.engineeringHourly = num(row.engineeringHourly, next.engineeringHourly);
  next.packingUnit = num(row.packingUnit, next.packingUnit);
  next.cutSpeedIpm = num(row.cutSpeedIpm, next.cutSpeedIpm);
  next.pierceSec = num(row.pierceSec, next.pierceSec);
  next.loadMin = num(row.loadMin, next.loadMin);
  next.unloadMin = num(row.unloadMin, next.unloadMin);
  next.durmaSetupMin = num(row.durmaSetupMin, next.durmaSetupMin);
  next.durmaSecPerHit = num(row.durmaSecPerHit, next.durmaSecPerHit);
  next.pressBendLengthMm = num(row.pressBendLengthMm, next.pressBendLengthMm);
  next.pressTonnageTon = num(row.pressTonnageTon, next.pressTonnageTon);
  return next;
}

function num(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
