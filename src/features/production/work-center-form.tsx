"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertWorkCenterAction } from "@/server/actions/production";

export function WorkCenterForm({
  workCenter,
}: {
  workCenter?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    sortOrder: number;
    active: boolean;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = await upsertWorkCenterAction({
      id: workCenter?.id,
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      active: formData.get("active") === "on",
    });
    if (!result.ok) {
      setError(result.error ?? "No se pudo guardar.");
      return;
    }
    router.refresh();
  }

  return (
    <form action={onSubmit} className="flex flex-wrap items-end gap-2">
      <Input name="code" placeholder="código" defaultValue={workCenter?.code} required />
      <Input name="name" placeholder="nombre" defaultValue={workCenter?.name} required />
      <Input
        name="sortOrder"
        type="number"
        className="w-24"
        defaultValue={workCenter?.sortOrder ?? 0}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={workCenter?.active ?? true} />
        Activo
      </label>
      <Button type="submit" variant="outline">
        {workCenter ? "Actualizar" : "Crear centro"}
      </Button>
      {error ? (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
