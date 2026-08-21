"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PRODUCTION_PRIORITY_LABELS,
  type ProductionPriority,
} from "@/lib/production/catalog";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";

type KanbanTask = {
  id: string;
  number: string;
  description: string;
  partNumber: string | null;
  quantity: string;
  unit: string;
  priority: ProductionPriority;
  status: string;
  orderNumber: string;
  customerName: string;
  workCenterName: string | null;
  machineName: string | null;
  operatorName: string | null;
  promisedDate: Date;
  operationsTotal: number;
  operationsDone: number;
  isDelayed: boolean;
};

const priorityVariant: Record<ProductionPriority, "destructive" | "default" | "secondary" | "outline"> = {
  urgente: "destructive",
  compromiso_inmediato: "default",
  programada: "secondary",
  produccion_normal: "outline",
};

function KanbanCard({ task, onClick }: { task: KanbanTask; onClick: () => void }) {
  const progress = task.operationsTotal > 0
    ? Math.round((task.operationsDone / task.operationsTotal) * 100)
    : 0;

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${
        task.isDelayed ? "border-l-4 border-l-red-500" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold truncate">{task.number}</span>
              {task.isDelayed && (
                <span className="shrink-0 text-[10px] font-bold text-red-500 uppercase">Atrasado</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{task.description}</p>
          </div>
          <Badge variant={priorityVariant[task.priority]} className="shrink-0 text-[10px]">
            {PRODUCTION_PRIORITY_LABELS[task.priority]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>OT: {task.orderNumber}</span>
          {task.workCenterName && <span>Centro: {task.workCenterName}</span>}
          {task.machineName && <span>Máq: {task.machineName}</span>}
        </div>

        {task.operationsTotal > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{task.operationsDone}/{task.operationsTotal}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {task.operatorName && (
          <p className="text-[10px] text-muted-foreground">
            Operador: <span className="font-medium">{task.operatorName}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function KanbanBoard({ columns }: {
  columns: { id: string; label: string; color: string; tasks: KanbanTask[] }[];
}) {
  const router = useRouter();
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className={`flex-shrink-0 w-72 rounded-lg ${column.color} p-3`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{column.label}</h3>
            <Badge variant="outline" className="text-xs font-mono">
              {column.tasks.length}
            </Badge>
          </div>
          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
            {column.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Sin números de parte
              </p>
            ) : (
              column.tasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onClick={() => router.push(`/production/${task.id}`)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
