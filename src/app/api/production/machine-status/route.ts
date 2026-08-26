import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { db } from "@/db";
import { machines, workCenters, productionOrders, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission(PERMISSION_IDS.productionView);
    const machineRows = await db
      .select({
        id: machines.id,
        name: machines.name,
        workCenter: workCenters.name,
        status: machines.status,
        operatorName: users.name,
      })
      .from(machines)
      .innerJoin(workCenters, eq(machines.workCenterId, workCenters.id))
      .leftJoin(users, eq(machines.responsibleUserId, users.id))
      .where(eq(machines.active, true));

    const machinesWithParts = await Promise.all(
      machineRows.map(async (machine) => {
        const currentJob = await db
          .select({ number: productionOrders.number })
          .from(productionOrders)
          .where(
            eq(productionOrders.machineId, machine.id),
          )
          .limit(1);
        return {
          ...machine,
          currentPartNumber: currentJob[0]?.number ?? null,
        };
      }),
    );

    return NextResponse.json(machinesWithParts);
  } catch (error) {
    if (error instanceof Error && error.message === "No autenticado.") {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Sin permiso.") {
      return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
    }
    console.error("[machine-status] Error inesperado:", error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
