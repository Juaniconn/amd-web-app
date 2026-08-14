"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  logDowntimeAction,
  startLaborHoursAction,
  startMachineHoursAction,
  stopLaborHoursAction,
  stopMachineHoursAction,
} from "@/server/actions/production";
import { minutesToHours } from "@/lib/production/catalog";

type HourRow = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  notes: string | null;
  operatorName?: string | null;
  machineName?: string | null;
};

export function ProductionTimePanel({
  productionOrderId,
  machineEntries,
  laborEntries,
  downtime,
  downtimeReasons,
  canWrite,
}: {
  productionOrderId: string;
  machineEntries: HourRow[];
  laborEntries: HourRow[];
  downtime: { id: string; startedAt: Date; endedAt: Date | null; notes: string | null }[];
  downtimeReasons: { id: string; name: string }[];
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
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Horas máquina</h3>
        {machineEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {machineEntries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <span>
                  {entry.machineName ?? "Máquina"} · {entry.operatorName ?? "Operador"} ·{" "}
                  {entry.endedAt
                    ? `${minutesToHours(entry.durationMinutes ?? 0)} h`
                    : "abierto"}
                </span>
                {canWrite && !entry.endedAt ? (
                  <form
                    action={(formData) => run(stopMachineHoursAction, formData)}
                  >
                    <input type="hidden" name="id" value={entry.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Cerrar
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
            <Input name="notes" placeholder="Operación" className="min-w-48" />
            <Button type="submit" variant="outline">
              Iniciar horas máquina
            </Button>
          </form>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Horas hombre</h3>
        {laborEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {laborEntries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                <span>
                  {entry.operatorName ?? "Operador"} ·{" "}
                  {entry.endedAt
                    ? `${minutesToHours(entry.durationMinutes ?? 0)} h`
                    : "abierto"}
                </span>
                {canWrite && !entry.endedAt ? (
                  <form action={(formData) => run(stopLaborHoursAction, formData)}>
                    <input type="hidden" name="id" value={entry.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Cerrar
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
            action={(formData) => run(startLaborHoursAction, formData)}
          >
            <input type="hidden" name="productionOrderId" value={productionOrderId} />
            <Input name="notes" placeholder="Operación" className="min-w-48" />
            <Button type="submit" variant="outline">
              Iniciar horas hombre
            </Button>
          </form>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Tiempos muertos</h3>
        {downtime.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin pausas registradas.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {downtime.map((entry) => (
              <li key={entry.id} className="rounded-lg border px-3 py-2">
                {entry.startedAt.toLocaleString("es-MX")}
                {entry.notes ? ` · ${entry.notes}` : ""}
              </li>
            ))}
          </ul>
        )}
        {canWrite ? (
          <form
            className="flex flex-wrap items-end gap-2"
            action={(formData) => run(logDowntimeAction, formData)}
          >
            <input type="hidden" name="productionOrderId" value={productionOrderId} />
            <select
              name="reasonId"
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              required
            >
              {downtimeReasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.name}
                </option>
              ))}
            </select>
            <Input name="notes" placeholder="Nota" className="min-w-40" />
            <Button type="submit" variant="outline">
              Registrar tiempo muerto
            </Button>
          </form>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
