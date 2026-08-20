"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createNcrAction } from "@/server/actions/quality";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type Values = {
  productionOrderId: string;
  inspectionId: string;
  cause: string;
  disposition: string;
  notes: string;
};

export function NcrForm({
  orders,
  inspections,
  defaultProductionOrderId,
  defaultInspectionId,
}: {
  orders: { id: string; number: string; partNumber: string | null; customerName: string }[];
  inspections: { id: string; number: string; productionOrderId: string }[];
  defaultProductionOrderId?: string;
  defaultInspectionId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    defaultValues: {
      productionOrderId: defaultProductionOrderId ?? "",
      inspectionId: defaultInspectionId ?? "",
      cause: "",
      disposition: "",
      notes: "",
    },
  });
  const otId = form.watch("productionOrderId");
  const related = inspections.filter((item) => item.productionOrderId === otId);

  async function onSubmit(values: Values) {
    setError(null);
    const result = await createNcrAction({
      ...values,
      inspectionId: values.inspectionId || undefined,
      cause: values.cause || undefined,
      disposition: values.disposition || undefined,
      notes: values.notes || undefined,
    });
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <Label htmlFor="productionOrderId">Número de parte</Label>
        <select
          id="productionOrderId"
          className={selectClassName}
          {...form.register("productionOrderId", { required: true })}
        >
          <option value="">Selecciona número de parte</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.partNumber || order.number} · {order.customerName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="inspectionId">Inspección origen (opcional)</Label>
        <select id="inspectionId" className={selectClassName} {...form.register("inspectionId")}>
          <option value="">Sin inspección</option>
          {related.map((item) => (
            <option key={item.id} value={item.id}>
              {item.number}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="cause">Causa</Label>
        <Textarea id="cause" rows={2} {...form.register("cause")} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="disposition">Disposición</Label>
        <Textarea id="disposition" rows={2} {...form.register("disposition")} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" rows={2} {...form.register("notes")} />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Abrir NCR
      </Button>
    </form>
  );
}
