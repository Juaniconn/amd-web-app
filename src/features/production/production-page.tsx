"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, StatCard, StatRow } from "@/components/shared/ui-patterns";
import { PageHeader } from "@/components/layout/page-header";
import {
  ClipboardList,
  Layers,
  Clock,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  LayoutGrid,
  List,
  Calendar,
  Plus,
} from "lucide-react";

type ViewMode = "orders" | "parts";

type OrderRow = {
  id: string;
  number: string;
  customerName: string;
  customerId: string;
  quoteNumber: string;
  quoteId: string;
  status: string;
  partsTotal: number;
  partsDone: number;
  partsInProduction: number;
  opsTotal: number;
  opsDone: number;
  promisedDate: Date | null;
  total: string;
  currency: string;
  requiresEngineering: boolean;
  rfqType: string;
  isDemo: boolean;
};

type ProductionRow = {
  id: string;
  number: string;
  partNumber: string | null;
  orderId: string;
  orderNumber: string;
  customerName: string;
  description: string;
  quantity: string;
  unit: string;
  status: string;
  priority: string;
  promisedDate: Date;
  operationsTotal: number;
  operationsDone: number;
  currentOperationName: string | null;
  currentOperationStatus: string | null;
  isDemo: boolean;
};

function OrderStatusDot({ status }: { status: string }) {
  if (status === "completado") return <span className="h-2 w-2 rounded-full bg-emerald-500" />;
  if (status === "cancelado") return <span className="h-2 w-2 rounded-full bg-red-500" />;
  return <span className="h-2 w-2 rounded-full bg-amber-500" />;
}

function PartStatusDot({ status }: { status: string }) {
  if (status === "terminada" || status === "entregada") return <span className="h-2 w-2 rounded-full bg-emerald-500" />;
  if (status === "cancelada" || status === "esperando_material") return <span className="h-2 w-2 rounded-full bg-red-500" />;
  return <span className="h-2 w-2 rounded-full bg-amber-500" />;
}

function ProgressBar({ percent }: { percent: number }) {
  const color = percent >= 70 ? "bg-emerald-500" : percent >= 30 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
      <div className={`h-full transition-all ${color}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  en_produccion: "En Producción",
  completado: "Completado",
  cancelado: "Cancelado",
};

const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  liberada: "Liberada",
  programada: "Programada",
  en_produccion: "En Producción",
  pausada: "Pausada",
  esperando_material: "Esp. Material",
  calidad: "Calidad",
  terminada: "Terminada",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

export function ProductionPage({
  orders,
  parts,
  canCreate,
}: {
  orders: OrderRow[];
  parts: ProductionRow[];
  canCreate: boolean;
}) {
  const [view, setView] = useState<ViewMode>("orders");

  const totalOrders = orders.length;
  const enProduccion = orders.filter((o) => o.status === "en_produccion").length;
  const completadas = orders.filter((o) => o.status === "completado").length;
  const totalParts = parts.length;
  const partsEnProduccion = parts.filter((p) => p.status === "en_produccion").length;
  const partsTerminadas = parts.filter((p) => p.status === "terminada" || p.status === "entregada").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Producción"
        description="Gestiona Órdenes de Trabajo y Números de Parte"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border p-0.5">
              <button
                onClick={() => setView("orders")}
                className={`rounded-sm p-1.5 ${view === "orders" ? "bg-muted" : "text-muted-foreground hover:bg-muted"}`}
                title="Vista Órdenes de Trabajo"
              >
                <ClipboardList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("parts")}
                className={`rounded-sm p-1.5 ${view === "parts" ? "bg-muted" : "text-muted-foreground hover:bg-muted"}`}
                title="Vista Números de Parte"
              >
                <Layers className="h-4 w-4" />
              </button>
            </div>
            {canCreate && (
              <Link href="/production/new" className={buttonVariants({ size: "sm" })}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nuevo
              </Link>
            )}
          </div>
        }
      />

      {/* KPIs */}
      {view === "orders" ? (
        <StatRow>
          <StatCard label="Total OTs" value={totalOrders} icon={<ClipboardList className="h-4 w-4" />} />
          <StatCard label="En Producción" value={enProduccion} tone="amber" icon={<PlayCircle className="h-4 w-4" />} />
          <StatCard label="Completadas" value={completadas} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard label="Total Partes" value={totalParts} icon={<Layers className="h-4 w-4" />} />
        </StatRow>
      ) : (
        <StatRow>
          <StatCard label="Total Partes" value={totalParts} icon={<Layers className="h-4 w-4" />} />
          <StatCard label="En Producción" value={partsEnProduccion} tone="amber" icon={<PlayCircle className="h-4 w-4" />} />
          <StatCard label="Terminadas" value={partsTerminadas} tone="green" icon={<CheckCircle2 className="h-4 w-4" />} />
          <StatCard label="Total OTs" value={totalOrders} icon={<ClipboardList className="h-4 w-4" />} />
        </StatRow>
      )}

      {/* Vista Órdenes de Trabajo */}
      {view === "orders" && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OT</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Partes</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prometida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <EmptyState
                      icon={<ClipboardList className="h-8 w-8" />}
                      title="Aún no hay Órdenes de Trabajo"
                      description="Las OTs se crean desde cotizaciones convertidas."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const progress = order.partsTotal > 0 ? Math.round((order.partsDone / order.partsTotal) * 100) : 0;
                  return (
                    <TableRow key={order.id} className="hover:bg-muted/40">
                      <TableCell>
                        <Link href={`/production/order/${order.id}`} className="font-medium text-blue-600 hover:underline">
                          {order.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/customers/${order.customerId}`} className="text-sm hover:underline">
                          {order.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{order.partsTotal}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ProgressBar percent={progress} />
                          <span className="text-xs font-medium">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <OrderStatusDot status={order.status} />
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {order.promisedDate ? new Date(order.promisedDate).toLocaleDateString("es-MX") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Vista Números de Parte */}
      {view === "parts" && (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parte</TableHead>
                <TableHead>OT / Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Progreso</TableHead>
                <TableHead>Prometida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <EmptyState
                      icon={<Layers className="h-8 w-8" />}
                      title="Aún no hay Números de Parte"
                      description="Las partes se crean desde las Órdenes de Trabajo."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                parts.map((part) => {
                  const progress = part.operationsTotal > 0 ? Math.round((part.operationsDone / part.operationsTotal) * 100) : 0;
                  return (
                    <TableRow key={part.id} className="hover:bg-muted/40">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PartStatusDot status={part.status} />
                          <div>
                            <Link href={`/production/${part.id}`} className="font-mono text-sm font-medium text-blue-600 hover:underline">
                              {part.partNumber || part.number}
                            </Link>
                            <div className="truncate text-xs text-muted-foreground max-w-[200px]">{part.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/production/order/${part.orderId}`} className="font-mono text-xs hover:underline">
                          {part.orderNumber}
                        </Link>
                        <div className="text-xs text-muted-foreground">{part.customerName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={part.status === "terminada" || part.status === "entregada" ? "default" : part.status === "cancelada" ? "destructive" : "secondary"} className="text-[10px]">
                          {PRODUCTION_STATUS_LABELS[part.status] || part.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {part.operationsTotal > 0 ? (
                          <div className="flex items-center gap-2">
                            <ProgressBar percent={progress} />
                            <span className="text-xs font-medium">{progress}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin procesos</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(part.promisedDate).toLocaleDateString("es-MX")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
