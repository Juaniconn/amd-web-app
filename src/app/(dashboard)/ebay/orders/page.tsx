"use client";

import { useState, useEffect, useMemo } from "react";
import { Package, ShoppingCart, DollarSign, TrendingUp, Search, Filter, Check, Clock, Truck, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button, Input, EmptyState } from "@/components/ui";

interface Order {
  id: string;
  itemId: number;
  productTitle: string;
  productSku: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  shippingAddress: string;
  orderDate: string;
  trackingNumber?: string | null;
}

interface OrderStats {
  total: number;
  pending: number;
  shipped: number;
  delivered: number;
  revenue: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "secondary" as const },
  shipped: { label: "Enviado", variant: "default" as const },
  delivered: { label: "Entregado", variant: "outline" as const },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ebay/orders");
      const data = await res.json();
      setOrders(data.orders || []);
      setStats(data.stats || null);
    } catch {
      showToast("Error al cargar órdenes", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        o.productTitle.toLowerCase().includes(search.toLowerCase()) ||
        o.productSku.toLowerCase().includes(search.toLowerCase()) ||
        o.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || o.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [orders, search, filterStatus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 ${toast.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}
          >
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Órdenes eBay</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona las órdenes de compra de eBay
            </p>
          </div>
          <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchOrders}>
            Sincronizar
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats?.total || 0, icon: <ShoppingCart className="w-4 h-4" />, color: "text-brand" },
          { label: "Pendientes", value: stats?.pending || 0, icon: <Clock className="w-4 h-4" />, color: "text-warning" },
          { label: "Enviados", value: stats?.shipped || 0, icon: <Truck className="w-4 h-4" />, color: "text-accent-light" },
          { label: "Ingresos", value: `$${stats?.revenue.toLocaleString() || 0}`, icon: <DollarSign className="w-4 h-4" />, color: "text-success" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card-premium p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="card-premium p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar órdenes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm outline-none focus:border-brand transition-colors"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregado</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          Mostrando {filtered.length} de {orders.length} órdenes
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-12 gap-4 bg-muted/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-2">Orden</div>
          <div className="col-span-3">Producto</div>
          <div className="col-span-2">Comprador</div>
          <div className="col-span-1 text-right">Qty</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-1 text-right">Fecha</div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              className="grid grid-cols-12 gap-4 items-center px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="col-span-2 text-sm font-mono text-brand">{order.id}</div>
              <div className="col-span-3">
                <p className="text-[13px] font-medium truncate">{order.productTitle}</p>
                <p className="text-[11px] text-muted-foreground">{order.productSku}</p>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">{order.buyerName}</div>
              <div className="col-span-1 text-sm font-medium text-right">{order.quantity}</div>
              <div className="col-span-1 text-sm font-medium text-right">${order.totalPrice.toFixed(2)}</div>
              <div className="col-span-2">
                <Badge variant={statusConfig[order.status]?.variant || "secondary"}>
                  {statusConfig[order.status]?.label || order.status}
                </Badge>
              </div>
              <div className="col-span-1 text-[11px] text-muted-foreground text-right">
                {new Date(order.orderDate).toLocaleDateString()}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="No hay órdenes"
          description="Las órdenes aparecerán cuando compradores adquieran tus productos"
        />
      )}
    </div>
  );
}
