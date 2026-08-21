import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  customers,
  orders,
  productionOrders,
  productionOperations,
  users,
  workCenters,
  machines,
} from "@/db/schema";
import { PRODUCTION_STATUS_LABELS, type ProductionStatus } from "@/lib/production/status";
import { PRODUCTION_PRIORITY_LABELS, type ProductionPriority } from "@/lib/production/catalog";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { id } = await params;

  const [order] = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      customerId: orders.customerId,
      customerName: customers.legalName,
      total: orders.total,
      currency: orders.currency,
      promisedDate: orders.promisedDate,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    redirect("/orders");
  }

  const parts = await db
    .select({
      id: productionOrders.id,
      number: productionOrders.number,
      description: productionOrders.description,
      partNumber: productionOrders.partNumber,
      quantity: productionOrders.quantity,
      unit: productionOrders.unit,
      priority: productionOrders.priority,
      status: productionOrders.status,
      workCenterName: workCenters.name,
      machineName: machines.name,
      operatorName: users.name,
      promisedDate: productionOrders.promisedDate,
      startedAt: productionOrders.startedAt,
      releasedAt: productionOrders.releasedAt,
    })
    .from(productionOrders)
    .leftJoin(workCenters, eq(productionOrders.workCenterId, workCenters.id))
    .leftJoin(machines, eq(productionOrders.machineId, machines.id))
    .leftJoin(users, eq(productionOrders.operatorUserId, users.id))
    .where(eq(productionOrders.orderId, order.id))
    .orderBy(productionOrders.number);

  const operations = await db
    .select({
      id: productionOperations.id,
      productionOrderId: productionOperations.productionOrderId,
      name: productionOperations.name,
      status: productionOperations.status,
      position: productionOperations.position,
    })
    .from(productionOperations)
    .where(
      eq(
        productionOperations.productionOrderId,
        parts.length > 0 ? parts[0].id : "",
      ),
    )
    .orderBy(productionOperations.position);

  const totalParts = parts.length;
  const completedParts = parts.filter(
    (p) => p.status === "terminada" || p.status === "entregada",
  ).length;
  const progress = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.number}
        description={`Orden de Trabajo — ${order.customerName}`}
        actions={
          <Badge variant="outline" className="text-sm">
            {order.status}
          </Badge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Información de la Orden</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="font-medium">{order.customerName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha prometida</p>
            <p className="font-medium">
              {order.promisedDate
                ? new Date(order.promisedDate).toLocaleDateString("es-MX")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-medium">
              {order.currency === "usd" ? "$" : ""}
              {Number(order.total).toLocaleString("es-MX", {
                minimumFractionDigits: 2,
              })}{" "}
              {order.currency.toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Progreso</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-mono">
                {completedParts}/{totalParts}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Creado</p>
            <p className="font-medium">
              {new Date(order.createdAt).toLocaleDateString("es-MX")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Números de Parte ({totalParts})</CardTitle>
        </CardHeader>
        <CardContent>
          {parts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay números de parte en esta orden.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Parte</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>PN Plano</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Centro</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Operador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-mono font-bold">
                      <Link
                        href={`/production/${part.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {part.number}
                      </Link>
                    </TableCell>
                    <TableCell>{part.description}</TableCell>
                    <TableCell className="font-mono">
                      {part.partNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      {part.quantity} {part.unit}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          part.priority === "urgente"
                            ? "destructive"
                            : part.priority === "compromiso_inmediato"
                              ? "default"
                              : "outline"
                        }
                      >
                        {PRODUCTION_PRIORITY_LABELS[part.priority as ProductionPriority]}
                      </Badge>
                    </TableCell>
                    <TableCell>{PRODUCTION_STATUS_LABELS[part.status as ProductionStatus]}</TableCell>
                    <TableCell>{part.workCenterName ?? "—"}</TableCell>
                    <TableCell>{part.machineName ?? "—"}</TableCell>
                    <TableCell>{part.operatorName ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
