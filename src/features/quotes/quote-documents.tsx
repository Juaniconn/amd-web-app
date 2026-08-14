"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteQuoteDocumentAction,
  uploadQuoteDocumentAction,
} from "@/server/actions/quotes";

type QuoteDocument = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export function QuoteDocuments({
  quoteId,
  documents,
  canWrite,
}: {
  quoteId: string;
  documents: QuoteDocument[];
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
          Sin archivos. Se pueden adjuntar PDF, Excel, Word, planos CAD e imágenes.
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
                <form action={(formData) => run(deleteQuoteDocumentAction, formData)}>
                  <input type="hidden" name="id" value={doc.id} />
                  <input type="hidden" name="quoteId" value={quoteId} />
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
          action={(formData) => run(uploadQuoteDocumentAction, formData)}
        >
          <input type="hidden" name="quoteId" value={quoteId} />
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
