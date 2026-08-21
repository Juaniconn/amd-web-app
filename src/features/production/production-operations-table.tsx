"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { assignOperationOperatorAction } from "@/server/actions/production";

type Operation = {
  id: string;
  position: number;
  kind: string;
  name: string;
  status: string;
  workCenterId: string | null;
  workCenterName: string | null;
  machineId: string | null;
  operatorUserId: string | null;
  operatorName?: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
};

type Operator = {
  id: string;
  name: string;
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Progreso",
  terminada: "Terminada",
  omitida: "Omitida",
};

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  pendiente: "outline",
  en_proceso: "secondary",
  terminada: "default",
  omitida: "destructive",
};

const KIND_LABELS: Record<string, string> = {
  ingenieria: "Ingeniería",
  produccion: "Producción",
  calidad: "Calidad",
  entrega: "Entrega",
};

export function ProductionOperationsTable({
  operations,
  operators,
  canAssign,
}: {
  operations: Operation[];
  operators: Operator[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const progress =
    operations.length > 0
      ? Math.round(
          (operations.filter((op) => op.status === "terminada").length /
            operations.length) *
            100
        )
      : 0;

  async function handleAssign(operationId: string, operatorId: string) {
    setPending(operationId);
    const formData = new FormData();
    formData.set("operationId", operationId);
    formData.set("operatorUserId", operatorId || "");
    await assignOperationOperatorAction(formData);
    setPending(null);
    router.refresh();
  }

  // Filter operators by work center if specified
  function getOperatorsForOperation(operation: Operation) {
    // If we had work center data per operator, we'd filter here
    return operators;
  }

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progreso del número de parte</span>
          <span>
            {operations.filter((op) => op.status === "terminada").length}/
            {operations.length} ({progress}%)
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Operations table */}
      {operations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay procesos definidos. Se copian de la ruta al crear el número de parte.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Proceso</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Operador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {operations.map((operation) => {
              const isPending = pending === operation.id;
              const opOperators = getOperatorsForOperation(operation);

              return (
                <TableRow
                  key={operation.id}
                  className={operation.status === "terminada" ? "bg-green-50" : ""}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {operation.position}
                  </TableCell>
                  <TableCell className="font-medium">{operation.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {KIND_LABELS[operation.kind] ?? operation.kind}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {operation.workCenterName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[operation.status]}>
                      {STATUS_LABELS[operation.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canAssign ? (
                      <select
                        className="h-8 w-40 rounded-lg border border-input bg-transparent px-2 text-sm"
                        value={operation.operatorUserId ?? "none"}
                        onChange={(event) => {
                          handleAssign(operation.id, event.target.value === "none" ? "" : event.target.value);
                        }}
                      >
                        <option value="none">Sin asignar</option>
                        {opOperators.map((op) => (
                          <option key={op.id} value={op.id}>
                            {op.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {operation.operatorUserId
                          ? operators.find(
                              (o) => o.id === operation.operatorUserId
                            )?.name ?? "Asignado"
                          : "Sin asignar"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
