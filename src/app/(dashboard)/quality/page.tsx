import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_TYPE_LABELS,
} from "@/lib/quality/catalog";
import { listInspections } from "@/server/services/quality";

export default async function QualityPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.qualityRead);
  const canInspect = access.permissions.includes(PERMISSION_IDS.qualityInspect);
  const params = await searchParams;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const inspections = await listInspections({ q: q?.trim() || undefined, page, pageSize });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Calidad</h1>
          <p className="text-xs text-muted-foreground">{inspections.total} inspecciones</p>
        </div>
        {canInspect && (
          <Link href="/quality/inspections/new" className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3 w-3" />
            Inspección
          </Link>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parte</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inspections.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center">
                  <CheckCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Sin inspecciones</p>
                </TableCell>
              </TableRow>
            ) : (
              inspections.rows.map((insp) => (
                <TableRow key={insp.id}>
                  <TableCell>{insp.partNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {INSPECTION_TYPE_LABELS[insp.type as keyof typeof INSPECTION_TYPE_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={insp.result === "aprobado" ? "default" : insp.result === "rechazado" ? "destructive" : "secondary"}>
                      {INSPECTION_RESULT_LABELS[insp.result as keyof typeof INSPECTION_RESULT_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(insp.inspectedAt).toLocaleDateString("es-MX")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
