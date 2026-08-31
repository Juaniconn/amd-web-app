"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Edit, Trash2, Check, Package, Clock, Eye, ShoppingCart, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button } from "@/components/ui";

interface ListingDetail {
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
  status: string;
  views: number;
  watchers: number;
  offerId?: string | null;
  publishedAt?: string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" as const },
  published: { label: "Publicado", variant: "default" as const },
  ended: { label: "Finalizado", variant: "destructive" as const },
};

export default function ListingDetailPage() {
  const params = useParams();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const id = params.id;
        const res = await fetch(`/api/ebay/listings`);
        const data = await res.json();
        const found = data.listings?.find((l: ListingDetail) => l.id === parseInt(id as string));
        if (found) {
          setListing(found);
        }
      } catch {
        showToast("Error al cargar listado", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [params]);

  const handlePublish = async () => {
    if (!listing) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/ebay/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, action: "publish" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Listado publicado exitosamente");
        setListing({ ...listing, status: "published" });
      } else {
        showToast(`Error: ${data.error}`, "error");
      }
    } catch {
      showToast("Error al publicar", "error");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 animate-pulse rounded-xl bg-muted" />
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Listado no encontrado</p>
        <Link href="/ebay/listings" className="text-brand text-sm mt-2 inline-block">Volver a listados</Link>
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
      <div className="flex items-center gap-4">
        <Link href="/ebay/listings" className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{listing.title}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
            {listing.manufacturer} · {listing.model}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {listing.status !== "published" ? (
            <Button onClick={handlePublish} disabled={publishing} icon={publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}>
              Publicar en eBay
            </Button>
          ) : (
            <Badge variant="default">Publicado</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Image */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center">
              <Package className="w-16 h-16 text-muted-foreground/50" />
            </div>
          </div>

          {/* Details */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-medium mb-3">Detalles del Producto</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Categoría</p>
                <p className="text-[13px] mt-0.5">{listing.category}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Fabricante</p>
                <p className="text-[13px] mt-0.5">{listing.manufacturer}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Modelo</p>
                <p className="text-[13px] font-mono mt-0.5">{listing.model}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">SKU</p>
                <p className="text-[13px] font-mono mt-0.5">{listing.sku}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Cantidad</p>
                <p className="text-[13px] font-medium mt-0.5">{listing.quantity} unidades</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Estado</p>
                <Badge variant={statusConfig[listing.status]?.variant || "secondary"}>
                  {statusConfig[listing.status]?.label || listing.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-medium mb-3">Descripción</h2>
            <p className="text-sm text-muted-foreground">{listing.description}</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Price Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-medium mb-3">Precio</h2>
            <div className="text-3xl font-bold tracking-tight">${listing.price.toFixed(2)}</div>
            <p className="text-[12px] text-muted-foreground mt-1">USD</p>
          </div>

          {/* Stats Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-medium mb-3">Estadísticas</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Vistas</span>
                <span className="text-sm font-medium">{listing.views}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Watchers</span>
                <span className="text-sm font-medium">{listing.watchers}</span>
              </div>
              {listing.publishedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Publicado</span>
                  <span className="text-sm font-medium">{new Date(listing.publishedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Acciones Rápidas</h3>
            <div className="space-y-2">
              <Link href={`/ebay/inventory/${listing.id}/edit`} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[13px] font-medium hover:bg-muted transition-colors">
                <Edit className="w-4 h-4 text-brand" />
                Editar Producto
              </Link>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[13px] font-medium hover:bg-muted transition-colors">
                <Eye className="w-4 h-4 text-muted-foreground" />
                Ver en eBay
                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[13px] font-medium text-danger hover:bg-danger/10 transition-colors">
                <Trash2 className="w-4 h-4" />
                Eliminar Listado
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
