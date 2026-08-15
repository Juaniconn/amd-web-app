"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PermissionId } from "@/lib/permissions/catalog";
import {
  canTransitionProject,
  permissionForProjectTransition,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/status";
import { changeProjectStatusAction } from "@/server/actions/projects";

const ACTIONS: { status: ProjectStatus; label: string }[] = [
  { status: "activo", label: "Activar" },
  { status: "pausado", label: "Pausar" },
  { status: "completado", label: "Cerrar" },
  { status: "cancelado", label: "Cancelar" },
];

export function ProjectStatusActions({
  projectId,
  status,
  permissions,
}: {
  projectId: string;
  status: ProjectStatus;
  permissions: PermissionId[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(nextStatus: ProjectStatus) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", projectId);
    formData.set("status", nextStatus);
    const result = await changeProjectStatusAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo actualizar.");
      return;
    }
    router.refresh();
  }

  const available = ACTIONS.filter((item) => {
    if (!canTransitionProject(status, item.status)) return false;
    return permissions.includes(permissionForProjectTransition(item.status));
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <Button
            key={item.status}
            type="button"
            variant={item.status === "cancelado" ? "outline" : "default"}
            disabled={pending}
            onClick={() => run(item.status)}
          >
            {item.label}
          </Button>
        ))}
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Estado actual: {PROJECT_STATUS_LABELS[status]}.
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
