"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  canTransitionProduction,
  PRODUCTION_STATUS_LABELS,
  permissionForProductionTransition,
  type ProductionStatus,
} from "@/lib/production/status";
import type { PermissionId } from "@/lib/permissions/catalog";
import { changeProductionStatusAction } from "@/server/actions/production";

const ACTIONS: { status: ProductionStatus; label: string }[] = [
  { status: "liberada", label: "Liberar a piso" },
  { status: "programada", label: "Programar" },
  { status: "en_produccion", label: "Iniciar / reanudar" },
  { status: "pausada", label: "Pausar" },
  { status: "esperando_material", label: "Esperando material" },
  { status: "calidad", label: "Enviar a calidad" },
  { status: "terminada", label: "Cierre físico" },
  { status: "entregada", label: "Cierre administrativo" },
  { status: "cancelada", label: "Cancelar OT" },
];

export function ProductionStatusActions({
  productionOrderId,
  status,
  downtimeReasons,
  permissions,
}: {
  productionOrderId: string;
  status: ProductionStatus;
  downtimeReasons: { id: string; name: string }[];
  permissions: PermissionId[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pauseReasonId, setPauseReasonId] = useState(downtimeReasons[0]?.id ?? "");

  async function run(next: ProductionStatus) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", productionOrderId);
    formData.set("status", next);
    if (next === "pausada") formData.set("pauseReasonId", pauseReasonId);
    const result = await changeProductionStatusAction(formData);
    setPending(false);
    if (result && !result.ok) {
      setError(result.error ?? "No se pudo actualizar.");
      return;
    }
    router.refresh();
  }

  const available = ACTIONS.filter((item) => {
    if (!canTransitionProduction(status, item.status)) return false;
    return permissions.includes(permissionForProductionTransition(item.status));
  });

  return (
    <div className="space-y-3">
      {available.some((item) => item.status === "pausada") ? (
        <div className="flex flex-wrap items-end gap-2">
          <select
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
            value={pauseReasonId}
            onChange={(event) => setPauseReasonId(event.target.value)}
          >
            {downtimeReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Motivo al pausar</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <Button
            key={item.status}
            type="button"
            variant={
              item.status === "cancelada"
                ? "destructive"
                : item.status === "terminada" || item.status === "entregada"
                  ? "default"
                  : "outline"
            }
            disabled={pending}
            onClick={() => run(item.status)}
          >
            {item.label}
          </Button>
        ))}
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Estado actual: {PRODUCTION_STATUS_LABELS[status]}.
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
