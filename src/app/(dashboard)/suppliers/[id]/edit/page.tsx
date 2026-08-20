import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { SupplierForm } from "@/features/purchasing/supplier-form";
import { SupplierMaterialsPanel } from "@/features/purchasing/supplier-materials-panel";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import type { PaymentTerm } from "@/lib/quotes/commercial";
import { getSupplierById, listSupplierMaterials } from "@/server/services/purchasing";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.purchasingWrite);
  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier || supplier.deletedAt) notFound();
  const materials = await listSupplierMaterials(supplier.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/suppliers/${supplier.id}`} className={buttonVariants({ variant: "ghost" })}>
          ← {supplier.legalName}
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Editar proveedor</h2>
      </div>
      <SupplierForm
        mode="edit"
        supplierId={supplier.id}
        defaultValues={{
          legalName: supplier.legalName,
          rfc: supplier.rfc ?? "",
          contactName: supplier.contactName ?? "",
          email: supplier.email ?? "",
          phone: supplier.phone ?? "",
          address: supplier.address ?? "",
          city: supplier.city ?? "",
          country: supplier.country,
          paymentTerm: (supplier.paymentTerm as PaymentTerm) ?? "net_30",
          leadTime: supplier.leadTime ?? "",
          notes: supplier.notes ?? "",
          status: supplier.status,
        }}
      />
      <SupplierMaterialsPanel
        supplierId={supplier.id}
        materials={materials}
        canWrite
      />
    </div>
  );
}
