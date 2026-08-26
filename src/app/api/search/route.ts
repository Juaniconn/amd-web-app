import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { globalSearch } from "@/server/services/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSION_IDS.dashboardRead);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const results = await globalSearch(q);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado.") {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Sin permiso.") {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }
    console.error("[search] Error inesperado:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
