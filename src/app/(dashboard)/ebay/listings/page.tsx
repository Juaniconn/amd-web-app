"use client";

import { useState, useEffect, useMemo } from "react";
import { Package, Search, Filter, Eye, Edit, Trash2, ShoppingCart, ExternalLink, Check, Clock, Loader2, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button, Input, EmptyState } from "@/components/ui";

interface Listing {
  id: number;
  sku: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  manufacturer: string;
  model: string;
  image: string;
  status: "draft" | "published" | "ended";
  views: number;
  watchers: number;
  offerId?: string | null;
  publishedAt?: string | null;
}

interface Stats {
  total: number;
  draft: number;
  published: number;
  ended: number;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" as const },
  published: { label: "Publicado", variant: "default" as const },
  ended: { label: "Finalizado", variant: "destructive" as const },
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [publishing, setPublishing] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ebay/listings");
      const data = await res.json();
      setListings(data.listings || []);
      setStats(data.stats || null);
    } catch {
      showToast("Error al cargar listados", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      const matchSearch =
        !search ||
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.sku.toLowerCase().includes(search.toLowerCase()) ||
        l.manufacturer.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || l.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [listings, search, filterStatus]);

  const handlePublish = async (id: number) => {
    setPublishing(id);
    try {
      const res = await fetch("/api/ebay/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: id, action: "publish" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Listado publicado: ${data.listing?.title || id}`);
        fetchListings();
      } else {
        showToast(`Error: ${data.error}`, "error");
      }
    } catch {
      showToast("Error al publicar", "error");
    } finally {
      setPublishing(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 ${toast.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}
          >
            {toast.type === "success" ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Listados eBay</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona tus productos publicados en eBay
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={<RefreshCw className="w-4 h-4" />} onClick={fetchListings}>
              Actualizar
            </Button>
            <Button href="/ebay/new" icon={<Plus className="w-4 h-4" />}>
              Nuevo Listado
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats?.total || 0, icon: <Package className="w-4 h-4" />, color: "text-brand" },
          { label: "Borradores", value: stats?.draft || 0, icon: <Clock className="w-4 h-4" />, color: "text-warning" },
          { label: "Publicados", value: stats?.published || 0, icon: <Check className="w-4 h-4" />, color: "text-success" },
          { label: "Finalizados", value: stats?.ended || 0, icon: <ShoppingCart className="w-4 h-4" />, color: "text-danger" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card-premium p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card-premium p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar listado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            icon={<Filter className="w-3.5 h-3.5" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtros
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm outline-none focus:border-brand transition-colors"
                >
                  <option value="">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="ended">Finalizado</option>
                </select>
                <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(""); setSearch(""); }}>
                  Limpiar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          Mostrando {filtered.length} de {listings.length} listados
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-12 gap-4 bg-muted/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-4">Producto</div>
          <div className="col-span-2">SKU</div>
          <div className="col-span-1 text-right">Precio</div>
          <div className="col-span-1 text-right">Qty</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>
        <div className="divide-y divide-border">
          {filtered.map((listing, index) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              className="grid grid-cols-12 gap-4 items-center px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">{listing.title}</p>
                  <p className="text-[11px] text-muted-foreground">{listing.category}</p>
                </div>
              </div>
              <div className="col-span-2 text-sm font-mono text-muted-foreground">{listing.sku}</div>
              <div className="col-span-1 text-sm font-medium text-right">${listing.price.toFixed(2)}</div>
              <div className="col-span-1 text-sm font-medium text-right">{listing.quantity}</div>
              <div className="col-span-2">
                <Badge variant={statusConfig[listing.status]?.variant || "secondary"}>
                  {statusConfig[listing.status]?.label || listing.status}
                </Badge>
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                {listing.status !== "published" && (
                  <Button
                    variant="outline"
                    size="xs"
                    icon={publishing === listing.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                    onClick={() => handlePublish(listing.id)}
                    disabled={publishing === listing.id}
                  >
                    Publicar
                  </Button>
                )}
                <Link href={`/ebay/listings/${listing.id}`} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Eye className="w-4 h-4" />
                </Link>
                <Link href={`/ebay/inventory/${listing.id}/edit`} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Edit className="w-4 h-4" />
                </Link>
                <button className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title="No hay listados"
          description="Los listados se crean automáticamente desde tu inventario"
          action={<Button href="/ebay/new" icon={<Plus className="w-4 h-4" />}>Crear Listado</Button>}
        />
      )}
    </div>
  );
}
