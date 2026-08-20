import { z } from "zod";

const rateNumber = (label: string) =>
  z.coerce.number({ error: `${label} inválido` }).min(0, `${label} no puede ser negativo`);

export const plantRatesSchema = z.object({
  defaultMarginPct: z.coerce
    .number({ error: "Margen inválido" })
    .min(0, "El margen no puede ser negativo")
    .max(95, "El margen no puede ser 95% o más"),
  a36CostPerKg: rateNumber("Costo A36"),
  machineHourly: rateNumber("Hora láser"),
  pressHourly: rateNumber("Hora dobladora"),
  bendUnitCost: rateNumber("Costo por golpe"),
  powderCoatMin: rateNumber("Mínimo pintura"),
  powderCoatPerM2: rateNumber("Pintura por m²"),
  engineeringHours: rateNumber("Horas CAM"),
  engineeringHourly: rateNumber("Hora CAM"),
  packingUnit: rateNumber("Empaque"),
  cutSpeedIpm: rateNumber("Velocidad de corte"),
  pierceSec: rateNumber("Pierce"),
  loadMin: rateNumber("Carga"),
  unloadMin: rateNumber("Descarga"),
  durmaSetupMin: rateNumber("Setup Durma"),
  durmaSecPerHit: rateNumber("Segundos por golpe"),
  pressBendLengthMm: rateNumber("Largo de mesa"),
  pressTonnageTon: rateNumber("Tonelaje"),
});

export type PlantRatesInput = z.infer<typeof plantRatesSchema>;
