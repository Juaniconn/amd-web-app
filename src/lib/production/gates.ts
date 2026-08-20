import type { EngineeringStatus } from "@/lib/engineering/status";
import type { RfqType } from "@/lib/quotes/rfq";

export type OrderOrigin = "rfq_directa" | "rfq_ingenieria";

export type ProductionCreateGateInput = {
  origin: OrderOrigin;
  rfqType: RfqType;
  engineeringStatus: EngineeringStatus | null;
};

export function canCreateProductionOrder(
  input: ProductionCreateGateInput,
): { ok: true } | { ok: false; code: string; message: string } {
  if (input.rfqType === "diseno_solamente") {
    return {
      ok: false,
      code: "DESIGN_ONLY_NO_OP",
      message:
        "No se puede crear una orden de trabajo para una RFQ de diseño solamente.",
    };
  }

  if (input.origin === "rfq_ingenieria") {
    if (input.engineeringStatus !== "liberado") {
      return {
        ok: false,
        code: "ENGINEERING_NOT_RELEASED",
        message:
          "El número de parte con origen RFQ + Ingeniería requiere el paquete de ingeniería Liberado.",
      };
    }
  }

  return { ok: true };
}

export function assertCanCreateProductionOrder(input: ProductionCreateGateInput) {
  const result = canCreateProductionOrder(input);
  if (!result.ok) {
    const error = new Error(result.message) as Error & { code: string };
    error.code = result.code;
    throw error;
  }
}
