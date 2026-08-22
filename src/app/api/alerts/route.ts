import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getAlerts } from "@/server/services/alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission(PERMISSION_IDS.dashboardRead);
    const alerts = await getAlerts();
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] }, { status: 200 });
  }
}
