"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { displayMoney } from "@/lib/quotes/money";
import {
  deleteSupplierMaterialAction,
  upsertSupplierMaterialAction,
} from "@/server/actions/purchasing";

type MaterialRow = {
  id: string;
  position: number;
  description: string;
  grade: string | null;
  thicknessIn: string | null;
  costPerKg: string | null;
  sheetWidthIn: string | null;
  sheetLengthIn: string | null;
  densityGCm3: string | null;
  unit: string;
  notes: string | null;
  active: boolean;
};

type FormValues = {
  description: string;
  grade: string;
  thicknessIn: string;
  costPerKg: string;
  sheetWidthIn: string;
  sheetLengthIn: string;
  densityGCm3: string;
  unit: string;
  notes: string;
};

const emptyForm: FormValues = {
  description: "",
  grade: "",
  thicknessIn: "",
  costPerKg: "",
  sheetWidthIn: "",
  sheetLengthIn: "",
  densityGCm3: "",
  unit: "kg",
  notes: "",
};

export function SupplierMaterialsPanel({
  supplierId,
  materials,
  canWrite,
}: {
  supplierId: string;
  materials: MaterialRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const form = useForm<FormValues>({ defaultValues: emptyForm });

  function startCreate() {
    setEditingId(null);
    setError(null);
    form.reset(emptyForm);
    setFormOpen(true);
  }

  function startEdit(row: MaterialRow) {
    setEditingId(row.id);
    setError(null);
    setFormOpen(true);
    form.reset({
      description: row.description,
      grade: row.grade ?? "",
      thicknessIn: row.thicknessIn ?? "",
      costPerKg: row.costPerKg ?? "",
      sheetWidthIn: row.sheetWidthIn ?? "",
      sheetLengthIn: row.sheetLengthIn ?? "",
      densityGCm3: row.densityGCm3 ?? "",
      unit: row.unit || "kg",
      notes: row.notes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormOpen(false);
    setError(null);
    form.reset(emptyForm);
  }

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await upsertSupplierMaterialAction({
      id: editingId ?? undefined,
      supplierId,
      ...values,
      active: true,
    });
    if (result && !result.ok) {
      setError(result.error);
      return;
    }
    cancelEdit();
    router.refresh();
  }

  async function onDelete(id: string) {
    setError(null);
    const formData = new FormData();
    formData.set("id", id);
    const result = await deleteSupplierMaterialAction(formData);
    if (result && !result.ok) {
      setError(result.error);
      return;
    }
    if (editingId === id) cancelEdit();
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Materiales</p>
          <p className="text-xs text-muted-foreground">
            Cada partida alimenta la calculadora y se puede copiar a Inventario.
          </p>
        </div>
        {canWrite && !formOpen ? (
          <Button type="button" size="sm" onClick={startCreate}>
            Agregar partida
          </Button>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Grado</TableHead>
            <TableHead>Espesor</TableHead>
            <TableHead>MXN/kg</TableHead>
            <TableHead>Hoja</TableHead>
            {canWrite ? <TableHead /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {materials.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canWrite ? 7 : 6} className="text-muted-foreground">
                Aún no hay partidas de material.
              </TableCell>
            </TableRow>
          ) : (
            materials.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.position}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>{row.grade ?? "—"}</TableCell>
                <TableCell>{row.thicknessIn ? `${row.thicknessIn} in` : "—"}</TableCell>
                <TableCell>
                  {row.costPerKg ? displayMoney(row.costPerKg, "mxn") : "—"}
                </TableCell>
                <TableCell>
                  {row.sheetWidthIn && row.sheetLengthIn
                    ? `${row.sheetWidthIn} × ${row.sheetLengthIn} in`
                    : "—"}
                </TableCell>
                {canWrite ? (
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(row)}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(row.id)}
                    >
                      Borrar
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {canWrite && formOpen ? (
        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <p className="text-sm font-medium">
            {editingId ? "Editar partida" : "Nueva partida"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="sm-description">Descripción</Label>
              <Input
                id="sm-description"
                {...form.register("description", { required: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-grade">Grado</Label>
              <Input id="sm-grade" placeholder="A36" {...form.register("grade")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-thickness">Espesor in</Label>
              <Input id="sm-thickness" inputMode="decimal" {...form.register("thicknessIn")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-cost">MXN / kg</Label>
              <Input id="sm-cost" inputMode="decimal" {...form.register("costPerKg")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-unit">Unidad</Label>
              <Input id="sm-unit" {...form.register("unit")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-width">Hoja ancho in</Label>
              <Input id="sm-width" inputMode="decimal" {...form.register("sheetWidthIn")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-length">Hoja largo in</Label>
              <Input id="sm-length" inputMode="decimal" {...form.register("sheetLengthIn")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-density">Densidad g/cm³</Label>
              <Input id="sm-density" inputMode="decimal" {...form.register("densityGCm3")} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="sm-notes">Notas</Label>
              <Textarea id="sm-notes" rows={2} {...form.register("notes")} />
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {editingId ? "Guardar partida" : "Guardar partida"}
            </Button>
            <Button type="button" variant="outline" onClick={cancelEdit}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
