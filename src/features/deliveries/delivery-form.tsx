"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDeliveryAction, updateDeliveryAction } from "@/server/actions/deliveries";
import { workOrderNumber } from "@/lib/production/ot-number";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type Values = {
  orderId: string;
  branchId: string;
  scheduledDate: string;
  carrier: string;
  trackingNumber: string;
  quantity: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  notes: string;
};

export function DeliveryForm({
  mode,
  deliveryId,
  orders,
  branches,
  defaultValues,
  manageOnly = false,
}: {
  mode: "create" | "edit";
  deliveryId?: string;
  orders: { id: string; number: string; customerName: string; branchId: string | null }[];
  branches: { id: string; code: string; name: string }[];
  defaultValues?: Partial<Values>;
  manageOnly?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    defaultValues: {
      orderId: "",
      branchId: "",
      scheduledDate: "",
      carrier: "",
      trackingNumber: "",
      quantity: "",
      shippingAddress: "",
      shippingCity: "",
      shippingState: "",
      shippingCountry: "México",
      notes: "",
      ...defaultValues,
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const payload = {
      ...values,
      branchId: values.branchId || undefined,
      scheduledDate: values.scheduledDate || undefined,
      quantity: values.quantity ? Number(values.quantity) : undefined,
    };
    const result =
      mode === "create"
        ? await createDeliveryAction(payload)
        : await updateDeliveryAction({ ...payload, id: deliveryId });
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      {manageOnly ? (
        <p className="text-sm text-muted-foreground">
          Los datos de la OT y del cliente no se editan. Solo programa la fecha y el
          transportista.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="orderId">Orden de trabajo</Label>
          <select
            id="orderId"
            className={selectClassName}
            {...form.register("orderId", { required: true })}
            disabled={mode === "edit" || manageOnly}
          >
            <option value="">Selecciona orden de trabajo</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {workOrderNumber(order.number)} · {order.customerName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="branchId">Sucursal que entrega</Label>
          <select
            id="branchId"
            className={selectClassName}
            {...form.register("branchId")}
            disabled={manageOnly}
          >
            <option value="">Usar sucursal de la orden de trabajo</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code} · {branch.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="scheduledDate">Fecha programada</Label>
          <Input id="scheduledDate" type="date" {...form.register("scheduledDate")} />
        </div>
        {manageOnly ? null : (
          <div className="space-y-1">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input id="quantity" type="number" min="1" step="1" {...form.register("quantity")} />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="carrier">Transportista</Label>
          <Input id="carrier" {...form.register("carrier")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="trackingNumber">Guía / tracking</Label>
          <Input id="trackingNumber" {...form.register("trackingNumber")} />
        </div>
      </div>
      {manageOnly ? null : (
        <>
          <div className="space-y-1">
            <Label htmlFor="shippingAddress">Dirección de envío</Label>
            <Input id="shippingAddress" {...form.register("shippingAddress")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input placeholder="Ciudad" {...form.register("shippingCity")} />
            <Input placeholder="Estado" {...form.register("shippingState")} />
            <Input placeholder="País" {...form.register("shippingCountry")} />
          </div>
        </>
      )}
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
        {mode === "create" ? "Crear entrega" : "Guardar entrega"}
      </Button>
    </form>
  );
}
