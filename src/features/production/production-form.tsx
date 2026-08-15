"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PRODUCTION_PRIORITY,
  PRODUCTION_PRIORITY_LABELS,
  PRODUCTION_PRIORITY_OPTIONS,
  type ProductionPriority,
} from "@/lib/production/catalog";
import { isManufacturingItem } from "@/lib/quotes/items";
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

type DocumentOption = {
  id: string;
  originalName: string;
  source: string;
};

type ItemOption = {
  id: string;
  kind?: string;
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
  documents = [],
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
  documents?: DocumentOption[];
  defaultValues?: Partial<FormValues>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const manufacturingItems = items.filter((item) => isManufacturingItem(item.kind));
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
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const selectedItemId = form.watch("orderItemId");

  useEffect(() => {
    if (mode !== "create") return;
    const selected = items.find(
      (item) => item.id === selectedItemId && isManufacturingItem(item.kind),
    );
    if (!selected) return;
    form.setValue("description", selected.description);
    form.setValue("partNumber", selected.partNumber ?? "");
    form.setValue("quantity", String(Number(selected.quantity)));
    form.setValue("unit", selected.unit);
  }, [form, items, mode, selectedItemId]);

  async function onSubmit(values: FormValues) {
    setError(null);
    const payload = {
      ...(mode === "edit" ? { id: productionOrderId } : {}),
      orderId: values.orderId,
      orderItemId: values.orderItemId,
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
      documentIds,
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
            {...form.register("orderId", {
              required: true,
              onChange: (event) => {
                const next = event.target.value;
                form.setValue("orderItemId", "");
                if (next) router.push(`/production/new?orderId=${next}`);
              },
            })}
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

      {mode === "create" ? (
        <div className="space-y-1">
          <Label htmlFor="orderItemId">Partida</Label>
          {manufacturingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este pedido no tiene piezas para OT. El servicio de ingeniería se
              cobra en la cotización y no genera orden de trabajo.
            </p>
          ) : (
            <select
              id="orderItemId"
              className={selectClassName}
              {...form.register("orderItemId", { required: true })}
            >
              <option value="">Selecciona la pieza</option>
              {manufacturingItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.partNumber ?? item.description} · {item.quantity} {item.unit}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-muted-foreground">
            Una partida de pieza = una OT. Tres números de parte = tres OT.
          </p>
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
            {PRODUCTION_PRIORITY_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {PRODUCTION_PRIORITY_LABELS[value]}
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

      {mode === "create" && documents.length > 0 ? (
        <div className="space-y-2">
          <Label>Planos / archivos de la OT</Label>
          <p className="text-xs text-muted-foreground">
            Elige los adjuntos que el operador verá y descargará en la OT.
          </p>
          <ul className="space-y-2 rounded-lg border p-3">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={documentIds.includes(doc.id)}
                  onChange={(event) => {
                    setDocumentIds((current) =>
                      event.target.checked
                        ? [...current, doc.id]
                        : current.filter((id) => id !== doc.id),
                    );
                  }}
                />
                <span>
                  <span className="font-medium">{doc.originalName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {doc.source}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
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
