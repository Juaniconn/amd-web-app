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
import { displayMoney } from "@/lib/quotes/money";
import { workOrderNumber } from "@/lib/production/ot-number";
import { createInvoiceFromOrderAction } from "@/server/actions/billing";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type Values = {
  orderId: string;
  issueDate: string;
  paymentTerm: PaymentTerm;
  notes: string;
};

export function InvoiceFromOrderForm({
  orders,
  defaultOrderId,
}: {
  orders: { id: string; number: string; customerName: string; total: string; currency: string }[];
  defaultOrderId?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({
    defaultValues: {
      orderId: defaultOrderId ?? "",
      issueDate: "",
      paymentTerm: "net_30",
      notes: "",
    },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const result = await createInvoiceFromOrderAction({
      ...values,
      issueDate: values.issueDate || undefined,
      notes: values.notes || undefined,
    });
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <Label htmlFor="orderId">Orden de trabajo</Label>
        <select
          id="orderId"
          className={selectClassName}
          {...form.register("orderId", { required: true })}
        >
          <option value="">Selecciona orden de trabajo sin factura</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {workOrderNumber(order.number)} · {order.customerName} · {displayMoney(order.total, order.currency)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="issueDate">Fecha de emisión</Label>
          <Input id="issueDate" type="date" {...form.register("issueDate")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="paymentTerm">Condiciones de pago</Label>
          <select id="paymentTerm" className={selectClassName} {...form.register("paymentTerm")}>
            {PAYMENT_TERMS.map((term) => (
              <option key={term} value={term}>
                {PAYMENT_TERM_LABELS[term]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notas internas</Label>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </div>
      <p className="text-xs text-muted-foreground">
        Esta factura es operativa. No genera CFDI ni timbrado SAT.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Crear factura
      </Button>
    </form>
  );
}
