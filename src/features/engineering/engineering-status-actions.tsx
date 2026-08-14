"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  canTransitionEngineering,
  ENGINEERING_STATUS_LABELS,
  permissionForEngineeringTransition,
  type EngineeringStatus,
} from "@/lib/engineering/status";
import type { PermissionId } from "@/lib/permissions/catalog";
import {
  assignEngineeringRequestAction,
  changeEngineeringStatusAction,
} from "@/server/actions/engineering";

const ACTIONS: { status: EngineeringStatus; label: string }[] = [
  { status: "asignado", label: "Marcar asignado" },
  { status: "disenando", label: "Iniciar diseño" },
  { status: "revision_interna", label: "Enviar a revisión interna" },
  { status: "esperando_cliente", label: "Enviar al cliente" },
  { status: "correcciones", label: "Pedir correcciones" },
  { status: "aprobado", label: "Registrar aprobación" },
  { status: "liberado", label: "Liberar" },
  { status: "cancelado", label: "Cancelar" },
];

export function EngineeringStatusActions({
  requestId,
  status,
  assigneeUserId,
  users,
  permissions,
}: {
  requestId: string;
  status: EngineeringStatus;
  assigneeUserId: string | null;
  users: { id: string; name: string }[];
  permissions: PermissionId[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string } | void>,
    extra?: Record<string, string>,
  ) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", requestId);
    if (extra) {
      for (const [key, value] of Object.entries(extra)) formData.set(key, value);
    }
    const result = await action(formData);
    setPending(false);
    if (result && !result.ok) {
      setError(result.error ?? "No se pudo actualizar.");
      return;
    }
    router.refresh();
  }

  const available = ACTIONS.filter((item) => {
    if (!canTransitionEngineering(status, item.status)) return false;
    const permission = permissionForEngineeringTransition(item.status);
    return permissions.includes(permission);
  });
  const canAssign = permissions.includes("engineering:assign");

  return (
    <div className="space-y-3">
      {canAssign && (status === "pendiente" || status === "asignado") ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            run(assignEngineeringRequestAction, {
              assigneeUserId: String(formData.get("assigneeUserId") ?? ""),
            });
          }}
        >
          <select
            name="assigneeUserId"
            defaultValue={assigneeUserId ?? ""}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
            required
          >
            <option value="">Selecciona responsable</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" disabled={pending}>
            Asignar
          </Button>
        </form>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <Button
            key={item.status}
            type="button"
            variant={item.status === "liberado" ? "default" : "outline"}
            disabled={pending}
            onClick={() => run(changeEngineeringStatusAction, { status: item.status })}
          >
            {item.label}
          </Button>
        ))}
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Estado actual: {ENGINEERING_STATUS_LABELS[status]}.
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
