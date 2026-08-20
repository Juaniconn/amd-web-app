"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  canTransitionNcr,
  NCR_STATUS_LABELS,
  type NcrStatus,
} from "@/lib/quality/catalog";
import { changeNcrStatusAction } from "@/server/actions/quality";

const ACTIONS: { status: NcrStatus; label: string }[] = [
  { status: "en_analisis", label: "En análisis" },
  { status: "retrabajo", label: "Retrabajo" },
  { status: "cerrada", label: "Cerrar" },
  { status: "cancelada", label: "Cancelar" },
];

export function NcrStatusActions({ id, status }: { id: string; status: NcrStatus }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(next: NcrStatus) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("status", next);
    const result = await changeNcrStatusAction(formData);
    setPending(false);
    if (result && !result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const available = ACTIONS.filter((item) => canTransitionNcr(status, item.status));
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
        Estado actual: {NCR_STATUS_LABELS[status]}
      </p>
      {error ? (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
