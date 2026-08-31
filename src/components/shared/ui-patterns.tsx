import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "text-foreground",
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
} as const;

export type StatCardTone = keyof typeof TONES;

/** Tarjeta KPI estilo ClickUp para la fila superior de los listados. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: StatCardTone;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-all hover:shadow-md">
      {icon ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={`text-xl font-bold leading-tight ${TONES[tone]}`}>{value}</p>
        {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

/** Fila de tarjetas KPI. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
  );
}

/** Estado vacío con llamada a la acción. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-4 py-12 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Pestañas de filtro consistentes. */
export function FilterBar({
  children,
  search,
}: {
  children: ReactNode;
  search?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex items-center gap-2 overflow-x-auto px-2 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {children}
      </div>
      {search ? <div className="sm:ml-auto">{search}</div> : null}
    </div>
  );
}

/** Premium card wrapper */
export function PremiumCard({
  children,
  className,
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <div
      className={cn("card-premium", className)}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {children}
    </div>
  );
}

/** Premium table components */
export function PremiumTable({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-border">{children}</div>;
}

export function PremiumTableHeader({ children }: { children: ReactNode }) {
  return <div className="grid bg-muted/50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>;
}

export function PremiumTableTh({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return <div className={cn("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", align === "right" && "text-right")}>{children}</div>;
}

export function PremiumTableBody({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border">{children}</div>;
}

export function PremiumTableRow({ children, onClick, index = 0 }: { children: ReactNode; onClick?: () => void; index?: number }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "grid items-center px-4 py-3 transition-colors hover:bg-muted/30",
        onClick && "cursor-pointer"
      )}
    >
      {children}
    </div>
  );
}

export function PremiumTableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-sm", className)}>{children}</div>;
}

/** Skeleton loader */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-muted", className)} />
  );
}