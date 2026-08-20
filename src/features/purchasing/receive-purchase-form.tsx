"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { receivePurchaseOrderAction } from "@/server/actions/purchasing";
import { displayQty, inputQty } from "@/lib/inventory/catalog";

type Item = {
  id: string;
  materialCode: string;
  description: string;
  quantity: string;
  receivedQty: string;
};

export function ReceivePurchaseForm({
  purchaseOrderId,
  items,
}: {
  purchaseOrderId: string;
  items: Item[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState<Record<string, string>>(
    Object.fromEntries(
      items.map((item) => {
        const remaining = Math.max(0, Number(item.quantity) - Number(item.receivedQty));
        return [item.id, remaining > 0 ? inputQty(remaining) : "0"];
      }),
    ),
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await receivePurchaseOrderAction({
      purchaseOrderId,
      notes: notes || undefined,
      items: items.map((item) => ({
        purchaseOrderItemId: item.id,
        quantity: Number(qty[item.id] ?? 0),
      })),
    });
    setPending(false);
    if (result && !result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {items.map((item) => {
        const remaining = Math.max(0, Number(item.quantity) - Number(item.receivedQty));
        return (
          <div key={item.id} className="grid gap-2 sm:grid-cols-4 sm:items-end">
            <div className="sm:col-span-2">
              <p className="text-sm font-medium">
                {item.materialCode} · {item.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Pedido {displayQty(item.quantity)} · Recibido {displayQty(item.receivedQty)} · Pendiente{" "}
                {displayQty(remaining)}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`qty-${item.id}`}>Recibir ahora</Label>
              <Input
                id={`qty-${item.id}`}
                type="number"
                min="0"
                step="any"
                max={remaining}
                value={qty[item.id] ?? "0"}
                onChange={(event) =>
                  setQty((current) => ({ ...current, [item.id]: event.target.value }))
                }
                disabled={remaining <= 0}
              />
            </div>
          </div>
        );
      })}
      <div className="space-y-1">
        <Label htmlFor="notes">Notas de recepción</Label>
        <Input id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        Registrar recepción
      </Button>
    </form>
  );
}
