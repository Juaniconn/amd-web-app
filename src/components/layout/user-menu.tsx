"use client";

import { signOutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

type UserMenuProps = {
  name: string;
  email: string;
  roles: string[];
};

export function UserMenu({ name, email, roles }: UserMenuProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-none">{name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {roles.join(" · ") || email}
        </p>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
