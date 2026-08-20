"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  INSPECTION_RESULT_LABELS,
  INSPECTION_TYPE_LABELS,
  type InspectionResult,
  type InspectionType,
} from "@/lib/quality/catalog";
import { createInspectionAction } from "@/server/actions/quality";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type Values = {
  productionOrderId: string;
  type: InspectionType;
  inspectedAt: string;
  partNumber: string;
  qtyInspected: string;
  qtyAccepted: string;
  qtyRejected: string;
  result: InspectionResult;
  notes: string;
};

export function InspectionForm({
  orders,
  defaultProductionOrderId,
}: {
  orders: { id: string; number: string; partNumber: string | null; customerName: string }[];
  defaultProductionOrderId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    defaultValues: {
      productionOrderId: defaultProductionOrderId ?? "",
      type: "final",
      inspectedAt: "",
      partNumber: "",
      qtyInspected: "1",
      qtyAccepted: "1",
      qtyRejected: "0",
      result: "aprobado",
      notes: "",
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const result = await createInspectionAction({
      ...values,
      inspectedAt: values.inspectedAt || undefined,
      partNumber: values.partNumber || undefined,
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="type">Tipo</Label>
          <select id="type" className={selectClassName} {...form.register("type")}>
            {Object.entries(INSPECTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="result">Resultado</Label>
          <select id="result" className={selectClassName} {...form.register("result")}>
            {Object.entries(INSPECTION_RESULT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="inspectedAt">Fecha</Label>
          <Input id="inspectedAt" type="datetime-local" {...form.register("inspectedAt")} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="partNumber">No. de parte</Label>
          <Input id="partNumber" {...form.register("partNumber")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qtyInspected">Inspeccionadas</Label>
          <Input id="qtyInspected" type="number" min="1" step="1" {...form.register("qtyInspected")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qtyAccepted">Aceptadas</Label>
          <Input id="qtyAccepted" type="number" min="0" step="1" {...form.register("qtyAccepted")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="qtyRejected">Rechazadas</Label>
          <Input id="qtyRejected" type="number" min="0" step="1" {...form.register("qtyRejected")} />
        </div>
      </div>
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
        Registrar inspección
      </Button>
    </form>
  );
}
