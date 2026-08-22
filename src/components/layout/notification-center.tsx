"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

type Notification = {
  id: string;
  type: "urgent" | "warning" | "success" | "info";
  title: string;
  description: string;
  time: string;
  href?: string;
};

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "urgent",
    title: "OT-2026-00003 vencida",
    description: "La orden de trabajo superó su fecha prometida",
    time: "hace 2h",
    href: "/production/demo-ot-3",
  },
  {
    id: "n2",
    type: "warning",
    title: "Material A36 bajo mínimo",
    description: "Stock actual: 45 kg · Mínimo: 100 kg",
    time: "hace 4h",
    href: "/inventory",
  },
  {
    id: "n3",
    type: "info",
    title: "OC-2026-00001 pendiente",
    description: "Aceros Nacionales · $12,500",
    time: "hace 1d",
    href: "/purchasing",
  },
  {
    id: "n4",
    type: "success",
    title: "OT-2026-00005 terminada",
    description: "Cierre físico completado",
    time: "hace 2d",
    href: "/production/demo-ot-5",
  },
];

const TYPE_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  warning: "border-l-amber-500",
  success: "border-l-green-500",
  info: "border-l-blue-500",
};

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const unread = SAMPLE_NOTIFICATIONS.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm border-l bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h3 className="text-sm font-medium">Notificaciones</h3>
            {unread > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                {unread}
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto">
          {SAMPLE_NOTIFICATIONS.map((notif) => (
            <div
              key={notif.id}
              className={`border-b border-l-4 px-4 py-3 hover:bg-muted/50 ${TYPE_COLORS[notif.type]}`}
            >
              <p className="text-sm font-medium">{notif.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{notif.description}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{notif.time}</p>
            </div>
          ))}
        </div>
        <div className="border-t px-4 py-2">
          <button className="w-full rounded-md bg-muted px-3 py-1.5 text-xs hover:bg-muted/80">
            Marcar como leídas
          </button>
        </div>
      </div>
    </div>
  );
}
