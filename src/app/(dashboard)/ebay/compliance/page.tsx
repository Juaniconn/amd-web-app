"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Mail, MessageSquare, Check, Clock, AlertTriangle, Settings, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Badge } from "@/components/ui";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  type: "email" | "push" | "sms";
}

export default function CompliancePage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    { id: "new_order", label: "Nuevas Órdenes", description: "Recibe notificación cuando haya una nueva orden", enabled: true, type: "email" },
    { id: "order_shipped", label: "Orden Enviada", description: "Notificación cuando se envía una orden", enabled: true, type: "push" },
    { id: "low_stock", label: "Stock Bajo", description: "Alerta cuando el stock esté por debajo del mínimo", enabled: true, type: "email" },
    { id: "listing_ended", label: "Listing Finalizado", description: "Notificación cuando un listing termina", enabled: false, type: "push" },
    { id: "price_change", label: "Cambio de Precio", description: "Alerta cuando cambia un precio de la competencia", enabled: false, type: "email" },
    { id: "compliance_alert", label: "Alertas de Compliance", description: "Notificaciones sobre políticas de eBay", enabled: true, type: "email" },
  ]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSetting = (id: string) => {
    setSettings(settings.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    showToast("Configuración guardada correctamente");
    setTimeout(() => setSaved(false), 2000);
  };

  const complianceStatus = [
    { label: "Política de Devoluciones", status: "compliant", detail: "ReturnsAccepted - 30 días" },
    { label: "Política de Envío", status: "compliant", detail: "UPS Ground - Envío gratis" },
    { label: "Política de Pagos", status: "warning", detail: "PayPal requerido" },
    { label: "Categoría Principal", status: "compliant", detail: "Industrial / COUPLER" },
  ];

  const statusColors: Record<string, string> = {
    compliant: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    error: "text-danger bg-danger/10",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compliance & Notificaciones</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configura las notificaciones y revisa el estado de compliance
            </p>
          </div>
          <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
            Guardar
          </Button>
        </div>
      </motion.div>

      {saved && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-success/10 text-success text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          Configuración guardada correctamente
        </motion.div>
      )}

      {/* Compliance Status */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-premium p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Estado de Compliance
        </h2>
        <div className="space-y-3">
          {complianceStatus.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <p className="text-[13px] font-medium">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.detail}</p>
              </div>
              <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${statusColors[item.status]}`}>
                {item.status === "compliant" ? "Cumple" : item.status === "warning" ? "Advertencia" : "Error"}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Notification Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-premium p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand" />
          Configuración de Notificaciones
        </h2>
        <div className="space-y-3">
          {settings.map((setting) => (
            <div key={setting.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${setting.enabled ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"}`}>
                  {setting.type === "email" ? <Mail className="w-4 h-4" /> : setting.type === "push" ? <MessageSquare className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-[13px] font-medium">{setting.label}</p>
                  <p className="text-[11px] text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleSetting(setting.id)}
                className={`w-11 h-6 rounded-full transition-colors ${setting.enabled ? "bg-brand" : "bg-muted"} relative`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${setting.enabled ? "right-1" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Notification History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-premium p-6">
        <h2 className="text-sm font-semibold mb-4">Historial Reciente</h2>
        <div className="space-y-2">
          {[
            { time: "Hace 2 horas", message: "Nueva orden recibida: PO-12345", type: "success" },
            { time: "Hace 5 horas", message: "Stock bajo: COUPLER Parker 14-5BP (15 unidades)", type: "warning" },
            { time: "Ayer", message: "Listing finalizado: POLEA BROWNING", type: "info" },
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-2 text-sm">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{item.time}</span>
              <span className="text-[13px]">{item.message}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
