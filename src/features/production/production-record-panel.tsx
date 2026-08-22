import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cog,
  Trash2,
  User,
  Wrench,
} from "lucide-react";

type MachineLog = {
  id: string;
  machineName: string;
  operationName: string | null;
  operatorName: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
};

type LaborLog = {
  id: string;
  operationName: string | null;
  operatorName: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
};

type ReworkLog = {
  id: string;
  quantity: string;
  scrapQuantity: string;
  rootCause: string;
  laborHours: string;
  machineHours: string;
  qualityReleased: boolean;
  qualityReleasedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  createdByName: string | null;
};

export type ProductionRecord = {
  machineLogs: MachineLog[];
  laborLogs: LaborLog[];
  reworkLogs: ReworkLog[];
  totals: {
    machineMinutes: number;
    laborMinutes: number;
    machineHours: number;
    laborHours: number;
    totalScrap: number;
    totalRework: number;
    openReworks: number;
  };
};

function fmtDuration(mins: number | null) {
  if (mins === null) return "en curso";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDateTime(d: Date) {
  return new Date(d).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProductionRecordPanel({ record }: { record: ProductionRecord }) {
  const { machineLogs, laborLogs, reworkLogs, totals } = record;
  const isEmpty =
    machineLogs.length === 0 && laborLogs.length === 0 && reworkLogs.length === 0;

  return (
    <div className="space-y-4">
      {/* Totales */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Cog className="h-3 w-3" />
            Horas máquina
          </div>
          <p className="text-lg font-bold">{totals.machineHours}</p>
        </div>
        <div className="rounded-lg border bg-card p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <User className="h-3 w-3" />
            Horas hombre
          </div>
          <p className="text-lg font-bold">{totals.laborHours}</p>
        </div>
        <div
          className={`rounded-lg border p-2.5 ${
            totals.totalScrap > 0 ? "border-red-200 bg-red-50/50" : "bg-card"
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Trash2 className="h-3 w-3" />
            Scrap
          </div>
          <p
            className={`text-lg font-bold ${totals.totalScrap > 0 ? "text-red-600" : ""}`}
          >
            {totals.totalScrap}
          </p>
        </div>
        <div
          className={`rounded-lg border p-2.5 ${
            totals.openReworks > 0 ? "border-amber-200 bg-amber-50/50" : "bg-card"
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Wrench className="h-3 w-3" />
            Retrabajo
          </div>
          <p
            className={`text-lg font-bold ${totals.openReworks > 0 ? "text-amber-600" : ""}`}
          >
            {totals.totalRework}
          </p>
          {totals.openReworks > 0 && (
            <p className="text-[9px] text-amber-700">
              {totals.openReworks} sin liberar
            </p>
          )}
        </div>
      </div>

      {isEmpty && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin registros de maquinado, scrap o retrabajo todavía.
        </p>
      )}

      {/* Scrap y retrabajo */}
      {reworkLogs.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Scrap y retrabajo reportado
          </h4>
          {reworkLogs.map((r) => {
            const scrapQty = Number(r.scrapQuantity);
            const reworkQty = Number(r.quantity);
            return (
              <div
                key={r.id}
                className={`rounded-lg border border-l-4 p-2.5 ${
                  r.qualityReleased
                    ? "border-l-green-500 bg-green-50/30"
                    : scrapQty > 0
                      ? "border-l-red-500 bg-red-50/30"
                      : "border-l-amber-500 bg-amber-50/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {scrapQty > 0 && (
                        <span className="font-semibold text-red-700">
                          {scrapQty} scrap
                        </span>
                      )}
                      {reworkQty > 0 && (
                        <span className="font-semibold text-amber-700">
                          {reworkQty} retrabajo
                        </span>
                      )}
                      {r.qualityReleased ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-700">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Liberado por calidad
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-amber-700">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Pendiente de liberar
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs">{r.rootCause}</p>
                    {r.notes && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {r.notes}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-[10px] text-muted-foreground">
                    <p>{fmtDateTime(r.createdAt)}</p>
                    {r.createdByName && <p>{r.createdByName}</p>}
                    {(Number(r.laborHours) > 0 || Number(r.machineHours) > 0) && (
                      <p className="mt-0.5">
                        {Number(r.laborHours)}h hombre · {Number(r.machineHours)}h máq
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Maquinado */}
      {machineLogs.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Registro de maquinado
          </h4>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">Máquina</th>
                  <th className="px-2 py-1.5 text-left">Proceso</th>
                  <th className="px-2 py-1.5 text-left">Operador</th>
                  <th className="px-2 py-1.5 text-left">Inicio</th>
                  <th className="px-2 py-1.5 text-right">Duración</th>
                </tr>
              </thead>
              <tbody>
                {machineLogs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-2 py-1.5 font-medium">{l.machineName}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {l.operationName ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {l.operatorName ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {fmtDateTime(l.startedAt)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {l.endedAt === null ? (
                        <span className="flex items-center justify-end gap-1 text-green-600">
                          <Clock className="h-2.5 w-2.5" />
                          en curso
                        </span>
                      ) : (
                        fmtDuration(l.durationMinutes)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Horas hombre */}
      {laborLogs.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Horas hombre
          </h4>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">Operador</th>
                  <th className="px-2 py-1.5 text-left">Proceso</th>
                  <th className="px-2 py-1.5 text-left">Inicio</th>
                  <th className="px-2 py-1.5 text-right">Duración</th>
                </tr>
              </thead>
              <tbody>
                {laborLogs.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-2 py-1.5 font-medium">{l.operatorName}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {l.operationName ?? "—"}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {fmtDateTime(l.startedAt)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {l.endedAt === null ? (
                        <span className="flex items-center justify-end gap-1 text-green-600">
                          <Clock className="h-2.5 w-2.5" />
                          en curso
                        </span>
                      ) : (
                        fmtDuration(l.durationMinutes)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
