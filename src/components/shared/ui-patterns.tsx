import type { ReactNode } from "react";

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
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      {icon ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={`text-xl font-semibold leading-tight ${TONES[tone]}`}>{value}</p>
        {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

/** Fila de tarjetas KPI. 2 columnas ya en móvil para no apilar 4 tarjetas. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">{children}</div>
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
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card/50 px-4 py-10 text-center sm:py-14">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/**
 * Pestañas de filtro consistentes: chips dentro de una barra.
 *
 * En móvil los chips se vuelven una tira con scroll horizontal en lugar de
 * envolver en 4 líneas y empujar la tabla fuera de la pantalla.
 */
export function FilterBar({
  children,
  search,
}: {
  children: ReactNode;
  search?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="-mx-2 flex items-center gap-2 overflow-x-auto px-2 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {children}
      </div>
      {search ? <div className="sm:ml-auto">{search}</div> : null}
    </div>
  );
}
