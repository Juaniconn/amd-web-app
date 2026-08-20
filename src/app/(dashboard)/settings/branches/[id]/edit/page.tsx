import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchForm } from "@/features/branches/branch-form";
import { buttonVariants } from "@/components/ui/button";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import { getBranchById } from "@/server/services/branches";

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.branchesWrite);
  const { id } = await params;
  const branch = await getBranchById(id);
  if (!branch || branch.deletedAt) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Editar sucursal</h2>
          <p className="mt-1 text-sm text-muted-foreground">{branch.code}</p>
        </div>
        <Link
          href={`/settings/branches/${branch.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
      <BranchForm
        mode="edit"
        branchId={branch.id}
        official={branch.isOfficialSeed}
        defaultValues={{
          name: branch.name,
          code: branch.code,
          address: branch.address ?? "",
          city: branch.city ?? "",
          state: branch.state ?? "",
          country: branch.country,
          postalCode: branch.postalCode ?? "",
          phone: branch.phone ?? "",
          email: branch.email ?? "",
          rfc: branch.rfc ?? "",
          status: branch.status,
        }}
      />
    </div>
  );
}
