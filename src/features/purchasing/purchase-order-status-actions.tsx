"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  canTransitionPurchaseOrder,
  PURCHASE_ORDER_STATUS_LABELS,
  type PurchaseOrderStatus,
} from "@/lib/purchasing/catalog";
import { changePurchaseOrderStatusAction } from "@/server/actions/purchasing";

const ACTIONS: { status: PurchaseOrderStatus; label: string }[] = [
  { status: "enviada", label: "Enviar al proveedor" },
  { status: "confirmada", label: "Confirmar" },
  { status: "cerrada", label: "Cerrar" },
  { status: "cancelada", label: "Cancelar" },
];

export function PurchaseOrderStatusActions({
  id,
  status,
  canWrite,
  canApprove,
}: {
  id: string;
  status: PurchaseOrderStatus;
  canWrite: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(next: PurchaseOrderStatus) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("status", next);
    const result = await changePurchaseOrderStatusAction(formData);
    setPending(false);
    if (result && !result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const available = ACTIONS.filter((item) => {
    if (!canTransitionPurchaseOrder(status, item.status)) return false;
    if (item.status === "confirmada") return canApprove;
    return canWrite;
  });

  if (available.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((item) => (
        <Button
          key={item.status}
          type="button"
          variant={item.status === "cancelada" ? "outline" : "default"}
          disabled={pending}
          onClick={() => run(item.status)}
        >
          {item.label}
        </Button>
      ))}
      <p className="w-full text-xs text-muted-foreground">
        Estado actual: {PURCHASE_ORDER_STATUS_LABELS[status]}
      </p>
      {error ? (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
