"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Edit, Package, ShoppingCart, Calendar, Hash, Factory, Tag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Badge, Button } from "@/components/ui";

interface ProductDetail {
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

export default function InventoryDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const id = params.id;
        const res = await fetch(`/api/ebay/products/${id}`);
        const data = await res.json();
        if (data.product) {
          setProduct(data.product);
        }
      } catch {
        // Error
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params]);

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

  if (!product) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Producto no encontrado</p>
        <Link href="/ebay/inventory" className="text-brand text-sm mt-2 inline-block">Volver al inventario</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/ebay/inventory" className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">{product.producto}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
            {product.fabricante} · {product.modelo}
          </p>
        </div>
        <Link href={`/ebay/inventory/${product.id}/edit`}>
          <Button icon={<Edit className="w-4 h-4" />}>Editar</Button>
        </Link>
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
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">SKU</p>
                <p className="text-[13px] font-mono mt-0.5">{product.sku}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Categoría</p>
                <p className="text-[13px] mt-0.5">{product.categoria}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Fabricante</p>
                <p className="text-[13px] mt-0.5">{product.fabricante}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Modelo</p>
                <p className="text-[13px] font-mono mt-0.5">{product.modelo}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Cantidad</p>
                <p className="text-[13px] font-medium mt-0.5">{product.cantidad} unidades</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Estado</p>
                <Badge variant={product.status === "published" ? "default" : "secondary"}>
                  {product.status === "published" ? "Publicado" : "Borrador"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Price Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-medium mb-3">Precio</h2>
            <div className="text-3xl font-bold tracking-tight">${product.precio.toFixed(2)}</div>
            <p className="text-[12px] text-muted-foreground mt-1">USD</p>
          </div>

          {/* eBay Info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-medium mb-3">Información eBay</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Offer ID:</span>
                <span className="font-mono">{product.offerId || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Publicado:</span>
                <span>{product.publishedAt ? new Date(product.publishedAt).toLocaleDateString() : "No publicado"}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Acciones</h3>
            <div className="space-y-2">
              <Link href={`/ebay/inventory/${product.id}/edit`} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[13px] font-medium hover:bg-muted transition-colors">
                <Edit className="w-4 h-4 text-brand" />
                Editar Producto
              </Link>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[13px] font-medium hover:bg-muted transition-colors">
                <ShoppingCart className="w-4 h-4 text-success" />
                Publicar en eBay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
