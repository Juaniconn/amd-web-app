import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getTvDashboard } from "@/server/services/production-tv";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission(PERMISSION_IDS.productionView);
    const data = await getTvDashboard();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado.") {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Sin permiso.") {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }
    console.error("[tv-dashboard] Error inesperado:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
