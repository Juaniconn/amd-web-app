"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PAYMENT_TERM_LABELS,
  PAYMENT_TERMS,
  type PaymentTerm,
} from "@/lib/quotes/commercial";
import { SUPPLIER_STATUS_LABELS } from "@/lib/purchasing/catalog";
import {
  createSupplierAction,
  updateSupplierAction,
} from "@/server/actions/purchasing";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type Values = {
  legalName: string;
  rfc: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  paymentTerm: PaymentTerm;
  leadTime: string;
  notes: string;
  status: "activo" | "inactivo";
};

export function SupplierForm({
  mode,
  supplierId,
  defaultValues,
}: {
  mode: "create" | "edit";
  supplierId?: string;
  defaultValues?: Partial<Values>;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    defaultValues: {
      legalName: "",
      rfc: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "México",
      paymentTerm: "net_30",
      leadTime: "",
      notes: "",
      status: "activo",
      ...defaultValues,
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const result =
      mode === "create"
        ? await createSupplierAction(values)
        : await updateSupplierAction({ ...values, id: supplierId });
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <Label htmlFor="legalName">Razón social</Label>
        <Input id="legalName" {...form.register("legalName", { required: true })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="rfc">RFC</Label>
          <Input id="rfc" {...form.register("rfc")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="contactName">Contacto</Label>
          <Input id="contactName" {...form.register("contactName")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" {...form.register("address")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" {...form.register("city")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="country">País</Label>
          <Input id="country" {...form.register("country")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="leadTime">Lead time</Label>
          <Input id="leadTime" placeholder="Ej. 5 días" {...form.register("leadTime")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="paymentTerm">Condiciones de pago</Label>
          <select
            id="paymentTerm"
            className={selectClassName}
            {...form.register("paymentTerm")}
          >
            {PAYMENT_TERMS.map((term) => (
              <option key={term} value={term}>
                {PAYMENT_TERM_LABELS[term]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">Estatus</Label>
          <select id="status" className={selectClassName} {...form.register("status")}>
            {Object.entries(SUPPLIER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {mode === "create" ? "Crear proveedor" : "Guardar proveedor"}
      </Button>
    </form>
  );
}
