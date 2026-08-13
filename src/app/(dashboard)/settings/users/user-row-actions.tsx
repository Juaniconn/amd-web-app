"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ROLES } from "@/lib/permissions/catalog";
import {
  deleteUserAction,
  updateUserAction,
} from "@/server/actions/auth";

type UserRowActionsProps = {
  user: {
    id: string;
    name: string;
    email: string;
    roleId: string;
  };
  currentUserId: string;
};

export function UserRowActions({ user, currentUserId }: UserRowActionsProps) {
  const isSelf = user.id === currentUserId;

  return (
    <div className="flex justify-end gap-2">
      <EditUserDialog user={user} />
      <DeleteUserDialog user={user} disabled={isSelf} />
    </div>
  );
}

function EditUserDialog({ user }: { user: UserRowActionsProps["user"] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await updateUserAction(formData);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            Los cambios se guardan en PostgreSQL. Deja la contraseña vacía para
            conservarla.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />
          <div className="space-y-2">
            <Label htmlFor={`name-${user.id}`}>Nombre</Label>
            <Input
              id={`name-${user.id}`}
              name="name"
              required
              minLength={2}
              defaultValue={user.name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`email-${user.id}`}>Correo</Label>
            <Input
              id={`email-${user.id}`}
              name="email"
              type="email"
              required
              defaultValue={user.email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`password-${user.id}`}>Nueva contraseña</Label>
            <Input
              id={`password-${user.id}`}
              name="password"
              type="password"
              minLength={8}
              placeholder="Sin cambios"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`roleId-${user.id}`}>Rol</Label>
            <select
              id={`roleId-${user.id}`}
              name="roleId"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              defaultValue={user.roleId}
              required
            >
              {Object.entries(ROLES).map(([id, role]) => (
                <option key={id} value={id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({
  user,
  disabled,
}: {
  user: UserRowActionsProps["user"];
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await deleteUserAction(formData);
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
      <DialogTrigger
        disabled={disabled}
        title={disabled ? "No puedes eliminar tu propio usuario" : "Eliminar usuario"}
        render={<Button variant="destructive" size="sm" />}
      >
        Eliminar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar usuario</DialogTitle>
          <DialogDescription>
            Se eliminará {user.name} ({user.email}) y sus sesiones. Esta acción
            no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
