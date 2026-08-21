import Link from "next/link";
import { NAV_ITEMS, SETTINGS_NAV_ITEMS } from "@/lib/navigation";
import { PERMISSION_IDS, type PermissionId } from "@/lib/permissions/catalog";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  pathname: string;
  permissions: PermissionId[];
};

function canSee(permission: PermissionId | undefined, permissions: PermissionId[]) {
  if (!permission) return true;
  return permissions.includes(permission);
}

const NAV_ICONS: Record<string, string> = {
  "/dashboard": "📊",
  "/customers": "👥",
  "/quotes": "💰",
  "/engineering": "🔧",
  "/orders": "📋",
  "/projects": "📁",
  "/production": "⚙️",
  "/production/kanban": "📌",
  "/tv": "📺",
  "/inventory": "📦",
  "/purchasing": "🛒",
  "/suppliers": "🏭",
  "/machines": "🔩",
  "/quality": "✅",
  "/deliveries": "🚚",
  "/billing": "🧾",
};

export function AppSidebar({ pathname, permissions }: AppSidebarProps) {
  const isOperator = permissions.includes(PERMISSION_IDS.productionView) &&
    !permissions.includes(PERMISSION_IDS.productionCreate);

  return (
    <aside
      className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex"
      suppressHydrationWarning
    >
      <div className="border-b border-sidebar-border px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            AMD
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-sidebar-foreground/60">
              AMD México
            </p>
            <p className="text-sm font-semibold tracking-tight">Operations</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {isOperator ? (
          <>
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Mi trabajo
            </p>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/my-production"
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                    pathname === "/my-production"
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <span>⚙️</span>
                  Mis tareas de hoy
                </Link>
              </li>
            </ul>
          </>
        ) : (
          <>
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Operación
            </p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const allowed = item.enabled && canSee(item.permission, permissions);
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    {allowed ? (
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <span>{NAV_ICONS[item.href] ?? "📄"}</span>
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className="flex cursor-not-allowed items-center justify-between rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/35"
                        title={`${item.label} estará disponible en ${item.phase}`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="opacity-50">{NAV_ICONS[item.href] ?? "📄"}</span>
                          {item.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide">
                          {item.phase}
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <p className="mt-6 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Sistema
        </p>
        <ul className="space-y-0.5">
          {SETTINGS_NAV_ITEMS.map((item) => {
            const allowed = item.enabled && canSee(item.permission, permissions);
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                {allowed ? (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span>{NAV_ICONS[item.href] ?? "⚙️"}</span>
                    {item.label}
                  </Link>
                ) : (
                  <span className="flex cursor-not-allowed items-center rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/35">
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
