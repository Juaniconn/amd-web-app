"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Package, Eye, Edit, Trash2, Search, Filter, Factory, DollarSign, Archive, ShoppingCart, ChevronLeft, ChevronRight, Loader2, Plus, Download, Upload, Check } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button, Input, EmptyState } from "@/components/ui";

interface InventoryItem {
  id: number;
  imagen: string;
  producto: string;
  fabricante: string;
  modelo: string;
  cantidad: number;
  categoria: string;
  precio: number;
  sku: string;
  status: string;
  createdAt?: string | null;
  offerId?: string | null;
  publishedAt?: string | null;
}

const ITEMS_PER_PAGE = 10;

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMfr, setFilterMfr] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/ebay/products");
      const data = await res.json();
      setItems(data.products || []);
    } catch {
      showToast("Error al cargar inventario", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const manufacturers = useMemo(() => {
    const set = new Set(items.map((i) => i.fabricante).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.categoria).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const matchSearch =
        !search ||
        p.producto.toLowerCase().includes(search.toLowerCase()) ||
        p.fabricante.toLowerCase().includes(search.toLowerCase()) ||
        p.modelo.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchMfr = !filterMfr || p.fabricante === filterMfr;
      const matchCat = !filterCat || p.categoria === filterCat;
      const matchStatus = !filterStatus || p.status === filterStatus;
      return matchSearch && matchMfr && matchCat && matchStatus;
    });
  }, [items, search, filterMfr, filterCat, filterStatus]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedItems = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const stats = {
    total: items.length,
    published: items.filter((i) => i.status === "published").length,
    draft: items.filter((i) => i.status === "draft").length,
    totalValue: items.reduce((sum, i) => sum + (i.precio || 0) * (i.cantidad || 1), 0),
  };

  const handleDelete = async (id: number, producto: string) => {
    if (!confirm(`¿Eliminar "${producto}"? Esta acción no se puede deshacer.`)) return;
    
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ebay/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`"${producto}" eliminado`);
        await fetchData();
      } else {
        showToast(`Error: ${data.error}`, "error");
      }
    } catch {
      showToast("Error al eliminar", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    if (selectedItems.size === paginatedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedItems.map((i) => i.id)));
    }
  };

  const handleBulkPublish = async () => {
    showToast(`Publicando ${selectedItems.size} productos...`);
    setSelectedItems(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedItems.size} productos?`)) return;
    showToast(`Eliminando ${selectedItems.size} productos...`);
    setSelectedItems(new Set());
  };

  const exportCSV = () => {
    const headers = ["SKU", "Producto", "Fabricante", "Modelo", "Cantidad", "Precio", "Categoría", "Estado"];
    const rows = filtered.map((i) => [i.sku, i.producto, i.fabricante, i.modelo, i.cantidad, i.precio, i.categoria, i.status]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ebay-inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportado correctamente");
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
            {toast.type === "success" ? <Check className="w-4 h-4" /> : "✕"} {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventario eBay</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Administra tus productos y publícalos en eBay
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={exportCSV}>
              Exportar CSV
            </Button>
            <Button href="/ebay/new" icon={<Plus className="w-4 h-4" />}>
              Agregar Producto
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Productos", value: stats.total, icon: <Package className="w-4 h-4" />, color: "text-brand" },
          { label: "Publicados", value: stats.published, icon: <ShoppingCart className="w-4 h-4" />, color: "text-success" },
          { label: "Borradores", value: stats.draft, icon: <Archive className="w-4 h-4" />, color: "text-warning" },
          { label: "Valor Total", value: `$${stats.totalValue.toLocaleString()}`, icon: <DollarSign className="w-4 h-4" />, color: "text-accent-light" },
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
      <div className="card-premium">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por SKU, producto, fabricante..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>
          <select
            value={filterMfr}
            onChange={(e) => { setFilterMfr(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm outline-none focus:border-brand transition-colors"
          >
            <option value="">Todos los fabricantes</option>
            {manufacturers.map((mfr) => (
              <option key={mfr} value={mfr}>{mfr}</option>
            ))}
          </select>
          <select
            value={filterCat}
            onChange={(e) => { setFilterCat(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm outline-none focus:border-brand transition-colors"
          >
            <option value="">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm outline-none focus:border-brand transition-colors"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            <option value="ended">Finalizado</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-premium p-4 flex items-center justify-between"
        >
          <span className="text-sm font-medium">{selectedItems.size} seleccionados</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<ShoppingCart className="w-3 h-3" />} onClick={handleBulkPublish}>
              Publicar
            </Button>
            <Button variant="outline" size="sm" icon={<Trash2 className="w-3 h-3" />} onClick={handleBulkDelete}>
              Eliminar
            </Button>
          </div>
        </motion.div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
        </p>
        {totalPages > 1 && (
          <p className="text-[12px] text-muted-foreground">Pág {currentPage}/{totalPages}</p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid grid-cols-12 gap-4 bg-muted/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-1">
            <input type="checkbox" checked={selectedItems.size === paginatedItems.length && paginatedItems.length > 0} onChange={selectAll} className="rounded" />
          </div>
          <div className="col-span-3">Producto</div>
          <div className="col-span-2">Fabricante</div>
          <div className="col-span-2">Modelo/SKU</div>
          <div className="col-span-1 text-right">Qty</div>
          <div className="col-span-1 text-right">Precio</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>
        <div className="divide-y divide-border">
          {paginatedItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              className="grid grid-cols-12 gap-4 items-center px-5 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="col-span-1">
                <input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="rounded" />
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[13px] font-medium">{item.producto}</p>
                  <p className="text-[11px] text-muted-foreground">{item.categoria}</p>
                </div>
              </div>
              <div className="col-span-2 text-sm text-muted-foreground">{item.fabricante}</div>
              <div className="col-span-2 text-sm font-mono text-muted-foreground">{item.modelo}</div>
              <div className="col-span-1 text-sm font-medium text-right">{item.cantidad}</div>
              <div className="col-span-1 text-sm font-medium text-right">${item.precio.toFixed(2)}</div>
              <div className="col-span-2 flex items-center justify-end gap-1">
                {item.status === "published" ? (
                  <Badge variant="secondary" className="bg-success/10 text-success">Publicado</Badge>
                ) : (
                  <Badge variant="outline">Borrador</Badge>
                )}
                <Link href={`/ebay/inventory/${item.id}`} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Eye className="w-4 h-4" />
                </Link>
                <Link href={`/ebay/inventory/${item.id}/edit`} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(item.id, item.producto)}
                  disabled={deletingId === item.id}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger disabled:opacity-50 transition-colors"
                >
                  {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="No se encontraron productos"
          description="Intenta ajustar los filtros o agrega nuevos productos"
          action={<Button href="/ebay/new" icon={<Plus className="w-4 h-4" />}>Agregar Producto</Button>}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="w-9 h-9 p-0"
            >
              {page}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
