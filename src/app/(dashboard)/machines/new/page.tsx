import Link from "next/link";
import { MachineForm } from "@/features/production/machine-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listUsersForProduction } from "@/server/services/production";
import { listWorkCenters } from "@/server/services/production-catalogs";

export default async function NewMachinePage() {
  await requirePermission(PERMISSION_IDS.productionUpdate);
  const workCenters = await listWorkCenters({ activeOnly: true });
  const users = await listUsersForProduction();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Nueva máquina</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Captura solo datos reales. No inventes marca, modelo ni capacidad.
          </p>
        </div>
        <Link href="/machines" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <MachineForm
        workCenters={workCenters.map((center) => ({ id: center.id, name: center.name }))}
        users={users}
      />
    </div>
  );
}
