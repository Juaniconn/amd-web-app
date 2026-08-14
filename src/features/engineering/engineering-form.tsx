"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ENGINEERING_PRIORITY_LABELS,
  type EngineeringPriority,
} from "@/lib/engineering/status";
import {
  QUOTE_ENGINEERING_TYPE_LABELS,
  type QuoteEngineeringType,
} from "@/lib/quotes/rfq";
import {
  createEngineeringRequestAction,
  updateEngineeringRequestAction,
} from "@/server/actions/engineering";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type QuoteOption = {
  id: string;
  number: string;
  customerName: string;
  engineeringType: QuoteEngineeringType | null;
};

type FormValues = {
  quoteId: string;
  description: string;
  notes: string;
  projectType: QuoteEngineeringType;
  priority: EngineeringPriority;
  dueDate: string;
  assigneeUserId: string;
};

function toDateInput(value?: Date | string | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function EngineeringForm({
  mode,
  requestId,
  quotes,
  users,
  defaultValues,
}: {
  mode: "create" | "edit";
  requestId?: string;
  quotes: QuoteOption[];
  users: { id: string; name: string; email: string }[];
  defaultValues?: Partial<FormValues>;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    defaultValues: {
      quoteId: "",
      description: "",
      notes: "",
      projectType: "diseno_nuevo",
      priority: "media",
      dueDate: "",
      assigneeUserId: "",
      ...defaultValues,
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const payload = {
      quoteId: values.quoteId,
      description: values.description,
      notes: values.notes,
      projectType: values.projectType,
      priority: values.priority,
      dueDate: values.dueDate ? new Date(`${values.dueDate}T18:00:00`) : null,
      assigneeUserId: values.assigneeUserId || undefined,
    };
    const result =
      mode === "create"
        ? await createEngineeringRequestAction(payload)
        : await updateEngineeringRequestAction({ ...payload, id: requestId });
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="quoteId">RFQ</Label>
          <select
            id="quoteId"
            className={selectClassName}
            disabled={mode === "edit"}
            {...form.register("quoteId", { required: true })}
            onChange={(event) => {
              const quote = quotes.find((item) => item.id === event.target.value);
              form.setValue("quoteId", event.target.value);
              if (quote?.engineeringType) {
                form.setValue("projectType", quote.engineeringType);
              }
            }}
          >
            <option value="">Selecciona una cotización</option>
            {quotes.map((quote) => (
              <option key={quote.id} value={quote.id}>
                {quote.number} · {quote.customerName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectType">Tipo ingeniería</Label>
          <select
            id="projectType"
            className={selectClassName}
            {...form.register("projectType")}
          >
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
        <div className="space-y-2">
          <Label htmlFor="priority">Prioridad</Label>
          <select
            id="priority"
            className={selectClassName}
            {...form.register("priority")}
          >
            {(
              Object.entries(ENGINEERING_PRIORITY_LABELS) as [
                EngineeringPriority,
                string,
              ][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Fecha compromiso</Label>
          <Input id="dueDate" type="date" {...form.register("dueDate")} />
        </div>
        {mode === "create" ? (
          <div className="space-y-2">
            <Label htmlFor="assigneeUserId">Responsable</Label>
            <select
              id="assigneeUserId"
              className={selectClassName}
              {...form.register("assigneeUserId")}
            >
              <option value="">Sin asignar</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea id="description" rows={4} {...form.register("description")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Observaciones</Label>
          <Textarea id="notes" rows={3} {...form.register("notes")} />
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
            ? "Crear solicitud"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}

export function toEngineeringDateInput(value?: Date | string | null) {
  return toDateInput(value);
}
