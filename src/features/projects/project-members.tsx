"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  attachOrderToProjectAction,
  attachQuoteToProjectAction,
  detachOrderFromProjectAction,
  detachQuoteFromProjectAction,
} from "@/server/actions/projects";

type Option = { id: string; number: string; status: string };

export function ProjectMembers({
  projectId,
  attachableQuotes,
  attachableOrders,
  canWrite,
}: {
  projectId: string;
  attachableQuotes: Option[];
  attachableOrders: Option[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
    extra: Record<string, string>,
  ) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("projectId", projectId);
    for (const [key, value] of Object.entries(extra)) formData.set(key, value);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo completar.");
      return;
    }
    router.refresh();
  }

  if (!canWrite) return null;

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          run(attachQuoteToProjectAction, {
            entityId: String(formData.get("entityId") ?? ""),
          });
        }}
      >
        <select
          name="entityId"
          required
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Asociar RFQ</option>
          {attachableQuotes.map((quote) => (
            <option key={quote.id} value={quote.id}>
              {quote.number}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={pending || attachableQuotes.length === 0}>
          Agregar RFQ
        </Button>
      </form>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          run(attachOrderToProjectAction, {
            entityId: String(formData.get("entityId") ?? ""),
          });
        }}
      >
        <select
          name="entityId"
          required
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Asociar pedido</option>
          {attachableOrders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.number}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={pending || attachableOrders.length === 0}>
          Agregar pedido
        </Button>
      </form>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DetachButton({
  projectId,
  entityId,
  kind,
}: {
  projectId: string;
  entityId: string;
  kind: "quote" | "order";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const formData = new FormData();
        formData.set("projectId", projectId);
        formData.set("entityId", entityId);
        const action =
          kind === "quote" ? detachQuoteFromProjectAction : detachOrderFromProjectAction;
        await action(formData);
        setPending(false);
        router.refresh();
      }}
    >
      Quitar
    </Button>
  );
}
