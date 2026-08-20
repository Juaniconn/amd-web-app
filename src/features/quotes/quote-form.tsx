"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBranchAddress } from "@/lib/branches/catalog";
import {
  ADDRESSEE_MODE_LABELS,
  PAYMENT_TERM_LABELS,
  formatShippingAddress,
  type AddresseeMode,
  type PaymentTerm,
} from "@/lib/quotes/commercial";
import {
  QUOTE_ENGINEERING_TYPE_LABELS,
  RFQ_TYPE_LABELS,
  defaultEngineeringType,
  rfqTypeForcesEngineering,
  type QuoteEngineeringType,
  type RfqType,
} from "@/lib/quotes/rfq";
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
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPostalCode?: string | null;
  shippingCountry?: string | null;
  shippingSameAsBilling?: boolean;
};

type ContactOption = {
  id: string;
  name: string;
  isPrimary: boolean;
  title?: string | null;
  department?: string | null;
  phone?: string | null;
};

type BranchOption = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  rfc: string | null;
};

type QuoteFormValues = {
  customerId: string;
  contactId: string;
  branchId: string;
  addresseeMode: AddresseeMode;
  issueDate: string;
  validUntil: string;
  currency: QuoteCurrency;
  paymentTerm: PaymentTerm;
  leadTime: string;
  notes: string;
  rfqType: RfqType;
  requiresEngineering: boolean;
  engineeringType: QuoteEngineeringType | "";
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
  branches: BranchOption[];
  defaultValues?: Partial<QuoteFormValues>;
};

