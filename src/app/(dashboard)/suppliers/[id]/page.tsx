import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveSupplierButton } from "@/features/purchasing/archive-supplier-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { PAYMENT_TERM_LABELS, type PaymentTerm } from "@/lib/quotes/commercial";
import { SUPPLIER_STATUS_LABELS, type SupplierStatus } from "@/lib/purchasing/catalog";
import { getSupplierById, listSupplierMaterials } from "@/server/services/purchasing";
import { SupplierMaterialsPanel } from "@/features/purchasing/supplier-materials-panel";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { access } = await requirePermission(PERMISSION_IDS.purchasingRead);
  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) notFound();
  const canWrite = access.permissions.includes(PERMISSION_IDS.purchasingWrite);
  const materials = await listSupplierMaterials(supplier.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Proveedor
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{supplier.legalName}</h2>
            <Badge variant="secondary">{supplier.code}</Badge>
            <Badge variant="outline">
              {SUPPLIER_STATUS_LABELS[supplier.status as SupplierStatus]}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/suppliers" className={buttonVariants({ variant: "outline" })}>
            Volver
          </Link>
          {canWrite && !supplier.deletedAt ? (
            <>
              <Link href={`/suppliers/${supplier.id}/edit`} className={buttonVariants()}>
                Editar
              </Link>
              <ArchiveSupplierButton supplierId={supplier.id} legalName={supplier.legalName} />
            </>
          ) : null}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos comerciales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="RFC" value={supplier.rfc} />
          <Field label="Contacto" value={supplier.contactName} />
          <Field label="Teléfono" value={supplier.phone} />
          <Field label="Correo" value={supplier.email} />
          <Field label="Dirección" value={supplier.address} />
          <Field label="Ciudad" value={supplier.city} />
          <Field label="País" value={supplier.country} />
          <Field
            label="Pago"
            value={
              PAYMENT_TERM_LABELS[(supplier.paymentTerm as PaymentTerm) ?? "net_30"] ??
              supplier.paymentTerm
            }
          />
          <Field label="Lead time" value={supplier.leadTime} />
          <Field label="Notas" value={supplier.notes} />
        </CardContent>
      </Card>
      <SupplierMaterialsPanel
        supplierId={supplier.id}
        materials={materials}
        canWrite={canWrite && !supplier.deletedAt}
      />
    </div>
  );
}
