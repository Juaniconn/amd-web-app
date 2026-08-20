import type { InspectionResult } from "@/lib/quality/catalog";

export type FinalInspectionForGate = {
  inspectedAt: Date | string;
  result: InspectionResult | string;
};

export function qualityPhysicalCloseState(finals: FinalInspectionForGate[]) {
  if (finals.length === 0) {
    return {
      blocked: false,
      hasFinal: false,
      latestResult: null as string | null,
      warning:
        "No hay inspección final registrada. El cierre físico no se bloquea, pero Calidad debe inspeccionar el número de parte.",
    };
  }

  const latest = [...finals].sort((a, b) => {
    const aTime = new Date(a.inspectedAt).getTime();
    const bTime = new Date(b.inspectedAt).getTime();
    return bTime - aTime;
  })[0];

  const blocked = latest.result === "rechazado";
  return {
    blocked,
    hasFinal: true,
    latestResult: latest.result,
    warning: blocked
      ? "La inspección final más reciente está rechazada. Cierra el NCR y registra una inspección final aprobada antes del cierre físico."
      : null,
  };
}
