"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  canTransitionOrder,
  ORDER_STATUS_LABELS,
  permissionForOrderTransition,
  type OrderStatus,
} from "@/lib/orders/status";
import type { PermissionId } from "@/lib/permissions/catalog";
import { changeOrderStatusAction } from "@/server/actions/orders";

const ACTIONS: { status: OrderStatus; label: string }[] = [
  { status: "pendiente", label: "Marcar pendiente" },
  { status: "aprobado", label: "Aprobar" },
  { status: "en_produccion", label: "Pasar a producción" },
  { status: "completado", label: "Completar" },
  { status: "cancelado", label: "Cancelar" },
  { status: "borrador", label: "Devolver a borrador" },
];

export function OrderStatusActions({
  orderId,
  status,
  permissions,
  openOtCount,
}: {
  orderId: string;
  status: OrderStatus;
  permissions: PermissionId[];
  openOtCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(nextStatus: OrderStatus) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", orderId);
    formData.set("status", nextStatus);
    const result = await changeOrderStatusAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo actualizar.");
      return;
    }
    router.refresh();
  }

  const available = ACTIONS.filter((item) => {
    if (!canTransitionOrder(status, item.status)) return false;
    return permissions.includes(permissionForOrderTransition(item.status));
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <Button
            key={item.status}
            type="button"
            variant={item.status === "cancelado" ? "outline" : "default"}
            disabled={
              pending ||
              ((item.status === "completado" || item.status === "cancelado") &&
                openOtCount > 0)
            }
            onClick={() => run(item.status)}
          >
            {item.label}
          </Button>
        ))}
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Estado actual: {ORDER_STATUS_LABELS[status]}.
          </p>
        ) : null}
      </div>
      {openOtCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          Hay {openOtCount} número{openOtCount === 1 ? "" : "s"} de parte abierto
          {openOtCount === 1 ? "" : "s"}. Completar o cancelar la orden de trabajo exige
          cerrarlos o cancelarlos primero.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
