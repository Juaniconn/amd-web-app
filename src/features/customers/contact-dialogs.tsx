"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  archiveContactAction,
  createContactAction,
  setPrimaryContactAction,
  updateContactAction,
} from "@/server/actions/customers";

type Contact = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  department: string | null;
  isPrimary: boolean;
  notes: string | null;
};

function ContactFields({ contact }: { contact?: Contact }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" required minLength={2} defaultValue={contact?.name} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Cargo</Label>
          <Input id="title" name="title" defaultValue={contact?.title ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Input
            id="department"
            name="department"
            defaultValue={contact?.department ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={contact?.email ?? ""}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" defaultValue={contact?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            defaultValue={contact?.whatsapp ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" defaultValue={contact?.notes ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPrimary"
          defaultChecked={contact?.isPrimary}
        />
        Contacto principal
      </label>
    </div>
  );
}

export function CreateContactDialog({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("customerId", customerId);
    const result = await createContactAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Nuevo contacto</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar contacto</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <ContactFields />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Guardando..." : "Agregar contacto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ContactRowActions({
  customerId,
  contact,
}: {
  customerId: string;
  contact: Contact;
}) {
  return (
    <div className="flex justify-end gap-2">
      {!contact.isPrimary ? (
        <SetPrimaryButton customerId={customerId} contactId={contact.id} />
      ) : null}
      <EditContactDialog customerId={customerId} contact={contact} />
      <ArchiveContactDialog customerId={customerId} contact={contact} />
    </div>
  );
}

function SetPrimaryButton({
  customerId,
  contactId,
}: {
  customerId: string;
  contactId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    formData.set("id", contactId);
    formData.set("customerId", customerId);
    await setPrimaryContactAction(formData);
    setPending(false);
    router.refresh();
  }

  return (
    <form action={onSubmit}>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Principal
      </Button>
    </form>
  );
}

function EditContactDialog({
  customerId,
  contact,
}: {
  customerId: string;
  contact: Contact;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("id", contact.id);
    formData.set("customerId", customerId);
    const result = await updateContactAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Editar
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar contacto</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <ContactFields contact={contact} />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveContactDialog({
  customerId,
  contact,
}: {
  customerId: string;
  contact: Contact;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("id", contact.id);
    formData.set("customerId", customerId);
    const result = await archiveContactAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        Archivar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archivar contacto</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Se archivará {contact.name}. Si es el principal, se promoverá otro
          contacto activo.
        </p>
        <form action={onSubmit} className="space-y-4">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="destructive" disabled={pending}>
            {pending ? "Archivando..." : "Archivar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
