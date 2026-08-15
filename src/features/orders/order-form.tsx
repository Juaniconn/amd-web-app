"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateOrderAction } from "@/server/actions/orders";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type FormValues = {
  ownerUserId: string;
  promisedDate: string;
  projectId: string;
  notes: string;
};

export function OrderForm({
  orderId,
  users,
  projects,
  defaultValues,
}: {
  orderId: string;
  users: { id: string; name: string }[];
  projects: { id: string; code: string; name: string }[];
  defaultValues?: Partial<FormValues>;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    defaultValues: {
      ownerUserId: "",
      promisedDate: "",
      projectId: "",
      notes: "",
      ...defaultValues,
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const result = await updateOrderAction({
          id: orderId,
          ownerUserId: values.ownerUserId || undefined,
          promisedDate: values.promisedDate || null,
          projectId: values.projectId || undefined,
          notes: values.notes || undefined,
        });
        if (result && !result.ok) setError(result.error);
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="promisedDate">Fecha prometida comercial</Label>
          <Input id="promisedDate" type="date" {...form.register("promisedDate")} />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="projectId">Proyecto (opcional)</Label>
          <select
            id="projectId"
            className={selectClassName}
            {...form.register("projectId")}
          >
            <option value="">Sin proyecto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} · {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="notes">Observaciones</Label>
          <Textarea id="notes" rows={4} {...form.register("notes")} />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Guardar
      </Button>
    </form>
  );
}
