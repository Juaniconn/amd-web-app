"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MACHINE_STATUS_LABELS,
  type MachineStatus,
} from "@/lib/production/catalog";
import {
  calculatorFieldsForCenter,
  MACHINE_SPEC_KEYS,
  type MachineCalculatorSpecs,
} from "@/lib/quotes/center-calculator";
import { upsertMachineAction } from "@/server/actions/production";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type FormValues = {
  name: string;
  brand: string;
  model: string;
  year: string;
  workCenterId: string;
  responsibleUserId: string;
  hoursPerShift: string;
  capacity: string;
  hourlyCost: string;
  bendLengthMm: string;
  tonnageTon: string;
  notes: string;
  status: MachineStatus;
  active: boolean;
  commissionedAt: string;
} & Record<string, string | boolean>;

function specValue(specs: MachineCalculatorSpecs | null | undefined, key: string) {
  const value = specs?.[key as keyof MachineCalculatorSpecs];
  return value == null ? "" : String(value);
}

export function MachineForm({
  machineId,
  workCenters,
  users,
  defaultValues,
  defaultSpecs,
}: {
  machineId?: string;
  workCenters: { id: string; name: string; code: string }[];
  users: { id: string; name: string }[];
  defaultValues?: Partial<FormValues>;
  defaultSpecs?: MachineCalculatorSpecs | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      brand: "",
      model: "",
      year: "",
      workCenterId: "",
      responsibleUserId: "",
      hoursPerShift: "8",
      capacity: "",
      hourlyCost: "",
      bendLengthMm: "",
      tonnageTon: "",
      notes: "",
      status: "disponible",
      active: true,
      commissionedAt: "",
      cutSpeedIpm: specValue(defaultSpecs, "cutSpeedIpm"),
      pierceSec: specValue(defaultSpecs, "pierceSec"),
      loadMin: specValue(defaultSpecs, "loadMin"),
      unloadMin: specValue(defaultSpecs, "unloadMin"),
      bedXMm: specValue(defaultSpecs, "bedXMm"),
      bedYMm: specValue(defaultSpecs, "bedYMm"),
      setupMin: specValue(defaultSpecs, "setupMin"),
      secPerHit: specValue(defaultSpecs, "secPerHit"),
      engineeringHours: specValue(defaultSpecs, "engineeringHours"),
      packingUnit: specValue(defaultSpecs, "packingUnit"),
      ...defaultValues,
    },
  });

  const workCenterId = form.watch("workCenterId");
  const centerCode = useMemo(
    () => workCenters.find((center) => center.id === workCenterId)?.code ?? "",
    [workCenterId, workCenters],
  );
  const calculatorFields = calculatorFieldsForCenter(centerCode);

  async function onSubmit(values: FormValues) {
    setError(null);
    const specs: MachineCalculatorSpecs = {};
    for (const key of MACHINE_SPEC_KEYS) {
      const raw = values[key];
      if (typeof raw === "string" && raw.trim()) specs[key] = Number(raw);
    }
    const result = await upsertMachineAction({
      id: machineId,
      name: values.name,
      brand: String(values.brand || "") || undefined,
      model: String(values.model || "") || undefined,
      year: values.year ? Number(values.year) : null,
      workCenterId: String(values.workCenterId),
      responsibleUserId: String(values.responsibleUserId || "") || undefined,
      hoursPerShift: Number(values.hoursPerShift),
      capacity: String(values.capacity || "") || undefined,
      hourlyCost: String(values.hourlyCost || "") || null,
      bendLengthMm: String(values.bendLengthMm || "") || null,
      tonnageTon: String(values.tonnageTon || "") || null,
      calculatorSpecs: specs,
      notes: String(values.notes || "") || undefined,
      status: values.status as MachineStatus,
      active: Boolean(values.active),
      commissionedAt: String(values.commissionedAt || "") || undefined,
    });
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" {...form.register("name", { required: true })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" {...form.register("brand")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" {...form.register("model")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="year">Año</Label>
          <Input id="year" type="number" {...form.register("year")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="workCenterId">Centro</Label>
          <select
            id="workCenterId"
            className={selectClassName}
            {...form.register("workCenterId", { required: true })}
          >
            <option value="">Selecciona</option>
            {workCenters.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="responsibleUserId">Responsable</Label>
          <select
            id="responsibleUserId"
            className={selectClassName}
            {...form.register("responsibleUserId")}
          >
            <option value="">Sin asignar</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="hoursPerShift">Horas / turno</Label>
          <Input
            id="hoursPerShift"
            type="number"
            min="0.25"
            step="0.25"
            {...form.register("hoursPerShift")}
          />
          <p className="text-xs text-muted-foreground">
            Capacidad de piso. No entra a la calculadora de cotización.
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="capacity">Capacidad</Label>
          <Input id="capacity" {...form.register("capacity")} />
          <p className="text-xs text-muted-foreground">
            Dato operativo de la máquina (mesa, toneladas, etc. en texto).
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">Estado</Label>
          <select id="status" className={selectClassName} {...form.register("status")}>
            {(Object.entries(MACHINE_STATUS_LABELS) as [MachineStatus, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="commissionedAt">Fecha alta</Label>
        <Input id="commissionedAt" type="date" {...form.register("commissionedAt")} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("active")} />
        Activo
      </label>

      {calculatorFields.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {calculatorFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                inputMode="decimal"
                {...form.register(field.key)}
              />
              <p className="text-xs text-muted-foreground">
                {field.hint ?? "Se usa en la calculadora de cotización."}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Elige un centro para capturar la tarifa y los datos de calculadora de ese tipo.
        </p>
      )}

      <div className="space-y-1">
        <Label htmlFor="notes">Observaciones</Label>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Guardar máquina
      </Button>
    </form>
  );
}
