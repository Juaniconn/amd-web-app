"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  adjustStockAction,
  issueStockAction,
  receiveStockAction,
} from "@/server/actions/inventory";

export function StockMovementForms({
  materialId,
  canWrite,
  canAdjust,
}: {
  materialId: string;
  canWrite: boolean;
  canAdjust: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
    formData: FormData,
  ) {
    setPending(true);
    setError(null);
    formData.set("materialId", materialId);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo registrar el movimiento.");
      return;
    }
    router.refresh();
  }

  if (!canWrite && !canAdjust) return null;

  return (
    <div className="space-y-4">
      {canWrite ? (
        <div className="grid gap-4 md:grid-cols-2">
          <form
            className="space-y-2 rounded-lg border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(receiveStockAction, new FormData(event.currentTarget));
            }}
          >
            <p className="text-sm font-medium">Entrada</p>
            <Label htmlFor="qty-in">Cantidad</Label>
            <Input id="qty-in" name="quantity" required />
            <Label htmlFor="reason-in">Motivo</Label>
            <Input id="reason-in" name="reason" />
            <Button type="submit" disabled={pending} size="sm">
              Registrar entrada
            </Button>
          </form>
          <form
            className="space-y-2 rounded-lg border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run(issueStockAction, new FormData(event.currentTarget));
            }}
          >
            <p className="text-sm font-medium">Salida</p>
            <Label htmlFor="qty-out">Cantidad</Label>
            <Input id="qty-out" name="quantity" required />
            <Label htmlFor="reason-out">Motivo</Label>
            <Input id="reason-out" name="reason" required />
            <Button type="submit" disabled={pending} size="sm" variant="outline">
              Registrar salida
            </Button>
          </form>
        </div>
      ) : null}
      {canAdjust ? (
        <form
          className="space-y-2 rounded-lg border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(adjustStockAction, new FormData(event.currentTarget));
          }}
        >
          <p className="text-sm font-medium">Ajuste</p>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label htmlFor="direction">Dirección</Label>
              <select
                id="direction"
                name="direction"
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
                defaultValue="in"
              >
                <option value="in">Alza</option>
                <option value="out">Baja</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="qty-adj">Cantidad</Label>
              <Input id="qty-adj" name="quantity" required />
            </div>
            <div className="min-w-56 flex-1 space-y-1">
              <Label htmlFor="reason-adj">Motivo</Label>
              <Input id="reason-adj" name="reason" required />
            </div>
          </div>
          <Button type="submit" disabled={pending} size="sm" variant="secondary">
            Registrar ajuste
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
