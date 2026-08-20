import type { MachineCalculatorSpecs } from "@/lib/quotes/center-calculator";
import { DEFAULT_PLANT_RATES, type PlantRates } from "@/lib/quotes/plant-rates";

export type MachineRateSource = {
  id: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  workCenterCode: string;
  hourlyCost: string | number | null;
  bendLengthMm?: string | number | null;
  tonnageTon?: string | number | null;
  calculatorSpecs?: MachineCalculatorSpecs | Record<string, number | null> | null;
};

function num(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function spec(machine: MachineRateSource | null, key: string) {
  if (!machine?.calculatorSpecs) return null;
  return num(machine.calculatorSpecs[key as keyof MachineCalculatorSpecs]);
}

function firstByCenter(machines: MachineRateSource[], code: string) {
  return machines.find((row) => row.workCenterCode === code) ?? null;
}

export function machineDisplayName(machine: MachineRateSource | null) {
  if (!machine) return null;
  return [machine.brand, machine.model || machine.name].filter(Boolean).join(" ");
}

/** Arma las tarifas del motor desde las fichas de máquina. Sin catálogo de planta. */
export function buildRatesFromMachines(machines: MachineRateSource[]): {
  rates: PlantRates;
  warnings: string[];
  laser: MachineRateSource | null;
  press: MachineRateSource | null;
  cam: MachineRateSource | null;
  pack: MachineRateSource | null;
} {
  const laser = firstByCenter(machines, "laser");
  const press = firstByCenter(machines, "doblado");
  const cam =
    firstByCenter(machines, "prototipado") ?? firstByCenter(machines, "cnc");
  const pack = firstByCenter(machines, "ensamble");
  const powder = machines.find((row) => spec(row, "powderCoatPerM2") != null) ?? null;

  const warnings: string[] = [];
  if (!laser) warnings.push("No hay máquina en el centro Láser.");
  else if (num(laser.hourlyCost) == null) {
    warnings.push("La máquina láser no tiene tarifa hora. Se usó un valor de referencia interno.");
  }
  if (!press) warnings.push("No hay máquina en el centro Doblado.");
  else if (num(press.hourlyCost) == null) {
    warnings.push("La dobladora no tiene tarifa hora. Se usó un valor de referencia interno.");
  }
  if (!cam) {
    warnings.push("No hay máquina en Prototipado ni CNC para CAM / ingeniería.");
  }
  if (!pack) {
    warnings.push("No hay máquina en Ensamble para empaque.");
  }

  const rates: PlantRates = {
    ...DEFAULT_PLANT_RATES,
    isPlaceholder: false,
    defaultMarginPct: DEFAULT_PLANT_RATES.defaultMarginPct,
    machineHourly: num(laser?.hourlyCost) ?? DEFAULT_PLANT_RATES.machineHourly,
    cutSpeedIpm: spec(laser, "cutSpeedIpm") ?? DEFAULT_PLANT_RATES.cutSpeedIpm,
    pierceSec: spec(laser, "pierceSec") ?? DEFAULT_PLANT_RATES.pierceSec,
    loadMin: spec(laser, "loadMin") ?? DEFAULT_PLANT_RATES.loadMin,
    unloadMin: spec(laser, "unloadMin") ?? DEFAULT_PLANT_RATES.unloadMin,
    pressHourly: num(press?.hourlyCost) ?? DEFAULT_PLANT_RATES.pressHourly,
    durmaSetupMin: spec(press, "setupMin") ?? DEFAULT_PLANT_RATES.durmaSetupMin,
    durmaSecPerHit: spec(press, "secPerHit") ?? DEFAULT_PLANT_RATES.durmaSecPerHit,
    pressBendLengthMm: num(press?.bendLengthMm) ?? DEFAULT_PLANT_RATES.pressBendLengthMm,
    pressTonnageTon: num(press?.tonnageTon) ?? DEFAULT_PLANT_RATES.pressTonnageTon,
    engineeringHours:
      spec(cam, "engineeringHours") ?? DEFAULT_PLANT_RATES.engineeringHours,
    engineeringHourly: num(cam?.hourlyCost) ?? DEFAULT_PLANT_RATES.engineeringHourly,
    packingUnit: spec(pack, "packingUnit") ?? DEFAULT_PLANT_RATES.packingUnit,
    powderCoatMin:
      spec(powder, "powderCoatMin") ?? DEFAULT_PLANT_RATES.powderCoatMin,
    powderCoatPerM2:
      spec(powder, "powderCoatPerM2") ?? DEFAULT_PLANT_RATES.powderCoatPerM2,
  };

  return { rates, warnings, laser, press, cam, pack };
}
