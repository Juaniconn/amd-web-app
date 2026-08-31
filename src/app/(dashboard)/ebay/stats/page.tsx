"use client";

import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Package, Eye, ShoppingCart, BarChart3, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui";

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ebay/listings")
      .then((r) => r.json())
      .then((data) => {
        const listings = data.listings || [];
        const totalViews = listings.reduce((sum: number, l: any) => sum + (l.views || 0), 0);
        const totalWatchers = listings.reduce((sum: number, l: any) => sum + (l.watchers || 0), 0);
        const totalValue = listings.reduce((sum: number, l: any) => sum + (l.price || 0) * (l.quantity || 1), 0);
        const avgPrice = listings.length > 0 ? totalValue / listings.length : 0;

        setStats({
          totalListings: listings.length,
          published: listings.filter((l: any) => l.status === "published").length,
          draft: listings.filter((l: any) => l.status === "draft").length,
          totalViews,
          totalWatchers,
          totalValue,
          avgPrice,
          topCategories: [
            { name: "Industrial", count: 15 },
            { name: "Automatización", count: 8 },
            { name: "Electrónica", count: 5 },
            { name: "Mecánico", count: 4 },
          ],
          monthlySales: [
            { month: "Ene", sales: 1200 },
            { month: "Feb", sales: 1800 },
            { month: "Mar", sales: 2400 },
            { month: "Abr", sales: 2100 },
            { month: "May", sales: 3000 },
            { month: "Jun", sales: 2800 },
          ],
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Estadísticas Avanzadas</h1>
        <p className="text-sm text-muted-foreground mt-1">Análisis de rendimiento en eBay</p>
      </motion.div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Listados", value: stats?.totalListings || 0, icon: <Package className="w-4 h-4" />, color: "text-brand" },
          { label: "Vistas Totales", value: stats?.totalViews || 0, icon: <Eye className="w-4 h-4" />, color: "text-accent-light" },
          { label: "Watchers", value: stats?.totalWatchers || 0, icon: <ShoppingCart className="w-4 h-4" />, color: "text-warning" },
          { label: "Valor Total", value: `$${stats?.totalValue?.toLocaleString() || 0}`, icon: <DollarSign className="w-4 h-4" />, color: "text-success" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card-premium p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-premium p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand" />
            Ventas Mensuales
          </h2>
          <div className="flex items-end gap-2 h-40">
            {stats?.monthlySales.map((m: any, i: number) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-brand to-accent-light transition-all hover:opacity-80"
                  style={{ height: `${(m.sales / 3000) * 100}%` }}
                />
                <span className="text-[10px] text-muted-foreground">{m.month}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Categories */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card-premium p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-brand" />
            Categorías Top
          </h2>
          <div className="space-y-3">
            {stats?.topCategories.map((cat: any, i: number) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-[12px] w-24 truncate">{cat.name}</span>
                <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-accent-light"
                    style={{ width: `${(cat.count / 15) * 100}%` }}
                  />
                </div>
                <span className="text-[12px] font-medium w-8 text-right">{cat.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Performance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card-premium p-6">
        <h2 className="text-sm font-semibold mb-4">Rendimiento por Producto</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-[11px] font-semibold text-muted-foreground uppercase">Producto</th>
                <th className="text-right py-2 text-[11px] font-semibold text-muted-foreground uppercase">Vistas</th>
                <th className="text-right py-2 text-[11px] font-semibold text-muted-foreground uppercase">Watchers</th>
                <th className="text-right py-2 text-[11px] font-semibold text-muted-foreground uppercase">Precio Prom.</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2">Polea Browning NSS2030X15</td>
                <td className="py-2 text-right">142</td>
                <td className="py-2 text-right">18</td>
                <td className="py-2 text-right">$89.50</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2">COUPLER Parker 14-5BP</td>
                <td className="py-2 text-right">98</td>
                <td className="py-2 text-right">12</td>
                <td className="py-2 text-right">$49.99</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
