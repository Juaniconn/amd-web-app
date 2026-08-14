"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PRODUCTION_PRIORITY,
  PRODUCTION_PRIORITY_LABELS,
  type ProductionPriority,
} from "@/lib/production/catalog";
import {
  createProductionOrderAction,
  updateProductionOrderAction,
} from "@/server/actions/production";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type OrderOption = {
  id: string;
  number: string;
  customerName: string;
  quoteNumber: string;
  origin: string;
  engineeringNumber: string | null;
};

type ItemOption = {
  id: string;
  description: string;
  partNumber: string | null;
  quantity: string;
  unit: string;
};

type FormValues = {
  orderId: string;
  orderItemId: string;
  routeId: string;
  description: string;
  partNumber: string;
  quantity: string;
  unit: string;
  promisedDate: string;
  priority: ProductionPriority;
  notes: string;
  workCenterId: string;
  machineId: string;
  operatorUserId: string;
};

export function ProductionForm({
  mode,
  productionOrderId,
  orders,
  items,
  routes,
  workCenters,
  machines,
  users,
  defaultValues,
}: {
  mode: "create" | "edit";
  productionOrderId?: string;
  orders: OrderOption[];
  items: ItemOption[];
  routes: { id: string; name: string }[];
  workCenters: { id: string; name: string }[];
  machines: { id: string; name: string; workCenterId: string }[];
  users: { id: string; name: string }[];
  defaultValues?: Partial<FormValues>;
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    defaultValues: {
      orderId: "",
      orderItemId: "",
      routeId: "",
      description: "",
      partNumber: "",
      quantity: "1",
      unit: "pza",
      promisedDate: "",
      priority: DEFAULT_PRODUCTION_PRIORITY,
      notes: "",
      workCenterId: "",
      machineId: "",
      operatorUserId: "",
      ...defaultValues,
    },
  });

  const [centerFilter, setCenterFilter] = useState(
    defaultValues?.workCenterId ?? "",
  );
  const filteredMachines = machines.filter(
    (machine) => !centerFilter || machine.workCenterId === centerFilter,
  );

  async function onSubmit(values: FormValues) {
    setError(null);
    const payload = {
      ...(mode === "edit" ? { id: productionOrderId } : {}),
      orderId: values.orderId,
      orderItemId: values.orderItemId || undefined,
      routeId: values.routeId || undefined,
      description: values.description,
      partNumber: values.partNumber || undefined,
      quantity: Number(values.quantity),
      unit: values.unit,
      promisedDate: values.promisedDate,
      priority: values.priority,
      notes: values.notes || undefined,
      workCenterId: values.workCenterId || undefined,
      machineId: values.machineId || undefined,
      operatorUserId: values.operatorUserId || undefined,
    };
    const result =
      mode === "create"
        ? await createProductionOrderAction(payload)
        : await updateProductionOrderAction(payload);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      {mode === "create" ? (
        <div className="space-y-1">
          <Label htmlFor="orderId">Pedido</Label>
          <select
            id="orderId"
            className={selectClassName}
            {...form.register("orderId", { required: true })}
          >
            <option value="">Selecciona un pedido convertido</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.number} · {order.customerName} · {order.quoteNumber}
                {order.engineeringNumber ? ` · ${order.engineeringNumber}` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-1">
          <Label htmlFor="orderItemId">Partida (opcional)</Label>
          <select id="orderItemId" className={selectClassName} {...form.register("orderItemId")}>
            <option value="">Toda la orden / no aplicar</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.partNumber ?? item.description} · {item.quantity} {item.unit}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" rows={3} {...form.register("description", { required: true })} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="partNumber">Número de parte</Label>
          <Input id="partNumber" {...form.register("partNumber")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input id="quantity" type="number" min="0.0001" step="0.0001" {...form.register("quantity")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="unit">Unidad</Label>
          <Input id="unit" {...form.register("unit")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="promisedDate">Fecha prometida</Label>
          <Input id="promisedDate" type="date" required {...form.register("promisedDate")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="priority">Prioridad</Label>
          <select id="priority" className={selectClassName} {...form.register("priority")}>
            {(
              Object.entries(PRODUCTION_PRIORITY_LABELS) as [ProductionPriority, string][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mode === "create" ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="routeId">Ruta</Label>
            <select id="routeId" className={selectClassName} {...form.register("routeId")}>
              <option value="">Sin ruta (configurable después)</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="workCenterId">Centro</Label>
              <select
                id="workCenterId"
                className={selectClassName}
                {...form.register("workCenterId", {
                  onChange: (event) => setCenterFilter(event.target.value),
                })}
              >
                <option value="">Sin asignar</option>
                {workCenters.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="machineId">Máquina</Label>
              <select id="machineId" className={selectClassName} {...form.register("machineId")}>
                <option value="">Sin asignar</option>
                {filteredMachines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="operatorUserId">Operador</Label>
              <select
                id="operatorUserId"
                className={selectClassName}
                {...form.register("operatorUserId")}
              >
                <option value="">Sin asignar</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="notes">Observaciones</Label>
        <Textarea id="notes" rows={3} {...form.register("notes")} />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {mode === "create" ? "Crear OT" : "Guardar"}
      </Button>
    </form>
  );
}
