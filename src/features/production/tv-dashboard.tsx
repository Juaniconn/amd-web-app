"use client";

import { useEffect, useState } from "react";

type TvMachineStatus = {
  id: string;
  name: string;
  workCenter: string;
  status: "disponible" | "en_produccion" | "ocupada" | "mantenimiento" | "fuera_de_servicio";
  operatorName: string | null;
  currentPartNumber: string | null;
};

type TvOrder = {
  id: string;
  number: string;
  customerName: string;
  totalParts: number;
  doneParts: number;
  status: string;
  promisedDate: Date | null;
  isDelayed: boolean;
};

type TvDashboard = {
  generatedAt: string;
  orders: TvOrder[];
  machines: TvMachineStatus[];
  metrics: {
    activeParts: number;
    delayedParts: number;
    machineHoursToday: number;
    laborHoursToday: number;
    partsInProgress: number;
    partsInQuality: number;
  };
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

function MachineCard({ machine }: { machine: TvMachineStatus }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-lg truncate">{machine.name}</h4>
          <p className="text-sm text-muted-foreground">{machine.workCenter}</p>
        </div>
        <div className={`w-4 h-4 rounded-full ${MACHINE_STATUS_COLORS[machine.status]}`} />
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Estado:</span>
          <span className="font-medium">{MACHINE_STATUS_LABELS[machine.status]}</span>
        </div>
        {machine.currentPartNumber && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Produciendo:</span>
            <span className="font-mono font-bold">{machine.currentPartNumber}</span>
          </div>
        )}
        {machine.operatorName && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Operador:</span>
            <span>{machine.operatorName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: TvOrder }) {
  const progress = order.totalParts > 0
    ? Math.round((order.doneParts / order.totalParts) * 100)
    : 0;

  return (
    <div className={`rounded-lg border bg-card p-4 ${order.isDelayed ? "border-red-500" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-mono font-bold">{order.number}</h4>
          <p className="text-sm text-muted-foreground truncate">{order.customerName}</p>
        </div>
        {order.isDelayed && (
          <span className="shrink-0 text-xs font-bold text-red-500 uppercase">Atrasado</span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progreso:</span>
          <span className="font-bold">{order.doneParts}/{order.totalParts} partes</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">{progress}%</p>
      </div>
    </div>
  );
}

export function TvDashboardView({ initialData }: { initialData: TvDashboard }) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch("/api/production/tv-dashboard");
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
      }
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AMD México — Centro de Operaciones</h1>
          <p className="text-muted-foreground">Producción en tiempo real</p>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <p>Última actualización:</p>
          <p className="font-mono">{new Date(data.generatedAt).toLocaleString("es-MX")}</p>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-4xl font-bold">{data.metrics.activeParts}</p>
          <p className="text-sm text-muted-foreground">Números de parte activos</p>
        </div>
        <div className={`rounded-lg border bg-card p-4 text-center ${
          data.metrics.delayedParts > 0 ? "border-red-500" : ""
        }`}>
          <p className={`text-4xl font-bold ${data.metrics.delayedParts > 0 ? "text-red-500" : ""}`}>
            {data.metrics.delayedParts}
          </p>
          <p className="text-sm text-muted-foreground">Atrasados</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-4xl font-bold">{Math.round(data.metrics.machineHoursToday / 60)}h</p>
          <p className="text-sm text-muted-foreground">Horas máquina hoy</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-4xl font-bold">{Math.round(data.metrics.laborHoursToday / 60)}h</p>
          <p className="text-sm text-muted-foreground">Horas hombre hoy</p>
        </div>
      </div>

      {/* Machines section */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Estado de Máquinas</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.machines.map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}
        </div>
      </div>

      {/* Orders section */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Órdenes de Trabajo</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.orders.slice(0, 9).map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </div>
  );
}
