"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlantRates } from "@/lib/quotes/plant-rates";
import { savePlantRatesAction } from "@/server/actions/calculator";

type Values = {
  [K in keyof Omit<PlantRates, "isPlaceholder">]: string;
};

function Field({
  id,
  label,
  register,
}: {
  id: keyof Values;
  label: string;
  register: ReturnType<typeof useForm<Values>>["register"];
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" {...register(id)} />
    </div>
  );
}

export function PlantRatesForm({ rates, canWrite }: { rates: PlantRates; canWrite: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    defaultValues: {
      defaultMarginPct: String(rates.defaultMarginPct),
      a36CostPerKg: String(rates.a36CostPerKg),
      machineHourly: String(rates.machineHourly),
      pressHourly: String(rates.pressHourly),
      bendUnitCost: String(rates.bendUnitCost),
      powderCoatMin: String(rates.powderCoatMin),
      powderCoatPerM2: String(rates.powderCoatPerM2),
      engineeringHours: String(rates.engineeringHours),
      engineeringHourly: String(rates.engineeringHourly),
      packingUnit: String(rates.packingUnit),
      cutSpeedIpm: String(rates.cutSpeedIpm),
      pierceSec: String(rates.pierceSec),
      loadMin: String(rates.loadMin),
      unloadMin: String(rates.unloadMin),
      durmaSetupMin: String(rates.durmaSetupMin),
      durmaSecPerHit: String(rates.durmaSecPerHit),
      pressBendLengthMm: String(rates.pressBendLengthMm),
      pressTonnageTon: String(rates.pressTonnageTon),
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const result = await savePlantRatesAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field id="defaultMarginPct" label="Margen % venta" register={form.register} />
        <Field id="a36CostPerKg" label="Fallback A36 MXN/kg" register={form.register} />
        <Field id="machineHourly" label="Hora láser (si la máquina no tiene tarifa)" register={form.register} />
        <Field id="pressHourly" label="Hora dobladora (si la máquina no tiene tarifa)" register={form.register} />
        <Field id="bendUnitCost" label="Golpe de doblez (si no hay hora)" register={form.register} />
        <Field id="cutSpeedIpm" label="Velocidad corte ipm" register={form.register} />
        <Field id="pierceSec" label="Pierce s" register={form.register} />
        <Field id="loadMin" label="Carga min" register={form.register} />
        <Field id="unloadMin" label="Descarga min" register={form.register} />
        <Field id="durmaSetupMin" label="Setup Durma min" register={form.register} />
        <Field id="durmaSecPerHit" label="Durma s/golpe" register={form.register} />
        <Field id="pressBendLengthMm" label="Mesa doblez mm" register={form.register} />
        <Field id="pressTonnageTon" label="Tonelaje t" register={form.register} />
        <Field id="powderCoatMin" label="Pintura mínimo MXN" register={form.register} />
        <Field id="powderCoatPerM2" label="Pintura MXN/m² ambos lados" register={form.register} />
        <Field id="engineeringHours" label="Horas CAM lote" register={form.register} />
        <Field id="engineeringHourly" label="Hora CAM MXN" register={form.register} />
        <Field id="packingUnit" label="Empaque MXN/pza" register={form.register} />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {canWrite ? (
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Guardar tarifas
        </Button>
      ) : null}
    </form>
  );
}
