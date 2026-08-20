"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { displayMoney } from "@/lib/quotes/money";
import {
  previewGrandTotal,
  scalePreviewItem,
  type QuoteAgentPreview,
} from "@/lib/quotes/market-preview";
import {
  newConsoleLineId,
  readSseJson,
  type QuoteAgentWireEvent,
} from "@/lib/quotes/agent-console";
import {
  confirmQuoteAgentPreviewAction,
  discardQuoteAgentPreviewAction,
  materializeQuoteItemsFromEngineeringAction,
  updateQuoteAgentPreviewQtyAction,
} from "@/server/actions/quotes";
import {
  applyConsoleEvent,
  QuoteAgentConsole,
  type QuoteAgentChatLine,
} from "@/features/quotes/quote-agent-console";

export function QuoteDrawingIntake({
  quoteId,
  canWrite,
  variant,
  currency,
  preview,
}: {
  quoteId: string;
  canWrite: boolean;
  variant: "solo_fabricacion" | "ingenieria";
  currency: string;
  preview?: QuoteAgentPreview | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [localPreview, setLocalPreview] = useState<QuoteAgentPreview | null>(preview ?? null);
  const [lines, setLines] = useState<QuoteAgentChatLine[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    setLocalPreview(preview ?? null);
  }, [preview]);

  useEffect(() => {
    if (!pending) return;
    const tick = () => {
      if (startedAt.current) setElapsedMs(Date.now() - startedAt.current);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [pending]);

  const shown = localPreview ?? preview ?? null;
  const total = useMemo(
    () => (shown ? previewGrandTotal(shown.items) : 0),
    [shown],
  );

  if (!canWrite) return null;

  function pushEvent(event: QuoteAgentWireEvent) {
    if (event.kind === "error") {
      setError(event.message);
    }
    if (event.kind === "done") {
      setLocalPreview(event.preview);
    }
    setLines((current) => {
      try {
        return applyConsoleEvent(current, event);
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "No se pudo actualizar la consola.";
        return [...current, { id: newConsoleLineId(), role: "system", text: message }];
      }
    });
  }

  async function onCalculate(formData: FormData) {
    const files = formData.getAll("files").filter(
      (file) => file instanceof File && file.size > 0,
    );
    if (files.length === 0 && !shown) {
      setError("Sube el plano PDF o un ZIP de PDF.");
      return;
    }
    if (files.length === 0) return;

    setPending(true);
    setError(null);
    setLocalPreview(null);
    setLines([]);
    startedAt.current = Date.now();
    setElapsedMs(0);

    const body = new FormData();
    for (const file of files) {
      if (file instanceof File) body.append("files", file);
    }

    try {
      const response = await fetch(`/api/quotes/${quoteId}/agent-preview`, {
        method: "POST",
        body,
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "No se pudo calcular el preliminar.");
      }
      await readSseJson(response, pushEvent);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "No se pudo calcular el preliminar.";
      setError(message);
      setLines((current) => [
        ...current,
        { id: newConsoleLineId(), role: "system", text: message },
      ]);
    } finally {
      setPending(false);
    }
  }

  async function onQty(itemId: string, quantity: number, persist: boolean) {
    setLocalPreview((current) => {
      const base = current ?? preview ?? null;
      if (!base) return current;
      return {
        ...base,
        items: base.items.map((item) =>
          item.id === itemId ? scalePreviewItem(item, quantity, base.rates) : item,
        ),
      };
    });
    if (!persist) return;
    const formData = new FormData();
    formData.set("quoteId", quoteId);
    formData.set("itemId", itemId);
    formData.set("quantity", String(quantity));
    const result = await updateQuoteAgentPreviewQtyAction(formData);
    if (!result.ok) {
      setError(result.error ?? "No se pudo actualizar la cantidad.");
    }
  }

  async function onConfirm() {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("quoteId", quoteId);
    const result = await confirmQuoteAgentPreviewAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudieron crear las partidas.");
      return;
    }
    setLocalPreview(null);
    setLines([]);
    router.refresh();
  }

  async function onDiscard() {
    setPending(true);
    const formData = new FormData();
    formData.set("quoteId", quoteId);
    await discardQuoteAgentPreviewAction(formData);
    setLocalPreview(null);
    setLines([]);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-medium">
          {variant === "solo_fabricacion"
            ? "Planos del cliente · preliminar de mercado"
            : "Generar preliminar desde PDF"}
        </p>
        <p className="text-xs text-muted-foreground">
          Sube PDF (varios) o un ZIP. El agente lee los planos en vivo en la consola y,
          al terminar, arma material, procesos y costos de mercado. La cantidad se ajusta
          aquí; no hace falta volver a calcular.
        </p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onCalculate(new FormData(event.currentTarget));
        }}
      >
        <input type="hidden" name="quoteId" value={quoteId} />
        <div className="space-y-1">
          <Label htmlFor={`intake-files-${quoteId}`}>PDF o ZIP</Label>
          <Input
            id={`intake-files-${quoteId}`}
            name="files"
            type="file"
            accept=".pdf,.zip"
            multiple
            required={!shown}
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Leyendo planos…" : "Calcular preliminar"}
        </Button>
      </form>

      <QuoteAgentConsole
        lines={lines}
        pending={pending && !shown}
        elapsedMs={elapsedMs}
        collapseWhenIdle={Boolean(shown)}
      />

      {shown ? (
        <div className="space-y-3 rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">{shown.note}</p>
          <ul className="space-y-3">
            {shown.items.map((item) => (
              <li key={item.id} className="grid gap-2 sm:grid-cols-6 sm:items-end">
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.costing.material} · {item.sourceFile}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`qty-${item.id}`}>Cantidad</Label>
                  <Input
                    id={`qty-${item.id}`}
                    type="number"
                    min={1}
                    step={1}
                    value={item.costing.quantity ?? 1}
                    disabled={pending}
                    onChange={(event) => {
                      const qty = Math.max(1, Number(event.target.value || 1));
                      void onQty(item.id, qty, false);
                    }}
                    onBlur={(event) => {
                      const qty = Math.max(1, Number(event.target.value || 1));
                      void onQty(item.id, qty, true);
                    }}
                  />
                </div>
                <p className="text-sm">
                  Unitario {displayMoney(item.costing.breakdown?.unit_price, currency)}
                </p>
                <p className="text-sm font-medium sm:col-span-2">
                  Lote {displayMoney(item.costing.breakdown?.total, currency)}
                </p>
                {(item.costing.processes?.length ?? 0) > 0 ? (
                  <p className="text-xs text-muted-foreground sm:col-span-6">
                    Procesos: {item.costing.processes?.map((step) => step.name).join(" → ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium">
            Total preliminar {displayMoney(total, currency)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onConfirm()} disabled={pending}>
              Confirmar partidas
            </Button>
            <Button type="button" variant="outline" onClick={() => void onDiscard()} disabled={pending}>
              Descartar
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function GenerateEngineeringPartidasButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-2"
      action={async (formData) => {
        setPending(true);
        setError(null);
        const result = await materializeQuoteItemsFromEngineeringAction(formData);
        setPending(false);
        if (!result.ok) {
          setError(result.error ?? "No se pudieron generar las partidas.");
          return;
        }
        router.refresh();
      }}
    >
      <input type="hidden" name="id" value={quoteId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Generar partidas desde planos
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
