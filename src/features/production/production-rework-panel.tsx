"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createReworkAction,
  releaseReworkAction,
} from "@/server/actions/production";

export function ProductionReworkPanel({
  productionOrderId,
  rows,
  canWrite,
  canRelease,
}: {
  productionOrderId: string;
  rows: {
    id: string;
    partNumber: string | null;
    quantity: string;
    scrapQuantity: string;
    rootCause: string;
    laborHours: string;
    machineHours: string;
    qualityReleased: boolean;
  }[];
  canWrite: boolean;
  canRelease: boolean;
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

  async function release(formData: FormData) {
    setError(null);
    const result = await releaseReworkAction(formData);
    if (!result.ok) {
      setError(result.error ?? "No se pudo liberar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin retrabajos.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg border px-3 py-2">
              <p>
                {row.partNumber ?? "Parte"} · {row.quantity} pza · scrap {row.scrapQuantity}
                {row.qualityReleased ? " · Liberado calidad" : ""}
              </p>
              <p className="text-muted-foreground">{row.rootCause}</p>
              <p className="text-xs text-muted-foreground">
                HH {row.laborHours} · HM {row.machineHours}
              </p>
              {canRelease && !row.qualityReleased ? (
                <form action={release} className="mt-2">
                  <input type="hidden" name="id" value={row.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Liberar calidad
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <form action={create} className="grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="productionOrderId" value={productionOrderId} />
          <Input name="partNumber" placeholder="Parte" />
          <Input name="quantity" type="number" min="0.0001" step="0.0001" placeholder="Cantidad" required />
          <Input name="scrapQuantity" type="number" min="0" step="0.0001" placeholder="Scrap" />
          <Input name="laborHours" type="number" min="0" step="0.25" placeholder="Horas hombre" />
          <Input name="machineHours" type="number" min="0" step="0.25" placeholder="Horas máquina" />
          <Textarea
            name="rootCause"
            placeholder="Causa raíz"
            required
            className="sm:col-span-2"
            rows={2}
          />
          <Button type="submit" className="sm:col-span-2">
            Registrar retrabajo
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
