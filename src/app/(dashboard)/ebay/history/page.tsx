"use client";

import { useState, useEffect } from "react";
import { Clock, Check, X, Package, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Badge, Button } from "@/components/ui";

interface HistoryEntry {
  id: number;
  action: string;
  product: string;
  sku: string;
  status: "success" | "error" | "pending";
  timestamp: string;
  details?: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate mock history from published items
    const mockHistory: HistoryEntry[] = [
      { id: 1, action: "Publicar", product: "COUPLER Parker 14-5BP", sku: "14-5BP", status: "success", timestamp: "2026-08-31T21:22:13.885Z", details: "Publicado exitosamente" },
      { id: 2, action: "Editar", product: "Polea Browning NSS2030X15", sku: "NSS2030X15", status: "success", timestamp: "2026-08-31T21:22:52.262Z", details: "Cambios guardados" },
      { id: 3, action: "Eliminar", product: "Producto Test", sku: "TES-MTHQUVWD", status: "success", timestamp: "2026-08-31T21:22:13.900Z", details: "Producto eliminado" },
      { id: 4, action: "Publicar", product: "SUPPORT UNIT", sku: "WBK12S-01", status: "error", timestamp: "2026-08-30T15:30:00.000Z", details: "Error de API" },
      { id: 5, action: "Sincronizar", product: "Todos los productos", sku: "-", status: "pending", timestamp: "2026-08-29T10:00:00.000Z", details: "En progreso" },
    ];
    setHistory(mockHistory);
    setLoading(false);
  }, []);

  const statusIcon = (status: string) => {
    if (status === "success") return <Check className="w-4 h-4 text-success" />;
    if (status === "error") return <X className="w-4 h-4 text-danger" />;
    return <Clock className="w-4 h-4 text-warning" />;
  };

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Historial de Publicaciones</h1>
            <p className="text-sm text-muted-foreground mt-1">Registro de acciones en eBay</p>
          </div>
          <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />}>Actualizar</Button>
        </div>
      </motion.div>

      <div className="space-y-3">
        {history.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-premium p-4 flex items-center gap-4"
          >
            {statusIcon(entry.status)}
            <div className="flex-1">
              <p className="text-[13px] font-medium">{entry.action}: {entry.product}</p>
              <p className="text-[11px] text-muted-foreground">{entry.details}</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-mono text-muted-foreground">{entry.sku}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
