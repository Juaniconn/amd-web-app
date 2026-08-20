"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendWorkOrderToDeliveryAction } from "@/server/actions/deliveries";

export function SendToDeliveryButton({ orderId }: { orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const formData = new FormData();
        formData.set("orderId", orderId);
        const result = await sendWorkOrderToDeliveryAction(formData);
        setPending(false);
        if (result && !result.ok) {
          setError(result.error ?? "No se pudo enviar a Entregas.");
        }
      }}
    >
      <Button type="submit" disabled={pending}>
        Enviar a Entregas
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
