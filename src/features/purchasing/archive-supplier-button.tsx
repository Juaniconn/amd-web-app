"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { archiveSupplierAction } from "@/server/actions/purchasing";

export function ArchiveSupplierButton({
  supplierId,
  legalName,
}: {
  supplierId: string;
  legalName: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onArchive() {
    if (
      !confirm(
        `¿Archivar el proveedor ${legalName}? Dejará de aparecer en altas de OC. El historial se conserva.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    const data = new FormData();
    data.set("id", supplierId);
    const result = await archiveSupplierAction(data);
    if (result && !result.ok) setError(result.error);
    setPending(false);
  }

  return (
    <div>
      <Button type="button" variant="outline" onClick={onArchive} disabled={pending}>
        {pending ? "Archivando..." : "Archivar"}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