export function QuoteForm({
  mode,
  quoteId,
  customers,
  contactsByCustomer,
  branches,
  defaultValues,
}: QuoteFormProps) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<QuoteFormValues>({
    defaultValues: {
      customerId: "",
      contactId: "",
      branchId: branches.find((branch) => branch.code === "CJS")?.id ?? branches[0]?.id ?? "",
      addresseeMode: "nombre",
      issueDate: toDateInput(new Date()),
      validUntil: "",
      currency: "mxn",
      paymentTerm: "net_30",
      leadTime: "",
      notes: "",
      rfqType: "solo_fabricacion",
      requiresEngineering: false,
      engineeringType: "",
      ...defaultValues,
    },
  });

  const customerId = useWatch({ control: form.control, name: "customerId" });
  const contactId = useWatch({ control: form.control, name: "contactId" });
  const branchId = useWatch({ control: form.control, name: "branchId" });
  const addresseeMode = useWatch({ control: form.control, name: "addresseeMode" });
  const rfqType = useWatch({ control: form.control, name: "rfqType" });
  const requiresEngineering = useWatch({
    control: form.control,
    name: "requiresEngineering",
  });
  const contacts = useMemo(
    () => contactsByCustomer[customerId] ?? [],
    [contactsByCustomer, customerId],
  );
  const customer = customers.find((item) => item.id === customerId);
  const contact = contacts.find((item) => item.id === contactId);
  const branch = branches.find((item) => item.id === branchId);
  const forced = rfqTypeForcesEngineering(rfqType);
  const showEngineeringType = forced || requiresEngineering;
  const shippingLabel = customer
    ? formatShippingAddress(customer) || "Sin dirección de envío. Edita el cliente."
    : "Selecciona un cliente para ver la dirección de envío.";

  async function onSubmit(values: QuoteFormValues) {
    setError(null);
    const payload = {
      customerId: values.customerId,
      contactId: values.contactId || undefined,
      branchId: values.branchId,
      addresseeMode: values.addresseeMode,
      issueDate: values.issueDate ? new Date(`${values.issueDate}T12:00:00`) : undefined,
      validUntil: values.validUntil ? new Date(`${values.validUntil}T23:59:59`) : null,
      currency: values.currency,
      paymentTerm: values.paymentTerm,
      leadTime: values.leadTime,
      notes: values.notes,
      rfqType: values.rfqType,
      requiresEngineering: rfqTypeForcesEngineering(values.rfqType),
      engineeringType: values.engineeringType || null,
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
            {customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.legalName} ({item.code})
                {item.isDemo ? " · DEMO" : ""}
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
            {contacts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isPrimary ? " · Principal" : ""}
                {item.phone ? ` · ${item.phone}` : ""}
              </option>
            ))}
          </select>
          {contact?.phone ? (
            <p className="text-xs text-muted-foreground">
              Teléfono del contacto: {contact.phone}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="addresseeMode">Destinatario en la cotización</Label>
          <select
            id="addresseeMode"
            className={selectClassName}
            {...form.register("addresseeMode")}
          >
            {(Object.entries(ADDRESSEE_MODE_LABELS) as [AddresseeMode, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
          {addresseeMode === "departamento" ? (
            <p className="text-xs text-muted-foreground">
              Se usará {contact?.department || contact?.title || "el departamento o cargo del contacto"}.
            </p>
          ) : null}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="branchId">Sucursal que cotiza</Label>
          <select
            id="branchId"
            className={selectClassName}
            {...form.register("branchId", { required: true })}
          >
            <option value="">Selecciona sucursal</option>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {item.name}
              </option>
            ))}
          </select>
          {branch ? (
            <p className="text-xs text-muted-foreground">
              {[formatBranchAddress(branch), branch.phone, branch.email, branch.rfc]
                .filter(Boolean)
                .join(" · ") || "Captura dirección, teléfono y RFC de la sucursal en Sistema."}
            </p>
          ) : null}
        </div>
        <div className="space-y-2 md:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dirección de envío del cliente
          </p>
          <p className="text-sm">{shippingLabel}</p>
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
          <Label htmlFor="rfqType">Tipo de RFQ</Label>
          <select
            id="rfqType"
            className={selectClassName}
            {...form.register("rfqType")}
            onChange={(event) => {
              const next = event.target.value as RfqType;
              form.setValue("rfqType", next);
              const needs = rfqTypeForcesEngineering(next);
              form.setValue("requiresEngineering", needs);
              form.setValue("engineeringType", defaultEngineeringType(next) ?? "");
            }}
          >
            {(Object.entries(RFQ_TYPE_LABELS) as [RfqType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>
        {rfqType === "solo_fabricacion" ? (
          <p className="text-sm text-muted-foreground md:col-span-2">
            Solo fabricación: ingeniería queda bloqueada. El cliente manda el plano
            por correo; en la cotización se suben PDF (o un ZIP) y el agente arma
            el preliminar de mercado.
          </p>
        ) : (
        <div className="space-y-2">
          <Label htmlFor="requiresEngineering">Requiere ingeniería</Label>
          <select
            id="requiresEngineering"
            className={selectClassName}
            disabled={forced}
            value={forced || requiresEngineering ? "si" : "no"}
            onChange={(event) => {
              const yes = event.target.value === "si";
              form.setValue("requiresEngineering", yes);
              if (!yes) form.setValue("engineeringType", "");
              if (yes && !form.getValues("engineeringType")) {
                form.setValue("engineeringType", "manufacturabilidad");
              }
            }}
          >
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </div>
        )}
        {showEngineeringType ? (
          <div className="space-y-2">
            <Label htmlFor="engineeringType">Tipo de ingeniería</Label>
            <select
              id="engineeringType"
              className={selectClassName}
              {...form.register("engineeringType", { required: showEngineeringType })}
            >
              <option value="">Selecciona</option>
              {(
                Object.entries(QUOTE_ENGINEERING_TYPE_LABELS) as [
                  QuoteEngineeringType,
                  string,
                ][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="issueDate">Fecha</Label>
          <Input id="issueDate" type="date" {...form.register("issueDate")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validUntil">Vigencia</Label>
          <Input id="validUntil" type="date" {...form.register("validUntil")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentTerm">Condiciones de pago</Label>
          <select
            id="paymentTerm"
            className={selectClassName}
            {...form.register("paymentTerm")}
          >
            {(Object.entries(PAYMENT_TERM_LABELS) as [PaymentTerm, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
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
