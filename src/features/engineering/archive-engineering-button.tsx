"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { archiveEngineeringRequestAction } from "@/server/actions/engineering";

export function ArchiveEngineeringButton({
  requestId,
  number,
}: {
  requestId: string;
  number: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (!window.confirm(`¿Archivar la solicitud ${number}?`)) return;
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", requestId);
    const result = await archiveEngineeringRequestAction(formData);
    setPending(false);
    if (result && !result.ok) setError(result.error ?? "No se pudo archivar.");
  }

  return (
    <div>
      <Button type="button" variant="outline" disabled={pending} onClick={onClick}>
        Eliminar
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
