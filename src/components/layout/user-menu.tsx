"use client";

import { signOutAction } from "@/server/actions/auth";

type UserMenuProps = {
  name: string;
  email: string;
  roles: string[];
};

export function UserMenu({ name, email, roles }: UserMenuProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium text-gray-300 leading-none truncate max-w-[120px]">{name}</p>
        <p className="mt-0.5 text-[10px] text-gray-600 truncate max-w-[120px]">
          {roles.join(" · ") || email}
        </p>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-primary text-[10px] font-bold text-white shadow-md shadow-brand/20">
        {initials}
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded-xl border border-sidebar-border bg-white/[0.03] px-2.5 py-2 text-[11px] font-medium text-gray-400 transition-all hover:border-white/10 hover:bg-white/[0.06] hover:text-gray-300 sm:py-1.5"
        >
          Salir
        </button>
      </form>
    </div>
  );
}