import Link from "next/link";
import { WorkCenterForm } from "@/features/production/work-center-form";
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
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listWorkCenters } from "@/server/services/production-catalogs";

export default async function WorkCentersPage() {
  const { access } = await requirePermission(PERMISSION_IDS.productionView);
  const canUpdate = access.permissions.includes(PERMISSION_IDS.productionUpdate);
  const centers = await listWorkCenters();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Centros de trabajo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo configurable. No está hardcodeado en la aplicación.
          </p>
        </div>
        <Link href="/production" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      {canUpdate ? <WorkCenterForm /> : null}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Activo</TableHead>
              {canUpdate ? <TableHead>Editar</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {centers.map((center) => (
              <TableRow key={center.id}>
                <TableCell>{center.code}</TableCell>
                <TableCell>{center.name}</TableCell>
                <TableCell>{center.sortOrder}</TableCell>
                <TableCell>{center.active ? "Sí" : "No"}</TableCell>
                {canUpdate ? (
                  <TableCell>
                    <WorkCenterForm workCenter={center} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
