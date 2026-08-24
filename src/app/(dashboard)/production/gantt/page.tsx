import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { PRODUCTION_STATUS_LABELS, type ProductionStatus } from "@/lib/production/status";
import { getProductionGantt } from "@/server/services/production-schedule";

const DAY = 24 * 3600 * 1000;

function dayLabel(d: Date) {
  return d.getDate().toString();
}

export default async function ProductionGanttPage() {
  await requirePermission(PERMISSION_IDS.productionView);
  const { lanes, rangeStart, rangeEnd } = await getProductionGantt();

  const totalDays = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / DAY));
  // ticks cada 7 días para no saturar
  const ticks: { left: number; date: Date }[] = [];
  for (let i = 0; i <= totalDays; i += 7) {
    const d = new Date(rangeStart.getTime() + i * DAY);
    if (d.getTime() > rangeEnd.getTime()) break;
    ticks.push({ left: (i / totalDays) * 100, date: d });
  }
  const todayLeft =
    ((Date.now() - rangeStart.getTime()) / (rangeEnd.getTime() - rangeStart.getTime())) * 100;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Gantt de Producción</h1>
        <p className="text-xs text-muted-foreground">
          Barra de progreso hasta la fecha de compromiso · {lanes.length} números de parte ·{" "}
          {rangeStart.toLocaleDateString("es-MX")} → {rangeEnd.toLocaleDateString("es-MX")}
        </p>
      </div>

      {lanes.length === 0 ? (
        <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground">
          No hay números de parte activos para mostrar en el Gantt.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <div className="min-w-[860px] p-4">
            {/* Eje temporal */}
            <div className="relative mb-2 ml-56 h-5 border-b">
              {ticks.map((t, i) => (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 text-[10px] text-muted-foreground"
                  style={{ left: `${t.left}%` }}
                >
                  {dayLabel(t.date)}/{t.date.getMonth() + 1}
                </span>
              ))}
              <span
                className="absolute bottom-0 h-full w-px bg-red-500"
                style={{ left: `${Math.min(100, Math.max(0, todayLeft))}%` }}
              />
            </div>

            <div className="space-y-1.5">
              {lanes.map((lane) => (
                <div key={lane.id} className="flex items-center gap-2">
                  <div className="w-52 shrink-0 truncate text-xs">
                    <Link href={`/production/${lane.id}`} className="font-mono font-semibold hover:underline">
                      {lane.label}
                    </Link>
                    <p className="truncate text-muted-foreground">{lane.customerName}</p>
                  </div>
                  <div className="relative h-6 flex-1 rounded bg-muted">
                    {ticks.map((t, i) => (
                      <span
                        key={i}
                        className="absolute inset-y-0 w-px bg-border"
                        style={{ left: `${t.left}%` }}
                      />
                    ))}
                    {/* barra: hoy → compromiso */}
                    {(() => {
                      const startT = Math.max(
                        Date.now(),
                        rangeStart.getTime(),
                      );
                      const endT = new Date(lane.promisedDate).getTime();
                      const clampedEnd = Math.min(endT, rangeEnd.getTime());
                      let left =
                        ((startT - rangeStart.getTime()) /
                          (rangeEnd.getTime() - rangeStart.getTime())) *
                        100;
                      let width =
                        ((clampedEnd - startT) / (rangeEnd.getTime() - rangeStart.getTime())) * 100;
                      if (endT < Date.now()) {
                        // atrasada: barra desde rango inicial hasta hoy
                        left =
                          ((Math.max(endT, rangeStart.getTime()) - rangeStart.getTime()) /
                            (rangeEnd.getTime() - rangeStart.getTime())) *
                          100;
                        width =
                          ((startT - Math.max(endT, rangeStart.getTime())) /
                            (rangeEnd.getTime() - rangeStart.getTime())) *
                          100;
                      }
                      width = Math.max(width, 1.5);
                      left = Math.max(0, Math.min(99.9 - width, left));
                      return (
                        <div
                          className={`absolute top-0 flex h-6 items-center overflow-hidden rounded ${
                            lane.isDelayed
                              ? "bg-red-500/25 ring-1 ring-red-500"
                              : "bg-emerald-500/20 ring-1 ring-emerald-600/40"
                          }`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${lane.progressPercent}% · compromiso ${new Date(lane.promisedDate).toLocaleDateString("es-MX")}`}
                        >
                          <div
                            className={`h-full ${lane.isDelayed ? "bg-red-500" : "bg-emerald-600"}`}
                            style={{ width: `${lane.progressPercent}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground">
                            {lane.progressPercent}%
                          </span>
                        </div>
                      );
                    })()}
                    {/* marcador de compromiso */}
                    {(() => {
                      const left =
                        ((new Date(lane.promisedDate).getTime() - rangeStart.getTime()) /
                          (rangeEnd.getTime() - rangeStart.getTime())) *
                        100;
                      if (left < 0 || left > 100) return null;
                      return (
                        <span
                          className="absolute top-0 h-6 w-0.5 bg-foreground"
                          style={{ left: `${left}%` }}
                        />
                      );
                    })()}
                  </div>
                  <Badge
                    variant={lane.isDelayed ? "destructive" : "outline"}
                    className="w-28 justify-center shrink-0 text-[10px]"
                  >
                    {PRODUCTION_STATUS_LABELS[lane.status as ProductionStatus] ?? lane.status}
                  </Badge>
                </div>
              ))}
            </div>

            <p className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded bg-emerald-600" /> avance real
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded bg-red-500" /> atrasada
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-px bg-foreground" /> fecha de compromiso
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-px bg-red-500" /> hoy
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
