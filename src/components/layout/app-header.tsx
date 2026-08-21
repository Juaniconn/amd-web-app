"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { UserMenu } from "@/components/layout/user-menu";

type AppHeaderProps = {
  title: string;
  userName: string;
  userEmail: string;
  roles: string[];
};

export function AppHeader({
  title,
  userName,
  userEmail,
  roles,
}: AppHeaderProps) {
  const [dark, setDark] = useState(false);

  function toggleDark() {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDark}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <UserMenu name={userName} email={userEmail} roles={roles} />
      </div>
    </header>
  );
}
