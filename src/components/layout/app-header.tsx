"use client";

import { useEffect, useState } from "react";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";

type AppHeaderProps = {
  title: string;
  userName: string;
  userEmail: string;
  roles: string[];
  alertCount?: number;
  onSearch: () => void;
  onNotifications: () => void;
};

export function AppHeader({
  title,
  userName,
  userEmail,
  roles,
  alertCount = 0,
  onSearch,
  onNotifications,
}: AppHeaderProps) {
  const [dark, setDark] = useState(false);

  // Recuperar preferencia guardada
  useEffect(() => {
    const saved = localStorage.getItem("amd-theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("amd-theme", next ? "dark" : "light");
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4">
      <h1 className="text-sm font-semibold">{title}</h1>
      <div className="flex items-center gap-1">
        <button
          onClick={onSearch}
          className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          title="Buscar (⌘K)"
        >
          <Search className="h-3 w-3" />
          <span className="hidden sm:inline">Buscar</span>
          <kbd className="hidden rounded bg-muted px-1 py-0.5 text-[10px] sm:inline">⌘K</kbd>
        </button>
        <button
          onClick={toggleDark}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          title={dark ? "Modo claro" : "Modo oscuro"}
        >
          {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onNotifications}
          className="relative rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          title={alertCount > 0 ? `${alertCount} alertas` : "Sin alertas"}
        >
          <Bell className="h-3.5 w-3.5" />
          {alertCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </button>
        <UserMenu name={userName} email={userEmail} roles={roles} />
      </div>
    </header>
  );
}
