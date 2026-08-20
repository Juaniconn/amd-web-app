"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { convertPurchaseRequestAction } from "@/server/actions/purchasing";

export function ConvertRequestForm({
  requestId,
  disabled,
}: {
  requestId: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const result = await convertPurchaseRequestAction(
          new FormData(event.currentTarget),
        );
        setPending(false);
        if (result && !result.ok) {
          setError(result.error ?? "No se pudo crear la OC.");
        }
      }}
    >
      <input type="hidden" name="requestId" value={requestId} />
      <Button type="submit" disabled={pending || disabled}>
        Crear órdenes de compra
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
