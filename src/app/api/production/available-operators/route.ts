import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getAvailableOperators } from "@/server/services/available-operators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSION_IDS.productionView);
    const { searchParams } = new URL(request.url);
    const workCenterId = searchParams.get("workCenterId") ?? undefined;
    const operators = await getAvailableOperators(workCenterId);
    return NextResponse.json(operators);
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado.") {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Sin permiso.") {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }
    console.error("[available-operators] Error inesperado:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
