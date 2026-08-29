import Link from "next/link";
import { listDocuments } from "@/server/services/documents-list";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/ui-patterns";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { FileText, File, Download, Search } from "lucide-react";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  quote: "Cotización",
  customer: "Cliente",
  order: "OT",
  engineering_request: "Ingeniería",
  project: "Proyecto",
  production_order: "Parte",
  supplier: "Proveedor",
  purchase_order: "Compra",
  quality_inspection: "Inspección",
  ncr: "NCR",
  delivery: "Entrega",
  invoice: "Factura",
  quote_item: "Item de cotización",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.includes("image")) return <File className="h-4 w-4 text-blue-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  await requirePermission(PERMISSION_IDS.productionView);
  const params = await searchParams;

  const { rows, total } = await listDocuments({
    entityType: params.type,
    search: params.q,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Documentos"
        description={`${total} documento${total === 1 ? "" : "s"} en el sistema`}
      />

      <StatRow>
        <StatCard label="Total" value={total} icon={<FileText className="h-4 w-4" />} />
        <StatCard
          label="Cotizaciones"
          value={rows.filter((r) => r.entityType === "quote").length}
          icon={<File className="h-4 w-4" />}
        />
        <StatCard
          label="OTs"
          value={rows.filter((r) => r.entityType === "order" || r.entityType === "production_order").length}
          icon={<File className="h-4 w-4" />}
        />
      </StatRow>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              defaultValue={params.q}
              className="pl-9"
            />
          </div>
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            defaultValue={params.type}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="Sin documentos"
              description="No se encontraron documentos con los filtros actuales."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="flex items-center gap-2">
                      {getFileIcon(doc.mimeType)}
                      <span className="truncate max-w-[200px]">{doc.originalName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ENTITY_TYPE_LABELS[doc.entityType] || doc.entityType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {doc.entityId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatFileSize(doc.sizeBytes)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/api/documents/${doc.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
