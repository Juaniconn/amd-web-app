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

type PartSummary = {
  id: string;
  number: string;
  description: string;
  partNumber: string | null;
  quantity: string;
  unit: string;
  priority: string;
  status: string;
  workCenterName: string | null;
  machineName: string | null;
  operatorName: string | null;
  operatorId: string | null;
  promisedDate: Date;
  operationsTotal: number;
  operationsDone: number;
  isDelayed: boolean;
};

type OrderWithParts = {
  id: string;
  number: string;
  customerName: string;
  status: string;
  promisedDate: Date | null;
  totalParts: number;
  activeParts: number;
  completedParts: number;
  hasDelayed: boolean;
  parts: PartSummary[];
};

type OrdersKanbanColumn = {
  id: string;
  label: string;
  color: string;
  orders: OrderWithParts[];
};

type PartsKanbanColumn = {
  id: string;
  label: string;
  color: string;
  parts: PartSummary[];
};

const priorityVariant: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  urgente: "destructive",
  compromiso_inmediato: "default",
  programada: "secondary",
  produccion_normal: "outline",
};

function OrderCard({ order }: { order: OrderWithParts }) {
  const progress = order.totalParts > 0
    ? Math.round((order.completedParts / order.totalParts) * 100)
    : 0;

  return (
    <Card className={`hover:shadow-md ${order.hasDelayed ? "border-l-4 border-l-red-500" : ""}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <a
                href={`/production/orders/${order.id}`}
                className="font-mono text-sm font-bold truncate text-blue-600 hover:underline"
              >
                {order.number}
              </a>
              {order.hasDelayed && (
                <span className="shrink-0 text-[10px] font-bold text-red-500 uppercase">Atrasado</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{order.customerName}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {order.completedParts}/{order.totalParts}
          </Badge>
        </div>

        {order.totalParts > 0 && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">{progress}%</p>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {order.parts.slice(0, 3).map((part) => (
            <a
              key={part.id}
              href={`/production/${part.id}`}
              className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-blue-100"
              title={part.partNumber ?? part.description}
            >
              {part.partNumber ?? part.number}
            </a>
          ))}
          {order.parts.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted">
              +{order.parts.length - 3}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PartCard({ part }: { part: PartSummary }) {
  const router = useRouter();
  const progress = part.operationsTotal > 0
    ? Math.round((part.operationsDone / part.operationsTotal) * 100)
    : 0;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md ${
        part.isDelayed ? "border-l-4 border-l-red-500" : ""
      }`}
      onClick={() => router.push(`/production/${part.id}`)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold truncate">{part.partNumber ?? part.number}</span>
              {part.isDelayed && (
                <span className="shrink-0 text-[10px] font-bold text-red-500 uppercase">Atrasado</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">{part.description}</p>
            <p className="text-[10px] font-mono text-muted-foreground">OT: {part.number}</p>
          </div>
          <Badge variant={priorityVariant[part.priority] ?? "outline"} className="shrink-0 text-[10px]">
            {PRODUCTION_PRIORITY_LABELS[part.priority as ProductionPriority] ?? part.priority}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {part.workCenterName && <span>Centro: {part.workCenterName}</span>}
          {part.machineName && <span>Máq: {part.machineName}</span>}
        </div>

        {part.operatorName && (
          <p className="text-[11px] text-muted-foreground">
            Operador: <span className="font-medium">{part.operatorName}</span>
          </p>
        )}

        <div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-muted">
            {PRODUCTION_STATUS_LABELS[part.status as ProductionStatus] ?? part.status}
          </span>
        </div>

        {part.operationsTotal > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{part.operationsDone}/{part.operationsTotal}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KanbanBoard({ ordersColumns, partsColumns }: {
  ordersColumns: OrdersKanbanColumn[];
  partsColumns: PartsKanbanColumn[];
}) {
  const [view, setView] = useState<"orders" | "parts">("orders");

  const activeColumns = view === "orders" ? ordersColumns : partsColumns;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={view === "orders" ? "default" : "outline"}
          onClick={() => setView("orders")}
        >
          Vista OT
        </Button>
        <Button
          variant={view === "parts" ? "default" : "outline"}
          onClick={() => setView("parts")}
        >
          Vista Número de Parte
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {activeColumns.map((column) => (
          <div
            key={column.id}
            className={`flex-shrink-0 w-72 rounded-lg ${column.color} p-3`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{column.label}</h3>
              <Badge variant="outline" className="text-xs font-mono">
                {"orders" in column ? (column as OrdersKanbanColumn).orders.length : (column as PartsKanbanColumn).parts.length}
              </Badge>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {"orders" in column ? (
                (column as OrdersKanbanColumn).orders.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sin órdenes
                  </p>
                ) : (
                  (column as OrdersKanbanColumn).orders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))
                )
              ) : (
                (column as PartsKanbanColumn).parts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Sin números de parte
                  </p>
                ) : (
                  (column as PartsKanbanColumn).parts.map((part) => (
                    <PartCard key={part.id} part={part} />
                  ))
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
