"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Loader2,
} from "lucide-react";

type Notification = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
};

const SEVERITY_STYLES: Record<string, { border: string; icon: React.ReactNode }> = {
  error: {
    border: "border-l-red-500",
    icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  },
  warning: {
    border: "border-l-amber-500",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  },
  success: {
    border: "border-l-green-500",
    icon: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  },
  info: {
    border: "border-l-blue-500",
    icon: <Info className="h-3.5 w-3.5 text-blue-500" />,
  },
};

function buildHref(n: Notification): string {
  if (n.entityType === "production_order" && n.entityId) {
    return `/production/order/${n.entityId}`;
  }
  if (n.entityType === "order" && n.entityId) {
    return `/production/order/${n.entityId}`;
  }
  if (n.entityType === "customer" && n.entityId) {
    return `/customers/${n.entityId}`;
  }
  return "/dashboard";
}

export function NotificationCenter({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex w-full max-w-sm flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="text-sm font-medium">Notificaciones</h3>
            {unread > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando notificaciones...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium">Todo en orden</p>
              <p className="text-xs text-muted-foreground">
                Sin notificaciones pendientes.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const style = SEVERITY_STYLES[n.severity] ?? SEVERITY_STYLES.info;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    router.push(buildHref(n));
                    onClose();
                  }}
                  className={`flex w-full items-start gap-2 border-b border-l-4 px-4 py-3 text-left hover:bg-muted/50 ${style.border}`}
                >
                  <span className="mt-0.5 shrink-0">{style.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {n.message}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t px-4 py-2">
          <button
            onClick={() => {
              fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "markAllRead" }),
              });
              setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            }}
            className="w-full rounded-md bg-muted px-3 py-1.5 text-xs hover:bg-muted/80"
          >
            Marcar todas como leídas
          </button>
        </div>
      </div>
    </div>
  );
}
