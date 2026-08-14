"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const filteredMachines = machines.filter(
    (machine) => !center || machine.workCenterId === center,
  );

  if (!canAssignCenter && !canAssignMachine && !canAssignOperator) {
    return null;
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await assignProductionAction(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo asignar.");
      return;
    }
    router.refresh();
  }

  return (
    <form action={onSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={productionOrderId} />
      {canAssignCenter ? (
        <select
          name="workCenterId"
          className={selectClassName}
          value={center}
          onChange={(event) => setCenter(event.target.value)}
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
        <select name="machineId" defaultValue={machineId ?? ""} className={selectClassName}>
          <option value="">Máquina</option>
          {filteredMachines.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      ) : null}
      {canAssignOperator ? (
        <select
          name="operatorUserId"
          defaultValue={operatorUserId ?? ""}
          className={selectClassName}
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
