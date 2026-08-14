import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import {
  MACHINE_STATUS_LABELS,
  type MachineStatus,
} from "@/lib/production/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listMachines } from "@/server/services/production-catalogs";

export default async function MachinesPage() {
  const { access } = await requirePermission(PERMISSION_IDS.productionView);
  const canUpdate = access.permissions.includes(PERMISSION_IDS.productionUpdate);
  const rows = await listMachines();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Máquinas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Maestro administrable. No se inventan capacidades técnicas.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/production" className={buttonVariants({ variant: "outline" })}>
            Producción
          </Link>
          {canUpdate ? (
            <Link href="/machines/new" className={buttonVariants()}>
              Nueva máquina
            </Link>
          ) : null}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Horas/turno</TableHead>
              <TableHead>Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/machines/${row.id}`} className="font-medium hover:underline">
                    {row.name}
                  </Link>
                  {row.isDemo ? (
                    <Badge variant="outline" className="ml-2">
                      DEMO
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>{row.workCenterName}</TableCell>
                <TableCell>
                  {MACHINE_STATUS_LABELS[row.status as MachineStatus]}
                </TableCell>
                <TableCell>{row.hoursPerShift}</TableCell>
                <TableCell>{row.active ? "Sí" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
