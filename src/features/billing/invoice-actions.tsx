"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelInvoiceAction, issueInvoiceAction } from "@/server/actions/billing";

export function InvoiceActions({
  invoiceId,
  status,
  canWrite,
}: {
  invoiceId: string;
  status: string;
  canWrite: boolean;
  canPay?: boolean;
  currency?: string;
  balance?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function runStatus(action: "issue" | "cancel") {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("id", invoiceId);
    const result =
      action === "issue"
        ? await issueInvoiceAction(formData)
        : await cancelInvoiceAction(formData);
    setPending(false);
    if (result && !result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Este ERP no emite CFDI. CONTPAQi factura. Aquí solo se marca el folio como
        enviado al cliente.
      </p>
      <div className="flex flex-wrap gap-2">
        {canWrite && status === "borrador" ? (
          <Button type="button" disabled={pending} onClick={() => runStatus("issue")}>
            Marcar enviada al cliente
          </Button>
        ) : null}
        {canWrite && status !== "pagada" && status !== "cancelada" && status !== "emitida" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => runStatus("cancel")}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
