import Link from "next/link";
import { notFound } from "next/navigation";
import { MachineForm } from "@/features/production/machine-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listUsersForProduction } from "@/server/services/production";
import {
  getMachineById,
  listWorkCenters,
} from "@/server/services/production-catalogs";
import type { MachineStatus } from "@/lib/production/catalog";

function toDateInput(value?: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export default async function EditMachinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.productionUpdate);
  const { id } = await params;
  const machine = await getMachineById(id);
  if (!machine) notFound();
  const workCenters = await listWorkCenters();
  const users = await listUsersForProduction();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Editar máquina</h2>
          <p className="mt-1 text-sm text-muted-foreground">{machine.name}</p>
        </div>
        <Link
          href={`/machines/${machine.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
      <MachineForm
        machineId={machine.id}
        workCenters={workCenters.map((center) => ({ id: center.id, name: center.name }))}
        users={users}
        defaultValues={{
          name: machine.name,
          brand: machine.brand ?? "",
          model: machine.model ?? "",
          year: machine.year ? String(machine.year) : "",
          workCenterId: machine.workCenterId,
          responsibleUserId: machine.responsibleUserId ?? "",
          hoursPerShift: machine.hoursPerShift,
          capacity: machine.capacity ?? "",
          notes: machine.notes ?? "",
          status: machine.status as MachineStatus,
          active: machine.active,
          commissionedAt: toDateInput(machine.commissionedAt),
        }}
      />
    </div>
  );
}
