import Link from "next/link";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { orders, productionOrders, customers } from "@/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard, StatRow } from "@/components/shared/ui-patterns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { BarChart3, Users, Clock, Package } from "lucide-react";

export default async function ReportsPage() {
  await requirePermission(PERMISSION_IDS.productionView);

  // OTs por cliente (últimos 30 días)
  const ordersByCustomer = await db
    .select({
      customerName: customers.legalName,
      customerCode: customers.code,
      total: sql<number>`count(*)::int`,
    })
    .from(orders)
    .leftJoin(customers, sql`${orders.customerId} = ${customers.id}`)
    .where(sql`${orders.createdAt} > now() - interval '30 days'`)
    .groupBy(customers.legalName, customers.code)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  // Tiempos de producción por parte
  const productionTimes = await db
    .select({
      partNumber: productionOrders.partNumber,
      description: productionOrders.description,
      status: productionOrders.status,
      createdAt: productionOrders.createdAt,
      promisedDate: productionOrders.promisedDate,
    })
    .from(productionOrders)
    .orderBy(productionOrders.createdAt)
    .limit(10);

  // Material más consumido (simplificado - usa partes con más procesos)
  const materialConsumption = await db
    .select({
      partNumber: productionOrders.partNumber,
      total: sql<number>`count(*)::int`,
    })
    .from(productionOrders)
    .groupBy(productionOrders.partNumber)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  const totalOTs = ordersByCustomer.reduce((acc, c) => acc + c.total, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reportes"
        description="Resumen de actividad de los últimos 30 días"
      />

      <StatRow>
        <StatCard
          label="OTs en 30 días"
          value={totalOTs}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          label="Clientes activos"
          value={ordersByCustomer.length}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Partes en producción"
          value={productionTimes.filter((p) => p.status === "en_produccion").length}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          label="Tiempo promedio"
          value="—"
          icon={<Clock className="h-4 w-4" />}
        />
      </StatRow>

      <Card>
        <CardHeader>
          <CardTitle>OTs por cliente (últimos 30 días)</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersByCustomer.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin datos para el período seleccionado.
            </p>
          ) : (
            <div className="space-y-2">
              {ordersByCustomer.map((c, i) => {
                const maxTotal = ordersByCustomer[0]?.total || 1;
                const pct = Math.round((c.total / maxTotal) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 truncate text-sm">
                      {c.customerName || "Sin nombre"}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-8 text-right text-sm font-medium">
                      {c.total}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Producción reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parte</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prometida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productionTimes.map((p) => (
                <TableRow key={p.partNumber}>
                  <TableCell className="font-mono text-sm">
                    {p.partNumber || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.description || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{p.status}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.promisedDate
                      ? new Date(p.promisedDate).toLocaleDateString("es-MX")
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
