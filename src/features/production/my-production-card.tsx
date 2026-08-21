"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PRODUCTION_PRIORITY_LABELS,
  PRODUCTION_PRIORITY_RANK,
  type ProductionPriority,
} from "@/lib/production/catalog";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";
import { startMachineHoursAction } from "@/server/actions/production";

const priorityVariant: Record<ProductionPriority, "destructive" | "default" | "secondary" | "outline"> = {
  urgente: "destructive",
  compromiso_inmediato: "default",
  programada: "secondary",
  produccion_normal: "outline",
};

export type MyTask = {
  id: string;
  number: string;
  description: string;
  partNumber: string | null;
  quantity: string;
  unit: string;
  priority: ProductionPriority;
  status: ProductionStatus;
  orderNumber: string;
  customerName: string;
  workCenterName: string | null;
  machineName: string | null;
  machineKind: string | null;
  promisedDate: Date;
  operationsTotal: number;
  operationsDone: number;
};

export function MyProductionCard({ task }: { task: MyTask }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const isWorking = task.status === "en_produccion";
  const progress = task.operationsTotal > 0
    ? Math.round((task.operationsDone / task.operationsTotal) * 100)
    : 0;

  async function handleStart() {
    setPending(true);
    const formData = new FormData();
    formData.set("productionOrderId", task.id);
    await startMachineHoursAction(formData);
    setPending(false);
    router.refresh();
  }

  return (
    <Card className={`overflow-hidden ${isWorking ? "border-l-4 border-l-green-500" : ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-lg font-bold tracking-tight">{task.number}</h3>
              <Badge variant={priorityVariant[task.priority]}>
                {PRODUCTION_PRIORITY_LABELS[task.priority]}
              </Badge>
            </div>
            <p className="text-sm font-medium text-foreground">{task.description}</p>
            <p className="text-xs text-muted-foreground">OT: {task.orderNumber} · {task.customerName}</p>
          </div>
          <Badge variant="outline">{PRODUCTION_STATUS_LABELS[task.status]}</Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {task.workCenterName && (
            <div>
              <span className="text-muted-foreground text-xs">Centro</span>
              <p className="font-medium">{task.workCenterName}</p>
            </div>
          )}
          {task.machineName && (
            <div>
              <span className="text-muted-foreground text-xs">Máquina</span>
              <p className="font-medium">{task.machineName}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground text-xs">Cantidad</span>
            <p className="font-medium">{task.quantity} {task.unit}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Fecha prometida</span>
            <p className="font-medium">{new Date(task.promisedDate).toLocaleDateString("es-MX")}</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso de operaciones</span>
            <span>{task.operationsDone}/{task.operationsTotal} ({progress}%)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          {!isWorking ? (
            <Button onClick={handleStart} disabled={pending}>
              {pending ? "Iniciando..." : "Iniciar trabajo"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => router.push(`/production/${task.id}`)}>
              Ver detalle
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
