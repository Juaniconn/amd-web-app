"use client";

import { useState } from "react";
import { Users, Plus, Check, X, Settings, Trash2, Globe, Key } from "lucide-react";
import { motion } from "framer-motion";
import { Badge, Button, Input } from "@/components/ui";

interface EbayAccount {
  id: string;
  name: string;
  email: string;
  environment: "sandbox" | "production";
  status: "active" | "inactive" | "error";
  listings: number;
  orders: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<EbayAccount[]>([
    { id: "1", name: "AMD Principal", email: "admin@amd.com", environment: "sandbox", status: "active", listings: 32, orders: 5 },
    { id: "2", name: "AMD México", email: "ventas@amd.com", environment: "sandbox", status: "inactive", listings: 0, orders: 0 },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", email: "", environment: "sandbox" });

  const handleAddAccount = () => {
    if (!newAccount.name || !newAccount.email) return;
    const account: EbayAccount = {
      id: String(accounts.length + 1),
      name: newAccount.name,
      email: newAccount.email,
      environment: newAccount.environment as "sandbox" | "production",
      status: "inactive",
      listings: 0,
      orders: 0,
    };
    setAccounts([...accounts, account]);
    setNewAccount({ name: "", email: "", environment: "sandbox" });
    setShowAdd(false);
  };

  const removeAccount = (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id));
  };

  const toggleStatus = (id: string) => {
    setAccounts(accounts.map((a) => a.id === id ? { ...a, status: a.status === "active" ? "inactive" : "active" } : a));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Multi-cuenta eBay</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestiona múltiples cuentas de eBay</p>
          </div>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            Agregar Cuenta
          </Button>
        </div>
      </motion.div>

      {/* Add Account Form */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="card-premium p-6">
          <h2 className="text-sm font-semibold mb-4">Nueva Cuenta eBay</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nombre" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} placeholder="Mi cuenta eBay" />
            <Input label="Email" value={newAccount.email} onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })} placeholder="email@ejemplo.com" />
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Entorno</label>
              <select value={newAccount.environment} onChange={(e) => setNewAccount({ ...newAccount, environment: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm">
                <option value="sandbox">Sandbox (Pruebas)</option>
                <option value="production">Production (Real)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAddAccount}>Agregar</Button>
          </div>
        </motion.div>
      )}

      {/* Accounts List */}
      <div className="space-y-4">
        {accounts.map((account, index) => (
          <motion.div
            key={account.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card-premium p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${account.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{account.name}</h3>
                  <p className="text-sm text-muted-foreground">{account.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={account.environment === "production" ? "default" : "secondary"}>
                      {account.environment === "production" ? "Production" : "Sandbox"}
                    </Badge>
                    <Badge variant={account.status === "active" ? "default" : "outline"}>
                      {account.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleStatus(account.id)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Activar/Desactivar">
                  {account.status === "active" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
                <button className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Configurar">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => removeAccount(account.id)} className="p-2 rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Listados</p>
                <p className="text-lg font-semibold">{account.listings}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Órdenes</p>
                <p className="text-lg font-semibold">{account.orders}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Estado</p>
                <p className={`text-lg font-semibold ${account.status === "active" ? "text-success" : "text-muted-foreground"}`}>
                  {account.status === "active" ? "Conectado" : "Desconectado"}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
