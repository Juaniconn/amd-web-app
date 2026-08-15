"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProjectAction,
  updateProjectAction,
} from "@/server/actions/projects";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type FormValues = {
  name: string;
  customerId: string;
  description: string;
  ownerUserId: string;
  startDate: string;
  estimatedEndDate: string;
  notes: string;
};

export function ProjectForm({
  mode,
  projectId,
  customers,
  users,
  defaultValues,
}: {
  mode: "create" | "edit";
  projectId?: string;
  customers: { id: string; legalName: string; code: string }[];
  users: { id: string; name: string }[];
  defaultValues?: Partial<FormValues>;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      customerId: "",
      description: "",
      ownerUserId: "",
      startDate: "",
      estimatedEndDate: "",
      notes: "",
      ...defaultValues,
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const payload = {
          name: values.name,
          customerId: values.customerId,
          description: values.description || undefined,
          ownerUserId: values.ownerUserId || undefined,
          startDate: values.startDate || null,
          estimatedEndDate: values.estimatedEndDate || null,
          notes: values.notes || undefined,
        };
        const result =
          mode === "create"
            ? await createProjectAction(payload)
            : await updateProjectAction({ ...payload, id: projectId });
        if (result && !result.ok) setError(result.error);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" required {...form.register("name")} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="customerId">Cliente</Label>
          <select
            id="customerId"
            className={selectClassName}
            disabled={mode === "edit"}
            required
            {...form.register("customerId")}
          >
            <option value="">Selecciona cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.legalName} · {customer.code}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ownerUserId">Responsable</Label>
          <select
            id="ownerUserId"
            className={selectClassName}
            {...form.register("ownerUserId")}
          >
            <option value="">Sin asignar</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="startDate">Fecha inicio</Label>
          <Input id="startDate" type="date" {...form.register("startDate")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="estimatedEndDate">Fecha fin estimada</Label>
          <Input
            id="estimatedEndDate"
            type="date"
            {...form.register("estimatedEndDate")}
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea id="description" rows={3} {...form.register("description")} />
        </div>
        <div className="space-y-1 sm:col-span-2">
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
        {mode === "create" ? "Crear proyecto" : "Guardar"}
      </Button>
    </form>
  );
}
