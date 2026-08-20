"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRANCH_STATUS_LABELS } from "@/lib/branches/catalog";
import {
  createBranchAction,
  updateBranchAction,
} from "@/server/actions/branches";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type BranchFormValues = {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  email: string;
  rfc: string;
  status: "activo" | "inactivo";
};

type BranchFormProps = {
  mode: "create" | "edit";
  branchId?: string;
  official?: boolean;
  defaultValues?: Partial<BranchFormValues>;
};

export function BranchForm({
  mode,
  branchId,
  official,
  defaultValues,
}: BranchFormProps) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<BranchFormValues>({
    defaultValues: {
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      country: "México",
      postalCode: "",
      phone: "",
      email: "",
      rfc: "",
      status: "activo",
      ...defaultValues,
    },
  });

  async function onSubmit(values: BranchFormValues) {
    setError(null);
    const payload = {
      ...values,
      rfc: values.rfc,
    };
    const result =
      mode === "create"
        ? await createBranchAction(payload)
        : await updateBranchAction({ ...payload, id: branchId });
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {official ? (
        <p className="text-sm text-muted-foreground">
          Sucursal oficial de AMD México. Puedes editar datos fiscales y desactivarla,
          pero no eliminarla.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" {...form.register("name", { required: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input id="code" {...form.register("code", { required: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Estatus</Label>
          <select id="status" className={selectClassName} {...form.register("status")}>
            {Object.entries(BRANCH_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" {...form.register("address")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" {...form.register("city")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" {...form.register("state")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <Input id="country" {...form.register("country")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode">Código postal</Label>
          <Input id="postalCode" {...form.register("postalCode")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="rfc">RFC / Tax ID</Label>
          <Input id="rfc" {...form.register("rfc")} />
          <p className="text-xs text-muted-foreground">
            México: RFC de 12 o 13 caracteres. El Paso: EIN o Tax ID estadounidense.
          </p>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting
          ? "Guardando..."
          : mode === "create"
            ? "Crear sucursal"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
