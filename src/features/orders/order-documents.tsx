"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteOrderDocumentAction,
  uploadOrderDocumentAction,
} from "@/server/actions/orders";

type Doc = {
  id: string;
  originalName: string;
  sizeBytes: number;
};

export function OrderDocuments({
  orderId,
  documents,
  canWrite,
}: {
  orderId: string;
  documents: Doc[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
    formData: FormData,
  ) {
    setPending(true);
    setError(null);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo completar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin archivos propios del pedido. Los planos vigentes viven en la RFQ o
          en Ingeniería Liberada.
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <a
                className="font-medium underline-offset-4 hover:underline"
                href={`/api/documents/${doc.id}`}
              >
                {doc.originalName}
              </a>
              <span className="text-xs text-muted-foreground">
                {(doc.sizeBytes / 1024).toFixed(1)} KB
              </span>
              {canWrite ? (
                <form action={(formData) => run(deleteOrderDocumentAction, formData)}>
                  <input type="hidden" name="id" value={doc.id} />
                  <input type="hidden" name="orderId" value={orderId} />
                  <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                    Quitar
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <form
          className="flex flex-wrap items-end gap-3"
          action={(formData) => run(uploadOrderDocumentAction, formData)}
        >
          <input type="hidden" name="orderId" value={orderId} />
          <Input name="file" type="file" required />
          <Button type="submit" disabled={pending}>
            Subir archivo
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
