import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/features/customers/customer-form";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getCustomerById } from "@/server/services/customers";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSION_IDS.customersWrite);
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer || customer.deletedAt) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Editar cliente
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{customer.code}</p>
        </div>
        <Link
          href={`/customers/${customer.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Cancelar
        </Link>
      </div>
      <CustomerForm
        mode="edit"
        customerId={customer.id}
        defaultValues={{
          legalName: customer.legalName,
          tradeName: customer.tradeName ?? "",
          rfc: customer.rfc ?? "",
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          address: customer.address ?? "",
          city: customer.city ?? "",
          state: customer.state ?? "",
          country: customer.country,
          shippingSameAsBilling: customer.shippingSameAsBilling,
          shippingAddress: customer.shippingAddress ?? "",
          shippingCity: customer.shippingCity ?? "",
          shippingState: customer.shippingState ?? "",
          shippingPostalCode: customer.shippingPostalCode ?? "",
          shippingCountry: customer.shippingCountry ?? "",
          type: customer.type,
          status: customer.status,
          notes: customer.notes ?? "",
        }}
      />
    </div>
  );
}
