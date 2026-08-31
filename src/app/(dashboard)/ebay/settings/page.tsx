"use client";

import { useState } from "react";
import { ShoppingBag, CheckCircle, XCircle, RefreshCw, ExternalLink, Key, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Badge } from "@/components/ui";

export default function EbaySettings() {
  const [status, setStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [loading, setLoading] = useState(false);
  const [envInfo, setEnvInfo] = useState<any>(null);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ebay/auth");
      const data = await res.json();
      setEnvInfo(data);
      setStatus(data.connected ? "connected" : "disconnected");
    } catch {
      setStatus("disconnected");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ebay/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      setStatus(data.success ? "connected" : "disconnected");
    } catch {
      setStatus("disconnected");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración de eBay</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecta tu cuenta de eBay para publicar productos
        </p>
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-premium p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h3 className="font-semibold">Estado de Conexión</h3>
              <p className="text-sm text-muted-foreground">
                {status === "checking" ? "Sin verificar" : status === "connected" ? "Conectado" : "Desconectado"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={checkConnection} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={testConnection} disabled={loading}>
              Probar Conexión
            </Button>
          </div>
        </div>
      </motion.div>

      {/* API Info */}
      {envInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-premium p-6"
        >
          <h3 className="font-semibold mb-4">Información de la API</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Entorno</p>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium capitalize">{envInfo.environment}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">OAuth Token</p>
              <div className="flex items-center gap-2">
                {envInfo.hasOAuth ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <XCircle className="w-4 h-4 text-danger" />
                )}
                <span className="text-sm font-medium">{envInfo.hasOAuth ? "Configurado" : "No configurado"}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-premium p-6"
      >
        <h3 className="font-semibold mb-4">Cómo Configurar</h3>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">1</span>
            <span>Ve al eBay Developer Portal y crea una aplicación</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">2</span>
            <span>Genera un token OAuth con scopes de sell.inventory, sell.account, sell.fulfillment</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs flex items-center justify-center font-bold">3</span>
            <span>Copia el token y configúralo en el archivo .env.local</span>
          </li>
        </ol>
        <div className="mt-4">
          <a
            href="https://developer.ebay.com/my/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            Ir al Developer Portal <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}