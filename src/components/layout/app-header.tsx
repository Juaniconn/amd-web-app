"use client";

import { useState } from "react";
import { Bell, Moon, Sun, Search } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";

type AppHeaderProps = {
  title: string;
  userName: string;
  userEmail: string;
  roles: string[];
  onSearch: () => void;
  onNotifications: () => void;
};

export function AppHeader({
  title,
  userName,
  userEmail,
  roles,
  onSearch,
  onNotifications,
}: AppHeaderProps) {
  const [dark, setDark] = useState(false);

  function toggleDark() {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  }

  return (
    <header className="flex h-12 items-center justify-between border-b bg-card px-4">
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="flex items-center gap-1">
        <button
          onClick={onSearch}
          className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          <Search className="h-3 w-3" />
          <span>Buscar</span>
          <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">⌘K</kbd>
        </button>
        <button
          onClick={toggleDark}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onNotifications}
          className="relative rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <UserMenu name={userName} email={userEmail} roles={roles} />
      </div>
    </header>
  );
}
