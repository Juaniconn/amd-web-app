"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { assignProductionAction } from "@/server/actions/production";

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm";

export function ProductionAssignPanel({
  productionOrderId,
  workCenterId,
  machineId,
  operatorUserId,
  workCenters,
  machines,
  users,
  canAssignCenter,
  canAssignMachine,
  canAssignOperator,
}: {
  productionOrderId: string;
  workCenterId: string | null;
  machineId: string | null;
  operatorUserId: string | null;
  workCenters: { id: string; name: string }[];
  machines: { id: string; name: string; workCenterId: string }[];
  users: { id: string; name: string }[];
  canAssignCenter: boolean;
  canAssignMachine: boolean;
  canAssignOperator: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [center, setCenter] = useState(workCenterId ?? "");
  const [machine, setMachine] = useState(machineId ?? "");
  const [operator, setOperator] = useState(operatorUserId ?? "");

  useEffect(() => {
    setCenter(workCenterId ?? "");
    setMachine(machineId ?? "");
    setOperator(operatorUserId ?? "");
  }, [workCenterId, machineId, operatorUserId]);

  const filteredMachines = machines.filter(
    (item) => !center || item.workCenterId === center,
  );
  const machineOptions =
    machine && !filteredMachines.some((item) => item.id === machine)
      ? [
          ...machines.filter((item) => item.id === machine),
          ...filteredMachines,
        ]
      : filteredMachines;

  if (!canAssignCenter && !canAssignMachine && !canAssignOperator) {
    return null;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = await assignProductionAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo asignar.");
      return;
    }
    setCenter(String(formData.get("workCenterId") ?? ""));
    setMachine(String(formData.get("machineId") ?? ""));
    setOperator(String(formData.get("operatorUserId") ?? ""));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={productionOrderId} />
      {canAssignCenter ? (
        <select
          name="workCenterId"
          className={selectClassName}
          value={center}
          onChange={(event) => {
            const next = event.target.value;
            setCenter(next);
            const stillValid = machines.some(
              (item) => item.id === machine && (!next || item.workCenterId === next),
            );
            if (!stillValid) setMachine("");
          }}
        >
          <option value="">Centro</option>
          {workCenters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      ) : null}
      {canAssignMachine ? (
        <select
          name="machineId"
          className={selectClassName}
          value={machine}
          onChange={(event) => setMachine(event.target.value)}
        >
          <option value="">Máquina</option>
          {machineOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      ) : null}
      {canAssignOperator ? (
        <select
          name="operatorUserId"
          className={selectClassName}
          value={operator}
          onChange={(event) => setOperator(event.target.value)}
        >
          <option value="">Operador</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      ) : null}
      <Button type="submit" variant="outline" disabled={pending}>
        Asignar
      </Button>
      {error ? (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
