"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  startEngineeringHoursAction,
  stopEngineeringHoursAction,
} from "@/server/actions/engineering";
import {
  formatHoursMinutes,
  hoursToMinutes,
} from "@/lib/production/catalog";

function formatClock(value: Date) {
  return value.toLocaleString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

export function EngineeringHoursPanel({
  engineeringRequestId,
  hoursLogged,
  entries,
  canWrite,
}: {
  engineeringRequestId: string;
  hoursLogged: string;
  entries: {
    id: string;
    hours: string;
    note: string | null;
    workedOn: Date;
    startedAt: Date | null;
    endedAt: Date | null;
    durationMinutes: number | null;
    userName: string | null;
  }[];
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

  const totalMinutes = hoursToMinutes(Number(hoursLogged));

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Total registrado:{" "}
        <span className="font-medium">{formatHoursMinutes(totalMinutes)}</span>
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay horas capturadas.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {entries.map((entry) => {
            const minutes =
              entry.durationMinutes ?? hoursToMinutes(Number(entry.hours));
            return (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <span>
                  <span className="font-medium">
                    {entry.endedAt || !entry.startedAt
                      ? formatHoursMinutes(minutes)
                      : "en curso"}
                  </span>
                  {" · "}
                  {entry.userName ?? "Usuario"}
                  {entry.startedAt
                    ? ` · Inicio ${formatClock(entry.startedAt)}`
                    : ` · ${entry.workedOn.toLocaleDateString("es-MX")}`}
                  {entry.endedAt ? ` · Fin ${formatClock(entry.endedAt)}` : ""}
                  {entry.note ? ` · ${entry.note}` : ""}
                </span>
                {canWrite && entry.startedAt && !entry.endedAt ? (
                  <form
                    action={(formData) => run(stopEngineeringHoursAction, formData)}
                  >
                    <input type="hidden" name="id" value={entry.id} />
                    <Button type="submit" size="sm">
                      Terminar
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {canWrite ? (
        <form
          className="flex flex-wrap items-end gap-3"
          action={(formData) => run(startEngineeringHoursAction, formData)}
        >
          <input
            type="hidden"
            name="engineeringRequestId"
            value={engineeringRequestId}
          />
          <div className="min-w-48 flex-1 space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="note">
              Nota
            </label>
            <Input id="note" name="note" placeholder="Actividad" />
          </div>
          <Button type="submit">Iniciar horas</Button>
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
