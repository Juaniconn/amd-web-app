"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { archiveBranchAction } from "@/server/actions/branches";

export function ArchiveBranchButton({
  branchId,
  name,
}: {
  branchId: string;
  name: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onArchive() {
    if (
      !confirm(
        `¿Archivar la sucursal ${name}? No elimina cotizaciones históricas. Si está en uso, desactívala.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const data = new FormData();
    data.set("id", branchId);
    const result = await archiveBranchAction(data);
    if (result && !result.ok) setError(result.error);
    setPending(false);
  }

  return (
    <div>
      <Button type="button" variant="outline" onClick={onArchive} disabled={pending}>
        {pending ? "Archivando..." : "Eliminar"}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
