"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  canTransitionDelivery,
  DELIVERY_STATUS_LABELS,
  type DeliveryStatus,
} from "@/lib/deliveries/catalog";
import { changeDeliveryStatusAction } from "@/server/actions/deliveries";

const ACTIONS: { status: DeliveryStatus; label: string }[] = [
  { status: "preparando", label: "Preparar" },
  { status: "enviado", label: "Marcar enviado" },
  { status: "entregado", label: "Confirmar entrega" },
  { status: "incidencia", label: "Registrar incidencia" },
];

export function DeliveryStatusActions({
  id,
  status,
  canWrite,
  canConfirm,
}: {
  id: string;
  status: DeliveryStatus;
  canWrite: boolean;
  canConfirm: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(next: DeliveryStatus) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("status", next);
    const result = await changeDeliveryStatusAction(formData);
    setPending(false);
    if (result && !result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const available = ACTIONS.filter((item) => {
    if (!canTransitionDelivery(status, item.status)) return false;
    if (item.status === "entregado") return canConfirm;
    return canWrite;
  });
  if (available.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((item) => (
        <Button
          key={item.status}
          type="button"
          variant={item.status === "incidencia" ? "outline" : "default"}
          disabled={pending}
          onClick={() => run(item.status)}
        >
          {item.label}
        </Button>
      ))}
      <p className="w-full text-xs text-muted-foreground">
        Estado actual: {DELIVERY_STATUS_LABELS[status]}
      </p>
      {error ? (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
