"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  canTransitionQuote,
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
} from "@/lib/quotes/status";
import {
  changeQuoteStatusAction,
  convertQuoteToOrderAction,
  duplicateQuoteAction,
} from "@/server/actions/quotes";

const ACTIONS: { status: QuoteStatus; label: string }[] = [
  { status: "en_revision", label: "Enviar a revisión" },
  { status: "borrador", label: "Devolver a borrador" },
  { status: "enviada", label: "Marcar enviada" },
  { status: "aprobada", label: "Marcar aprobada" },
  { status: "rechazada", label: "Marcar rechazada" },
  { status: "expirada", label: "Marcar expirada" },
];

export function QuoteStatusActions({
  quoteId,
  status,
  requiresEngineering,
  engineeringStatus,
}: {
  quoteId: string;
  status: QuoteStatus;
  requiresEngineering: boolean;
  engineeringStatus: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string } | void>,
    extra?: Record<string, string>,
  ) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", quoteId);
    if (extra) {
      for (const [key, value] of Object.entries(extra)) formData.set(key, value);
    }
    const result = await action(formData);
    setPending(false);
    if (result && !result.ok) {
      setError(result.error ?? "No se pudo actualizar.");
      return;
    }
    router.refresh();
  }

  const available = ACTIONS.filter((item) => canTransitionQuote(status, item.status));

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((item) => (
        <Button
          key={item.status}
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => run(changeQuoteStatusAction, { status: item.status })}
        >
          {item.label}
        </Button>
      ))}
      {canTransitionQuote(status, "convertida") ? (
        <Button
          type="button"
          disabled={pending || (requiresEngineering && engineeringStatus !== "liberada")}
          onClick={() => run(convertQuoteToOrderAction)}
        >
          Convertir en orden de trabajo
        </Button>
      ) : null}
      {canTransitionQuote(status, "convertida") &&
      !(requiresEngineering && engineeringStatus !== "liberada") ? (
        <p className="w-full text-sm text-muted-foreground">
          Al convertir se crea la orden de trabajo y un número de parte por cada partida de
          fabricación. El número de plano queda como ID de cada partida.
        </p>
      ) : null}
      {canTransitionQuote(status, "convertida") &&
      requiresEngineering &&
      engineeringStatus !== "liberada" ? (
        <p className="w-full text-sm text-muted-foreground">
          Esta RFQ requiere ingeniería liberada antes de convertir a orden de trabajo.
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => run(duplicateQuoteAction)}
      >
        Duplicar
      </Button>
      {error ? (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {available.length === 0 && status !== "aprobada" ? (
        <p className="text-sm text-muted-foreground">
          Estado actual: {QUOTE_STATUS_LABELS[status]}.
        </p>
      ) : null}
    </div>
  );
}
