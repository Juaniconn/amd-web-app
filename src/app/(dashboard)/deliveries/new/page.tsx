import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";

export default async function NewDeliveryPage() {
  await requirePermission(PERMISSION_IDS.deliveriesWrite);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/deliveries" className={buttonVariants({ variant: "ghost" })}>
        ← Entregas
      </Link>
      <h2 className="text-2xl font-semibold tracking-tight">Nueva entrega</h2>
      <p className="text-sm text-muted-foreground">
        Las entregas se abren desde la orden de trabajo. Cuando todos los números de
        parte están en Terminada, el administrador de OT pulsa Enviar a Entregas y
        aquí llega el folio en borrador.
      </p>
    </div>
  );
}
