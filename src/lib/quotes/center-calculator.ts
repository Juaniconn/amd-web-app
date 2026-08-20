export type CalculatorField = {
  key: string;
  label: string;
  hint?: string;
};

const TARIFF: CalculatorField = {
  key: "hourlyCost",
  label: "Tarifa hora MXN",
  hint: "Alimenta la calculadora. Obligatoria para cotizar este centro.",
};

/** Campos de calculadora según el código del centro de trabajo. */
export const CENTER_CALCULATOR_FIELDS: Record<string, CalculatorField[]> = {
  laser: [
    TARIFF,
    { key: "cutSpeedIpm", label: "Velocidad de corte ipm" },
    { key: "pierceSec", label: "Pierce s" },
    { key: "loadMin", label: "Carga min" },
    { key: "unloadMin", label: "Descarga min" },
    { key: "bedXMm", label: "Mesa X mm" },
    { key: "bedYMm", label: "Mesa Y mm" },
  ],
  doblado: [
    TARIFF,
    { key: "setupMin", label: "Setup min" },
    { key: "secPerHit", label: "Segundos por golpe" },
    { key: "bendLengthMm", label: "Mesa doblez mm" },
    { key: "tonnageTon", label: "Tonelaje t" },
  ],
  cnc: [
    TARIFF,
    { key: "setupMin", label: "Setup min" },
    { key: "engineeringHours", label: "Horas CAM / programa (lote)" },
  ],
  tornos: [TARIFF, { key: "setupMin", label: "Setup min" }],
  wire_edm: [TARIFF, { key: "setupMin", label: "Setup min" }],
  router_cnc: [TARIFF, { key: "setupMin", label: "Setup min" }],
  rectificado: [TARIFF, { key: "setupMin", label: "Setup min" }],
  soldadura: [TARIFF, { key: "setupMin", label: "Setup min" }],
  ensamble: [
    TARIFF,
    { key: "packingUnit", label: "Empaque MXN / pieza" },
  ],
  moldeo: [TARIFF, { key: "setupMin", label: "Setup min" }],
  prototipado: [
    TARIFF,
    { key: "engineeringHours", label: "Horas ingeniería / CAM lote" },
  ],
  calidad: [TARIFF],
};

export function calculatorFieldsForCenter(code: string | null | undefined): CalculatorField[] {
  if (!code) return [];
  return CENTER_CALCULATOR_FIELDS[code] ?? [TARIFF];
}

/** La columna `kind` se deriva del centro; ya no se captura a mano. */
export function machineKindFromCenterCode(
  code: string | null | undefined,
): "laser" | "press_brake" | "otro" {
  if (code === "laser") return "laser";
  if (code === "doblado") return "press_brake";
  return "otro";
}

export const MACHINE_SPEC_KEYS = [
  "cutSpeedIpm",
  "pierceSec",
  "loadMin",
  "unloadMin",
  "bedXMm",
  "bedYMm",
  "setupMin",
  "secPerHit",
  "engineeringHours",
  "packingUnit",
  "powderCoatMin",
  "powderCoatPerM2",
] as const;

export type MachineSpecKey = (typeof MACHINE_SPEC_KEYS)[number];
export type MachineCalculatorSpecs = Partial<Record<MachineSpecKey, number | null>>;
