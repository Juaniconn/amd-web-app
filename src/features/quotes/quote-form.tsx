"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  QUOTE_CURRENCY_LABELS,
  type QuoteCurrency,
} from "@/lib/validation/quotes";
import {
  createQuoteAction,
  updateQuoteAction,
} from "@/server/actions/quotes";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type CustomerOption = {
  id: string;
  code: string;
  legalName: string;
  isDemo: boolean;
};

type ContactOption = {
  id: string;
  name: string;
  isPrimary: boolean;
};

type QuoteFormValues = {
  customerId: string;
  contactId: string;
  issueDate: string;
  validUntil: string;
  currency: QuoteCurrency;
  paymentTerms: string;
  leadTime: string;
  notes: string;
};

function toDateInput(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

type QuoteFormProps = {
  mode: "create" | "edit";
  quoteId?: string;
  customers: CustomerOption[];
  contactsByCustomer: Record<string, ContactOption[]>;
  defaultValues?: Partial<QuoteFormValues>;
};

export function QuoteForm({
  mode,
  quoteId,
  customers,
  contactsByCustomer,
  defaultValues,
}: QuoteFormProps) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<QuoteFormValues>({
    defaultValues: {
      customerId: "",
      contactId: "",
      issueDate: toDateInput(new Date()),
      validUntil: "",
      currency: "mxn",
      paymentTerms: "",
      leadTime: "",
      notes: "",
      ...defaultValues,
    },
  });

  const customerId = useWatch({ control: form.control, name: "customerId" });
  const contacts = useMemo(
    () => contactsByCustomer[customerId] ?? [],
    [contactsByCustomer, customerId],
  );

  async function onSubmit(values: QuoteFormValues) {
    setError(null);
    const payload = {
      customerId: values.customerId,
      contactId: values.contactId || undefined,
      issueDate: values.issueDate ? new Date(`${values.issueDate}T12:00:00`) : undefined,
      validUntil: values.validUntil ? new Date(`${values.validUntil}T23:59:59`) : null,
      currency: values.currency,
      paymentTerms: values.paymentTerms,
      leadTime: values.leadTime,
      notes: values.notes,
    };

    const result =
      mode === "create"
        ? await createQuoteAction(payload)
        : await updateQuoteAction({ ...payload, id: quoteId });

    if (result && !result.ok) {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="customerId">Cliente</Label>
          <select
            id="customerId"
            className={selectClassName}
            disabled={mode === "edit"}
            {...form.register("customerId", { required: true })}
            onChange={(event) => {
              form.setValue("customerId", event.target.value);
              form.setValue("contactId", "");
            }}
          >
            <option value="">Selecciona un cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.legalName} ({customer.code})
                {customer.isDemo ? " · DEMO" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactId">Contacto</Label>
          <select
            id="contactId"
            className={selectClassName}
            {...form.register("contactId")}
          >
            <option value="">Sin contacto</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name}
                {contact.isPrimary ? " · Principal" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <select
            id="currency"
            className={selectClassName}
            {...form.register("currency")}
          >
            {Object.entries(QUOTE_CURRENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="issueDate">Fecha</Label>
          <Input id="issueDate" type="date" {...form.register("issueDate")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validUntil">Vigencia</Label>
          <Input id="validUntil" type="date" {...form.register("validUntil")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentTerms">Condiciones de pago</Label>
          <Input id="paymentTerms" {...form.register("paymentTerms")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="leadTime">Tiempo de entrega</Label>
          <Input id="leadTime" {...form.register("leadTime")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas / solicitud RFQ</Label>
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
            ? "Crear cotización"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
