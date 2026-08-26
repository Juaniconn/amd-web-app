import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getAlerts } from "@/server/services/alerts";
import { getDelayRiskAlerts } from "@/server/services/production-risk";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission(PERMISSION_IDS.dashboardRead);
    const [alerts, riskAlerts] = await Promise.all([getAlerts(), getDelayRiskAlerts()]);
    const seen = new Set(alerts.map((a) => a.href));
    const merged = [...alerts, ...riskAlerts.filter((r) => !seen.has(r.href))];
    return NextResponse.json({
      alerts: merged.sort((a, b) => b.sortKey - a.sortKey).slice(0, 30),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado.") {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Sin permiso.") {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }
    console.error("[alerts] Error inesperado:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
