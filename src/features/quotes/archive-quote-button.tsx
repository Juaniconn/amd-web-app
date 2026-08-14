"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { archiveQuoteAction } from "@/server/actions/quotes";

export function ArchiveQuoteButton({
  quoteId,
  number,
}: {
  quoteId: string;
  number: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("id", quoteId);
    const result = await archiveQuoteAction(formData);
    setPending(false);
    if (result && !result.ok) {
      setError(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Archivar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archivar cotización</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {number} dejará de aparecer en el listado. Esta acción queda en el
          historial.
        </p>
        <form action={onSubmit} className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Archivando..." : "Archivar cotización"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
