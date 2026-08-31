"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Check, Clock, AlertTriangle, ShoppingCart, Package, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button } from "@/components/ui";

interface Notification {
  id: string;
  type: "order" | "listing" | "system" | "alert";
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    // Mock notifications
    const mock: Notification[] = [
      { id: "1", type: "order", title: "Nueva Orden", message: "Orden ORD-1000 recibida por $179.00", read: false, timestamp: "2026-08-31T21:24:36.884Z" },
      { id: "2", type: "listing", title: "Listing Publicado", message: "Polea Browning publicada exitosamente", read: false, timestamp: "2026-08-31T21:22:13.885Z" },
      { id: "3", type: "system", title: "Sincronización", message: "Sincronización completada: 32 productos", read: true, timestamp: "2026-08-31T20:00:00.000Z" },
      { id: "4", type: "alert", title: "Stock Bajo", message: "COUPLER Parker: solo 15 unidades", read: true, timestamp: "2026-08-31T18:30:00.000Z" },
      { id: "5", type: "order", title: "Orden Enviada", message: "Orden ORD-1001 marcada como enviada", read: true, timestamp: "2026-08-30T15:00:00.000Z" },
    ];
    setNotifications(mock);
    setLoading(false);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  const typeIcon = (type: string) => {
    if (type === "order") return <ShoppingCart className="w-4 h-4 text-success" />;
    if (type === "listing") return <Package className="w-4 h-4 text-brand" />;
    if (type === "alert") return <AlertTriangle className="w-4 h-4 text-warning" />;
    return <Bell className="w-4 h-4 text-muted-foreground" />;
  };

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notificaciones</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} sin leer` : "Todas leídas"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllRead} icon={<Check className="w-4 h-4" />}>
              Marcar todas
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === "all" ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Todas ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === "unread" ? "bg-brand text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Sin leer ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className={`card-premium p-4 flex items-start gap-4 ${!notification.read ? "border-brand/30 bg-brand/5" : ""}`}
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {typeIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium">{notification.title}</p>
                  {!notification.read && <span className="w-2 h-2 rounded-full bg-brand" />}
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">{notification.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1">
                {!notification.read && (
                  <button onClick={() => markAsRead(notification.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Marcar como leída">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => deleteNotification(notification.id)} className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <BellOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No hay notificaciones</p>
        </div>
      )}
    </div>
  );
}
