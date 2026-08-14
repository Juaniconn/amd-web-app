"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logEngineeringHoursAction } from "@/server/actions/engineering";

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
    userName: string | null;
  }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await logEngineeringHoursAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo registrar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Total registrado: <span className="font-medium">{hoursLogged} h</span>
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay horas capturadas.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border px-3 py-2">
              <span className="font-medium">{entry.hours} h</span>
              {" · "}
              {entry.userName ?? "Usuario"}
              {" · "}
              {entry.workedOn.toLocaleDateString("es-MX")}
              {entry.note ? ` · ${entry.note}` : ""}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <form action={onSubmit} className="flex flex-wrap items-end gap-3">
          <input
            type="hidden"
            name="engineeringRequestId"
            value={engineeringRequestId}
          />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="hours">
              Horas
            </label>
            <Input
              id="hours"
              name="hours"
              type="number"
              min="0.25"
              step="0.25"
              max="24"
              required
              className="w-28"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="workedOn">
              Fecha
            </label>
            <Input id="workedOn" name="workedOn" type="date" />
          </div>
          <div className="min-w-48 flex-1 space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="note">
              Nota
            </label>
            <Input id="note" name="note" placeholder="Actividad" />
          </div>
          <Button type="submit" disabled={pending}>
            Registrar horas
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
