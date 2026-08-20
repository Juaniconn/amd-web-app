export type QuoteProcessStep = {
  position: number;
  name: string;
  workCenterCode?: string | null;
  notes?: string | null;
};

export function inferQuoteProcesses(input: {
  cutLengthIn?: number | null;
  bends?: number;
  hemCount?: number;
  finish?: string | null;
  solids?: number | null;
  holes?: number;
}): QuoteProcessStep[] {
  const steps: QuoteProcessStep[] = [];
  const cut = Number(input.cutLengthIn || 0);
  const bends = Number(input.bends || 0) + Number(input.hemCount || 0);
  const solids = Number(input.solids || 0);
  const finish = String(input.finish || "").toLowerCase();

  if (cut > 0 || Number(input.holes || 0) > 0) {
    steps.push({
      position: steps.length + 1,
      name: "Corte láser",
      workCenterCode: "laser",
      notes: cut > 0 ? `Corte ${cut.toFixed(2)} in` : null,
    });
  }
  if (bends > 0) {
    steps.push({
      position: steps.length + 1,
      name: "Doblez",
      workCenterCode: "doblado",
      notes: `${bends} golpe(s)`,
    });
  }
  if (solids > 1) {
    steps.push({
      position: steps.length + 1,
      name: "Ensamble / soldadura",
      workCenterCode: "soldadura",
      notes: `${solids} sólidos en el CAD`,
    });
  }
  if (
    finish.includes("powder") ||
    finish.includes("electrost") ||
    finish.includes("pintura")
  ) {
    steps.push({
      position: steps.length + 1,
      name: "Acabado",
      workCenterCode: "ensamble",
      notes: input.finish ?? null,
    });
  }
  if (steps.length === 0) {
    steps.push({
      position: 1,
      name: "Fabricación",
      workCenterCode: null,
      notes: "Proceso genérico: el plano no declaró corte ni doblez.",
    });
  }
  steps.push({
    position: steps.length + 1,
    name: "Inspección",
    workCenterCode: "calidad",
    notes: "Calidad final del número de parte",
  });
  return steps;
}
