"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  startMachineHoursAction,
  stopMachineHoursAction,
} from "@/server/actions/production";
import { formatHoursMinutes } from "@/lib/production/catalog";

type HourRow = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  notes: string | null;
  operatorName?: string | null;
  machineName?: string | null;
};

function formatClock(value: Date) {
  return value.toLocaleString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export function ProductionTimePanel({
  productionOrderId,
  machineEntries,
  canWrite,
}: {
  productionOrderId: string;
  machineEntries: HourRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function run(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
    formData: FormData,
  ) {
    setError(null);
    const result = await action(formData);
    if (!result.ok) {
      setError(result.error ?? "No se pudo registrar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        El operador inicia y termina el tiempo. Un clic para empezar, otro para
        terminar.
      </p>
      {machineEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin horas máquina.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {machineEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <span>
                {entry.machineName ?? "Máquina"}
                {entry.operatorName ? ` · ${entry.operatorName}` : ""}
                {" · Inicio "}
                {formatClock(entry.startedAt)}
                {entry.endedAt
                  ? ` · Fin ${formatClock(entry.endedAt)} · ${formatHoursMinutes(entry.durationMinutes ?? 0)}`
                  : " · en curso"}
                {entry.notes ? ` · ${entry.notes}` : ""}
              </span>
              {canWrite && !entry.endedAt ? (
                <form action={(formData) => run(stopMachineHoursAction, formData)}>
                  <input type="hidden" name="id" value={entry.id} />
                  <Button type="submit" size="sm">
                    Terminar
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <form
          className="flex flex-wrap items-end gap-2"
          action={(formData) => run(startMachineHoursAction, formData)}
        >
          <input type="hidden" name="productionOrderId" value={productionOrderId} />
          <Input name="notes" placeholder="Operación / nota" className="min-w-48" />
          <Button type="submit">Iniciar</Button>
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
