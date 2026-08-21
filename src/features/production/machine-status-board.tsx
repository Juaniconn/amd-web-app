"use client";

import { useState, useEffect } from "react";

type MachineStatus = {
  id: string;
  name: string;
  workCenter: string;
  status: "disponible" | "en_produccion" | "ocupada" | "mantenimiento" | "fuera_de_servicio";
  operatorName: string | null;
  currentPartNumber: string | null;
};

const MACHINE_STATUS_LABELS: Record<string, string> = {
  disponible: "Disponible",
  en_produccion: "En Producción",
  ocupada: "Ocupada",
  mantenimiento: "Mantenimiento",
  fuera_de_servicio: "Fuera de Servicio",
};

const MACHINE_STATUS_COLORS: Record<string, string> = {
  disponible: "bg-green-500",
  en_produccion: "bg-amber-500",
  ocupada: "bg-blue-500",
  mantenimiento: "bg-yellow-500",
  fuera_de_servicio: "bg-red-500",
};

export function MachineStatusBoard({ initialMachines }: { initialMachines: MachineStatus[] }) {
  const [machines, setMachines] = useState(initialMachines);

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch("/api/production/machine-status");
      if (response.ok) {
        const data = await response.json();
        setMachines(data);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Estado de Máquinas</h3>
      <div className="grid gap-2">
        {machines.map((machine) => (
          <div key={machine.id} className="flex items-center gap-3 rounded-md border p-2">
            <div className={`h-3 w-3 rounded-full ${MACHINE_STATUS_COLORS[machine.status]}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{machine.name}</span>
                <span className="text-xs text-muted-foreground">{machine.workCenter}</span>
              </div>
              {machine.currentPartNumber && (
                <p className="text-xs text-muted-foreground">
                  {machine.currentPartNumber}
                </p>
              )}
            </div>
            {machine.operatorName && (
              <span className="text-xs text-muted-foreground">{machine.operatorName}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
