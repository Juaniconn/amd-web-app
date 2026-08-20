"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { resolveInspectionAction } from "@/server/actions/quality";

export function InspectionResolveForm({
  inspectionId,
}: {
  inspectionId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(result: "aprobado" | "rechazado") {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", inspectionId);
    formData.set("result", result);
    const response = await resolveInspectionAction(formData);
    setPending(false);
    if (response && !response.ok) {
      setError(response.error ?? "No se pudo guardar el veredicto.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={pending} onClick={() => run("aprobado")}>
        Aprobar
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => run("rechazado")}
      >
        Rechazar / retrabajo
      </Button>
      {error ? (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
