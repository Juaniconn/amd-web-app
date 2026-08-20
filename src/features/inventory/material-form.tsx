"use client";

import { useMemo, useState } from "react";
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

export type SupplierMaterialOption = {
  id: string;
  supplierId: string;
  description: string;
  grade: string | null;
  thicknessIn: string | null;
  costPerKg: string | null;
  sheetWidthIn: string | null;
  sheetLengthIn: string | null;
  densityGCm3: string | null;
  unit: string;
  notes: string | null;
};

export function MaterialForm({
  mode,
  materialId,
  units,
  warehouses,
  branches,
  suppliers,
  supplierMaterials,
  defaultValues,
}: {
  mode: "create" | "edit";
  materialId?: string;
  units: { id: string; code: string; name: string }[];
  warehouses: { id: string; name: string; description: string | null }[];
  branches: { id: string; name: string; code: string }[];
  suppliers?: { id: string; legalName: string }[];
  supplierMaterials?: SupplierMaterialOption[];
  defaultValues?: Partial<FormValues>;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: {
      description: "",
      category: "materia_prima",
      unitId: units[0]?.id ?? "",
      warehouseId: warehouses[0]?.id ?? "",
      branchId: branches[0]?.id ?? "",
      isCritical: false,
      active: true,
      minStock: undefined,
      notes: "",
      grade: "",
      thicknessIn: undefined,
      costPerKg: undefined,
      sheetWidthIn: undefined,
      sheetLengthIn: undefined,
      densityGCm3: undefined,
      supplierId: "",
      supplierMaterialId: "",
      usedInCalculator: false,
      ...defaultValues,
    },
  });

  const supplierId = form.watch("supplierId") || "";
  const supplierMaterialId = form.watch("supplierMaterialId") || "";
  const partidas = useMemo(
    () => (supplierMaterials ?? []).filter((row) => row.supplierId === supplierId),
    [supplierId, supplierMaterials],
  );

  function applyPartida(id: string) {
    const partida = (supplierMaterials ?? []).find((row) => row.id === id);
    if (!partida) return;
    form.setValue("supplierMaterialId", partida.id);
    form.setValue("supplierId", partida.supplierId);
    form.setValue("description", partida.description);
    form.setValue("grade", partida.grade ?? "");
    form.setValue("thicknessIn", partida.thicknessIn ?? undefined);
    form.setValue("costPerKg", partida.costPerKg ?? undefined);
    form.setValue("sheetWidthIn", partida.sheetWidthIn ?? undefined);
    form.setValue("sheetLengthIn", partida.sheetLengthIn ?? undefined);
    form.setValue("densityGCm3", partida.densityGCm3 ?? undefined);
    form.setValue("notes", partida.notes ?? "");
    form.setValue("usedInCalculator", true);
  }

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
        {suppliers && suppliers.length > 0 ? (
          <div className="space-y-2 md:col-span-2 rounded-lg border p-4">
            <p className="text-sm font-medium">Proveedor</p>
            <p className="text-xs text-muted-foreground">
              Elige proveedor y partida para copiar grado, espesor, MXN/kg y hoja a este
              inventario.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplierId">Proveedor</Label>
                <select
                  id="supplierId"
                  className={selectClassName}
                  value={supplierId}
                  onChange={(event) => {
                    form.setValue("supplierId", event.target.value);
                    form.setValue("supplierMaterialId", "");
                  }}
                >
                  <option value="">Sin proveedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.legalName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierMaterialId">Partida de material</Label>
                <select
                  id="supplierMaterialId"
                  className={selectClassName}
                  value={supplierMaterialId}
                  onChange={(event) => applyPartida(event.target.value)}
                  disabled={!supplierId}
                >
                  <option value="">Selecciona material</option>
                  {partidas.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.grade
                        ? `${row.grade}${row.thicknessIn ? ` ${row.thicknessIn} in` : ""} · ${row.description}`
                        : row.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}
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
          <Label htmlFor="branchId">Sucursal</Label>
          <select id="branchId" className={selectClassName} {...form.register("branchId")}>
            <option value="">Selecciona sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code} · {branch.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="warehouseId">Almacén</Label>
          <select
            id="warehouseId"
            className={selectClassName}
            disabled={mode === "edit"}
            {...form.register("warehouseId")}
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="minStock">Stock mínimo</Label>
          <Input id="minStock" inputMode="decimal" {...form.register("minStock")} />
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
        <div className="space-y-2 md:col-span-2 rounded-lg border p-4">
          <p className="text-sm font-medium">Características del material</p>
          <p className="text-xs text-muted-foreground">
            Salen de la partida del proveedor. Puedes ajustarlas si hace falta.
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="grade">Grado</Label>
              <Input id="grade" placeholder="A36" {...form.register("grade")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thicknessIn">Espesor in</Label>
              <Input id="thicknessIn" inputMode="decimal" {...form.register("thicknessIn")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPerKg">MXN / kg</Label>
              <Input id="costPerKg" inputMode="decimal" {...form.register("costPerKg")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheetWidthIn">Hoja ancho in</Label>
              <Input id="sheetWidthIn" inputMode="decimal" {...form.register("sheetWidthIn")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheetLengthIn">Hoja largo in</Label>
              <Input id="sheetLengthIn" inputMode="decimal" {...form.register("sheetLengthIn")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="densityGCm3">Densidad g/cm³</Label>
              <Input id="densityGCm3" inputMode="decimal" {...form.register("densityGCm3")} />
            </div>
          </div>
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
