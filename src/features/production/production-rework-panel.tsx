"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createReworkAction } from "@/server/actions/production";

export function ProductionReworkPanel({
  productionOrderId,
  rows,
  canWrite,
}: {
  productionOrderId: string;
  rows: {
    id: string;
    partNumber: string | null;
    quantity: string;
    scrapQuantity: string;
    notes: string | null;
  }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function create(formData: FormData) {
    setError(null);
    const result = await createReworkAction(formData);
    if (!result.ok) {
      setError(result.error ?? "No se pudo registrar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Como en la OT de planta: scrap y retrabajo por cantidad. El tiempo se
        registra en Horas máquina.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin scrap ni retrabajo.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border px-3 py-2">
              <p>
                {row.partNumber ?? "Parte"} · Retrabajo {row.quantity} · Scrap{" "}
                {row.scrapQuantity}
              </p>
              {row.notes ? (
                <p className="text-muted-foreground">{row.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <form action={create} className="grid gap-2 sm:grid-cols-3">
          <input type="hidden" name="productionOrderId" value={productionOrderId} />
          <Input name="partNumber" placeholder="N° parte" />
          <Input
            name="quantity"
            type="text"
            inputMode="decimal"
            placeholder="Retrabajo (pza)"
          />
          <Input
            name="scrapQuantity"
            type="text"
            inputMode="decimal"
            placeholder="Scrap (pza)"
          />
          <Input name="notes" placeholder="Nota" className="sm:col-span-3" />
          <Button type="submit" className="sm:col-span-3">
            Registrar scrap / retrabajo
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
