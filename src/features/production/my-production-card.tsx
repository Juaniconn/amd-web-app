"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Package,
  Play,
} from "lucide-react";
import {
  finishMyOperationAction,
  startMyOperationAction,
} from "@/server/actions/production";

export type MyOperationCard = {
  id: string;
  position: number;
  name: string;
  kind: string;
  status: "pendiente" | "en_proceso" | "terminada" | "omitida";
  startedAt: Date | null;
  workCenterName: string | null;
  machineName: string | null;
  partId: string;
  partNumberLabel: string;
  partDescription: string;
  quantity: string;
  unit: string;
  priority: string;
  promisedDate: Date;
  orderNumber: string;
  customerName: string;
  totalStepsInPart: number;
  doneStepsInPart: number;
  isUnblocked: boolean;
};

const PRIORITY_STYLES: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  compromiso_inmediato: "bg-amber-100 text-amber-700",
  programada: "bg-blue-100 text-blue-700",
  produccion_normal: "bg-gray-100 text-gray-600",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgente: "Urgente",
  compromiso_inmediato: "Compromiso",
  programada: "Programada",
  produccion_normal: "Normal",
};

function elapsed(from: Date | null) {
  if (!from) return null;
  const mins = Math.floor((Date.now() - new Date(from).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function OperationCard({ op }: { op: MyOperationCard }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [good, setGood] = useState("");
  const [scrap, setScrap] = useState("");
  const [rework, setRework] = useState("");
  const [rootCause, setRootCause] = useState("");

  const working = op.status === "en_proceso";
  const blocked = !op.isUnblocked && op.status === "pendiente";
  const progress =
    op.totalStepsInPart > 0
      ? Math.round((op.doneStepsInPart / op.totalStepsInPart) * 100)
      : 0;
  const isDelayed = new Date(op.promisedDate) < new Date();
  const time = elapsed(op.startedAt);

  const scrapN = Number(scrap) || 0;
  const reworkN = Number(rework) || 0;
  const needsCause = scrapN > 0 || reworkN > 0;

  function start() {
    setError(null);
    const fd = new FormData();
    fd.set("operationId", op.id);
    startTransition(async () => {
      const res = await startMyOperationAction(fd);
      if (!res.ok) {
        setError(res.error ?? "No se pudo iniciar el proceso.");
        return;
      }
      router.refresh();
    });
  }

  function finish() {
    setError(null);
    if (needsCause && !rootCause.trim()) {
      setError("Indica la causa raíz del scrap o retrabajo.");
      return;
    }
    const fd = new FormData();
    fd.set("operationId", op.id);
    if (good) fd.set("goodQuantity", good);
    if (scrap) fd.set("scrapQuantity", scrap);
    if (rework) fd.set("reworkQuantity", rework);
    if (rootCause.trim()) fd.set("rootCause", rootCause.trim());
    startTransition(async () => {
      const res = await finishMyOperationAction(fd);
      if (!res.ok) {
        setError(res.error ?? "No se pudo cerrar el proceso.");
        return;
      }
      setClosing(false);
      setGood("");
      setScrap("");
      setRework("");
      setRootCause("");
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm ${
        working
          ? "border-l-4 border-l-green-500"
          : blocked
            ? "opacity-60"
            : isDelayed
              ? "border-l-4 border-l-red-500"
              : ""
      }`}
    >
      {/* Proceso — lo más grande porque es lo que el operador hace */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
              {op.position}
            </span>
            <h3 className="truncate text-base font-bold leading-tight">{op.name}</h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {op.workCenterName ?? "Sin centro"}
            {op.machineName ? ` · ${op.machineName}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold ${
            PRIORITY_STYLES[op.priority] ?? PRIORITY_STYLES.produccion_normal
          }`}
        >
          {PRIORITY_LABELS[op.priority] ?? "Normal"}
        </span>
      </div>

      {/* Qué pieza */}
      <div className="mt-3 rounded-lg bg-muted/50 p-2.5">
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-sm font-semibold">
            {op.partNumberLabel}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {op.partDescription}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-xs">
          <span>
            <span className="text-muted-foreground">Cant: </span>
            <span className="font-semibold">
              {Number(op.quantity)} {op.unit}
            </span>
          </span>
          <span className={isDelayed ? "font-semibold text-red-600" : "text-muted-foreground"}>
            <Clock className="mr-0.5 inline h-3 w-3" />
            {new Date(op.promisedDate).toLocaleDateString("es-MX")}
          </span>
        </div>
      </div>

      {/* Avance de la pieza */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Avance de la pieza</span>
          <span>
            {op.doneStepsInPart}/{op.totalStepsInPart} procesos
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {working && time && (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          Trabajando desde hace {time}
        </p>
      )}

      {error && (
        <p className="mt-2 flex items-start gap-1 rounded bg-red-50 p-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      {/* Acciones */}
      {blocked ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-muted py-3 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Espera el proceso anterior
        </div>
      ) : working ? (
        closing ? (
          <div className="mt-3 space-y-2 rounded-lg border bg-muted/30 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Reporte de producción
            </p>
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-0.5">
                <span className="block text-[10px] text-muted-foreground">Buenas</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={good}
                  onChange={(e) => setGood(e.target.value)}
                  placeholder={String(Number(op.quantity))}
                  className="h-9 w-full rounded border bg-background px-2 text-sm"
                />
              </label>
              <label className="space-y-0.5">
                <span className="block text-[10px] font-medium text-red-600">Scrap</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={scrap}
                  onChange={(e) => setScrap(e.target.value)}
                  placeholder="0"
                  className={`h-9 w-full rounded border bg-background px-2 text-sm ${
                    scrapN > 0 ? "border-red-400" : ""
                  }`}
                />
              </label>
              <label className="space-y-0.5">
                <span className="block text-[10px] font-medium text-amber-600">
                  Retrabajo
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={rework}
                  onChange={(e) => setRework(e.target.value)}
                  placeholder="0"
                  className={`h-9 w-full rounded border bg-background px-2 text-sm ${
                    reworkN > 0 ? "border-amber-400" : ""
                  }`}
                />
              </label>
            </div>

            {needsCause && (
              <label className="block space-y-0.5">
                <span className="flex items-center gap-1 text-[10px] font-medium text-red-600">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Causa raíz (obligatoria)
                </span>
                <input
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="Ej. medida fuera de tolerancia, porosidad, herramienta gastada"
                  className="h-9 w-full rounded border border-red-300 bg-background px-2 text-sm"
                />
              </label>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={finish}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirmar cierre
              </button>
              <button
                onClick={() => setClosing(false)}
                disabled={isPending}
                className="rounded-lg border px-3 py-2.5 text-sm hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setClosing(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            Terminar y reportar
          </button>
        )
      ) : (
        <button
          onClick={start}
          disabled={isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Iniciar proceso
        </button>
      )}

      <Link
        href={`/production/${op.partId}`}
        className="mt-2 block text-center text-[10px] text-muted-foreground hover:underline"
      >
        Ver todos los procesos de esta pieza
      </Link>
    </div>
  );
}
