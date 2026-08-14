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
import { archiveCustomerAction } from "@/server/actions/customers";

export function ArchiveCustomerButton({
  customerId,
  legalName,
}: {
  customerId: string;
  legalName: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("id", customerId);
    const result = await archiveCustomerAction(formData);
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
          <DialogTitle>Archivar cliente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {legalName} dejará de aparecer en el listado. Los contactos también se
          archivan. Esta acción queda en el historial.
        </p>
        <form action={onSubmit} className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Archivando..." : "Archivar cliente"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
