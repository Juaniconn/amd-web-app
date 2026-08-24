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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/5 bg-[#0b0d12] px-4">
      <h1 className="text-sm font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-1">
        <button
          onClick={onSearch}
          className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs text-gray-400 transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-gray-300"
          title="Buscar (⌘K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Buscar</span>
          <kbd className="hidden rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-500 font-mono sm:inline">⌘K</kbd>
        </button>
        <button
          onClick={toggleDark}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
          title={dark ? "Modo claro" : "Modo oscuro"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={onNotifications}
          className="relative rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
          title={alertCount > 0 ? `${alertCount} alertas` : "Sin alertas"}
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </button>
        <div className="ml-1 pl-1 border-l border-white/5">
          <UserMenu name={userName} email={userEmail} roles={roles} />
        </div>
      </div>
    </header>
  );
}
