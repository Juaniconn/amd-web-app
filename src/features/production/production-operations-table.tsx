"use client";

import { useState, useEffect } from "react";
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
import { Lightbulb } from "lucide-react";

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
  email: string;
  activeOperations: number;
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
  canAssign,
}: {
  operations: Operation[];
  canAssign: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetch("/api/production/available-operators")
      .then((res) => res.json())
      .then(setOperators)
      .catch(console.error);
  }, []);

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

  function handleSuggest(operationId: string) {
    // Find first available operator (least loaded)
    const suggested = operators.find(
      (op) => op.activeOperations < 3 && op.id !== operators.find(o => o.id === operators[0]?.id)?.id
    ) || operators[0];
    if (suggested) {
      handleAssign(operationId, suggested.id);
    }
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

      {/* Operators status */}
      {operators.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Operadores disponibles:</span>
          {operators.slice(0, 4).map((op) => (
            <Badge key={op.id} variant={op.activeOperations < 2 ? "default" : "outline"} className="text-[10px]">
              {op.name.split(" ")[0]} ({op.activeOperations} ops)
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="ml-auto text-xs"
          >
            <Lightbulb className="h-3 w-3 mr-1" />
            {showSuggestions ? "Ocultar sugerencias" : "Sugerir operadores"}
          </Button>
        </div>
      )}

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
                    <Badge variant={STATUS_VARIANT[operation.status as keyof typeof STATUS_VARIANT]}>
                      {STATUS_LABELS[operation.status] ?? operation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canAssign ? (
                      <div className="flex items-center gap-1">
                        <select
                          className="h-7 w-32 rounded border border-input bg-transparent px-1 text-xs"
                          value={operation.operatorUserId ?? "none"}
                          onChange={(event) =>
                            handleAssign(operation.id, event.target.value === "none" ? "" : event.target.value)
                          }
                        >
                          <option value="none">Sin asignar</option>
                          {operators.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.name.split(" ")[0]} ({op.activeOperations})
                            </option>
                          ))}
                        </select>
                        {showSuggestions && !operation.operatorUserId && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleSuggest(operation.id)}
                            title="Asignar operador sugerido"
                          >
                            <Lightbulb className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {operation.operatorName ?? "Sin asignar"}
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
