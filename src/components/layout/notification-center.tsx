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

type Alert = {
  id: string;
  tone: "urgent" | "warning" | "info" | "success";
  title: string;
  description: string;
  href: string;
};

const TONE_STYLES: Record<string, { border: string; icon: React.ReactNode }> = {
  urgent: {
    border: "border-l-red-500",
    icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  },
  warning: {
    border: "border-l-amber-500",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  },
  info: {
    border: "border-l-blue-500",
    icon: <Info className="h-3.5 w-3.5 text-blue-500" />,
  },
  success: {
    border: "border-l-green-500",
    icon: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  },
};

export function NotificationCenter({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => setAlerts(data.alerts ?? []))
      .catch(() => setAlerts([]))
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

  const urgent = alerts.filter((a) => a.tone === "urgent").length;
  const warning = alerts.filter((a) => a.tone === "warning").length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex w-full max-w-sm flex-col border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="text-sm font-medium">Alertas</h3>
            {alerts.length > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {alerts.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {alerts.length > 0 && (
          <div className="flex gap-3 border-b px-4 py-2 text-[10px] text-muted-foreground">
            {urgent > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {urgent} urgente{urgent === 1 ? "" : "s"}
              </span>
            )}
            {warning > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {warning} advertencia{warning === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando alertas...
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 px-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium">Todo en orden</p>
              <p className="text-xs text-muted-foreground">
                Sin atrasos, sin material faltante, sin incidencias.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const style = TONE_STYLES[alert.tone] ?? TONE_STYLES.info;
              return (
                <button
                  key={alert.id}
                  onClick={() => {
                    router.push(alert.href);
                    onClose();
                  }}
                  className={`flex w-full items-start gap-2 border-b border-l-4 px-4 py-3 text-left hover:bg-muted/50 ${style.border}`}
                >
                  <span className="mt-0.5 shrink-0">{style.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{alert.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {alert.description}
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
              router.push("/dashboard");
              onClose();
            }}
            className="w-full rounded-md bg-muted px-3 py-1.5 text-xs hover:bg-muted/80"
          >
            Ver dashboard completo
          </button>
        </div>
      </div>
    </div>
  );
}
