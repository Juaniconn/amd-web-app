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
  } catch {
    return NextResponse.json({ alerts: [] }, { status: 200 });
  }
}
