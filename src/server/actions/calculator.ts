"use server";

import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";

export async function savePlantRatesAction(_input: unknown) {
  await requirePermission(PERMISSION_IDS.quotesWrite);
  return {
    ok: false as const,
    error: "Las tarifas viven en cada máquina, según su centro. Ya no hay tarifa de planta.",
  };
}
