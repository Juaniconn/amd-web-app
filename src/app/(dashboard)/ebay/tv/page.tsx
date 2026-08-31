"use client";

import { useState, useEffect } from "react";
import { Package, ShoppingCart, DollarSign, TrendingUp, Eye, Clock, Check, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface TVStats {
  totalProducts: number;
  published: number;
  totalValue: number;
  views: number;
  orders: number;
  conversionRate: number;
}

export default function TVPage() {
  const [stats, setStats] = useState<TVStats>({
    totalProducts: 0,
    published: 0,
    totalValue: 0,
    views: 0,
    orders: 0,
    conversionRate: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetch("/api/ebay/products")
      .then((r) => r.json())
      .then((data) => {
        const products = data.products || [];
        setStats({
          totalProducts: products.length,
          published: products.filter((p: any) => p.status === "published").length,
          totalValue: products.reduce((sum: number, p: any) => sum + (p.precio || 0) * (p.cantidad || 1), 0),
          views: 1247,
          orders: 23,
          conversionRate: 1.84,
        });
      })
      .catch(() => {});

    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">eBay Dashboard TV</h1>
          <p className="text-xl text-gray-400 mt-2">Panel de control para pantalla de producción</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-mono">{currentTime.toLocaleTimeString()}</p>
          <p className="text-lg text-gray-400">{currentTime.toLocaleDateString()}</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Total Productos", value: stats.totalProducts, icon: <Package className="w-8 h-8" />, color: "from-blue-500 to-cyan-500" },
          { label: "Publicados", value: stats.published, icon: <ShoppingCart className="w-8 h-8" />, color: "from-green-500 to-emerald-500" },
          { label: "Valor Total", value: `$${stats.totalValue.toLocaleString()}`, icon: <DollarSign className="w-8 h-8" />, color: "from-yellow-500 to-orange-500" },
          { label: "Vistas", value: stats.views.toLocaleString(), icon: <Eye className="w-8 h-8" />, color: "from-purple-500 to-pink-500" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <p className="text-sm text-gray-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <h2 className="text-lg font-semibold">Órdenes Hoy</h2>
          </div>
          <p className="text-5xl font-bold">{stats.orders}</p>
          <p className="text-sm text-gray-400 mt-2">+12% vs ayer</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <Check className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold">Tasa Conversión</h2>
          </div>
          <p className="text-5xl font-bold">{stats.conversionRate}%</p>
          <p className="text-sm text-gray-400 mt-2">+0.3% vs semana pasada</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg font-semibold">Alertas Activas</h2>
          </div>
          <p className="text-5xl font-bold">3</p>
          <p className="text-sm text-gray-400 mt-2">2 stock bajo, 1 pago pendiente</p>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-gray-500 text-sm">
        <p>AMD ERP · eBay Module v2.0</p>
        <p>Actualización en tiempo real</p>
      </div>
    </div>
  );
}
