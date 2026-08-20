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
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  createCustomerSchema,
} from "@/lib/validation/customers";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/server/actions/customers";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type CustomerFormValues = z.input<typeof createCustomerSchema>;
type CustomerFormOutput = z.output<typeof createCustomerSchema>;

type CustomerFormProps = {
  mode: "create" | "edit";
  customerId?: string;
  defaultValues?: Partial<CustomerFormValues>;
};

export function CustomerForm({
  mode,
  customerId,
  defaultValues,
}: CustomerFormProps) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CustomerFormValues, unknown, CustomerFormOutput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      legalName: "",
      tradeName: "",
      rfc: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      country: "México",
      shippingSameAsBilling: false,
      shippingAddress: "",
      shippingCity: "",
      shippingState: "",
      shippingPostalCode: "",
      shippingCountry: "",
      type: "industrial",
      status: "activo",
      notes: "",
      ...defaultValues,
    },
  });

  async function onSubmit(values: CustomerFormOutput) {
    setError(null);
    const result =
      mode === "create"
        ? await createCustomerAction(values)
        : await updateCustomerAction({ ...values, id: customerId });

    if (result && !result.ok) {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="legalName">Nombre de empresa</Label>
          <Input id="legalName" {...form.register("legalName")} />
          {form.formState.errors.legalName ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.legalName.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tradeName">Nombre comercial</Label>
          <Input id="tradeName" {...form.register("tradeName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rfc">RFC</Label>
          <Input id="rfc" {...form.register("rfc")} />
          {form.formState.errors.rfc ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.rfc.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono de la empresa</Label>
          <Input id="phone" {...form.register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          ) : null}
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
        <div className="space-y-2 md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("shippingSameAsBilling")} />
            La dirección de envío es la misma que la fiscal
          </label>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="shippingAddress">Dirección de envío</Label>
          <Input id="shippingAddress" {...form.register("shippingAddress")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shippingCity">Ciudad de envío</Label>
          <Input id="shippingCity" {...form.register("shippingCity")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shippingState">Estado de envío</Label>
          <Input id="shippingState" {...form.register("shippingState")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shippingPostalCode">CP de envío</Label>
          <Input id="shippingPostalCode" {...form.register("shippingPostalCode")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shippingCountry">País de envío</Label>
          <Input id="shippingCountry" {...form.register("shippingCountry")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipo de cliente</Label>
          <select id="type" className={selectClassName} {...form.register("type")}>
            {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            className={selectClassName}
            {...form.register("status")}
          >
            {Object.entries(CUSTOMER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" rows={4} {...form.register("notes")} />
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
            ? "Crear cliente"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
