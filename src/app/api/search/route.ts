import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { globalSearch } from "@/server/services/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requirePermission(PERMISSION_IDS.productionView);
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const results = await globalSearch(q);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: "Error en la búsqueda" },
      { status: 500 },
    );
  }
}
