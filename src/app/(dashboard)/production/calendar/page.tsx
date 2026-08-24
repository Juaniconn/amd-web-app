import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  PRODUCTION_PRIORITY_LABELS,
  type ProductionPriority,
} from "@/lib/production/catalog";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getProductionCalendar } from "@/server/services/production-schedule";

const priorityVariant: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  urgente: "destructive",
  compromiso_inmediato: "default",
  programada: "secondary",
  produccion_normal: "outline",
};

function monthShift(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export default async function ProductionCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[]; month?: string | string[] }>;
}) {
  await requirePermission(PERMISSION_IDS.productionView);
  const params = await searchParams;
  const year = Number(Array.isArray(params.year) ? params.year[0] : params.year) || undefined;
  const month = Number(Array.isArray(params.month) ? params.month[0] : params.month);

  const cal = await getProductionCalendar(
    year,
    Number.isFinite(month) && params.month !== undefined ? month : undefined,
  );
  const prevMonth = monthShift(cal.year, cal.month, -1);
  const nextMonth = monthShift(cal.year, cal.month, 1);
  const totalParts = cal.weeks.reduce(
    (acc, w) => acc + w.days.reduce((a, d) => a + (d?.parts.length ?? 0), 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Calendario de Producción</h1>
          <p className="text-xs text-muted-foreground">
            Números de parte por fecha de compromiso · {totalParts} en {cal.monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/production/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-40 text-center text-sm font-semibold">{cal.monthLabel}</span>
          <Link
            href={`/production/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link href="/production/calendar" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Hoy
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <th key={d} className="px-2 py-2 text-center font-medium">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cal.weeks.map((week, wi) => (
              <tr key={wi} className="border-b last:border-b-0">
                {week.days.map((day, di) => (
                  <td
                    key={di}
                    className={`h-24 w-1/7 align-top p-1 ${
                      day?.isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
                    } ${day?.isWeekend ? "bg-muted/40" : ""}`}
                  >
                    {day ? (
                      <>
                        <p className="px-1 text-xs text-muted-foreground">{day.day}</p>
                        <div className="space-y-0.5">
                          {day.parts.slice(0, 3).map((part) => (
                            <Link
                              key={part.id}
                              href={`/production/${part.id}`}
                              className={`block truncate rounded px-1 py-0.5 text-[10px] hover:bg-accent ${
                                part.isDelayed
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                  : "bg-muted"
                              }`}
                              title={`${part.number} — ${part.customerName}`}
                            >
                              {part.number}
                              {part.isDelayed ? " ⚠" : ""}
                            </Link>
                          ))}
                          {day.parts.length > 3 && (
                            <p className="px-1 text-[10px] text-muted-foreground">
                              +{day.parts.length - 3} más
                            </p>
                          )}
                        </div>
                      </>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cal.unscheduled.length > 0 ? (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            Sin fecha de compromiso
            <Badge variant="outline">{cal.unscheduled.length}</Badge>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {cal.unscheduled.map((part) => (
              <Link key={part.id} href={`/production/${part.id}`}>
                <Badge variant={priorityVariant[part.priority] ?? "outline"}>
                  {PRODUCTION_PRIORITY_LABELS[part.priority as ProductionPriority] ?? part.priority}{" "}
                  · {part.number}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
