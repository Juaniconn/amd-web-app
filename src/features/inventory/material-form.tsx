"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
} from "@/lib/inventory/catalog";
import { createMaterialSchema } from "@/lib/validation/inventory";
import {
  createMaterialAction,
  updateMaterialAction,
} from "@/server/actions/inventory";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type FormValues = z.input<typeof createMaterialSchema>;
type FormOutput = z.output<typeof createMaterialSchema>;

export function MaterialForm({
  mode,
  materialId,
  units,
  defaultValues,
}: {
  mode: "create" | "edit";
  materialId?: string;
  units: { id: string; code: string; name: string }[];
  defaultValues?: Partial<FormValues>;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: {
      description: "",
      category: "materia_prima",
      unitId: units[0]?.id ?? "",
      isCritical: false,
      active: true,
      minStock: undefined,
      notes: "",
      ...defaultValues,
    },
  });

  async function onSubmit(values: FormOutput) {
    setError(null);
    const result =
      mode === "create"
        ? await createMaterialAction(values)
        : await updateMaterialAction({ ...values, id: materialId });
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Input id="description" {...form.register("description")} />
          {form.formState.errors.description ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.description.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoría</Label>
          <select
            id="category"
            className={selectClassName}
            disabled={mode === "edit"}
            {...form.register("category")}
          >
            {MATERIAL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {MATERIAL_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitId">Unidad</Label>
          <select
            id="unitId"
            className={selectClassName}
            disabled={mode === "edit"}
            {...form.register("unitId")}
          >
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="minStock">Stock mínimo</Label>
          <Input id="minStock" {...form.register("minStock")} />
          <p className="text-xs text-muted-foreground">
            Recomendado si el material es crítico. Vacío = no entra al KPI de bajo
            stock.
          </p>
        </div>
        <div className="flex items-center gap-4 pt-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("isCritical")} />
            Material crítico
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("active")} />
            Activo
          </label>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Observaciones</Label>
          <Textarea id="notes" rows={3} {...form.register("notes")} />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {mode === "create" ? "Crear material" : "Guardar"}
      </Button>
    </form>
  );
}
