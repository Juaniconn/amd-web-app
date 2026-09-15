"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Package, Globe, Hash, ImageIcon, Loader2, Tag, DollarSign, Plus } from "lucide-react";
import Link from "next/link";

type Product = {
  id: string;
  brand: string;
  partNumber: string;
  quantity: number;
  description: string;
  origin: string;
  image: string;
  ebayCategory?: string;
  ebayCategoryId?: number;
  estimatedPriceUSD?: number;
  keywords?: string;
};

export default function InventoryRealPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");

  useEffect(() => {
    fetch("/inventory-ebay.json")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const brands = useMemo(() => {
    const b = new Set(products.map((p) => p.brand).filter(Boolean));
    return ["all", ...Array.from(b).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBrand =
        selectedBrand === "all" || p.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    });
  }, [products, searchQuery, selectedBrand]);

  const stats = useMemo(() => ({
    totalProducts: filtered.length,
    totalQuantity: filtered.reduce((sum, p) => sum + p.quantity, 0),
    uniqueBrands: new Set(filtered.map((p) => p.brand)).size,
    totalValueUSD: filtered.reduce((sum, p) => sum + (p.estimatedPriceUSD || 0) * p.quantity, 0),
  }), [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Cargando inventario...</span>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">Inventario Real</h1>
        <p className="text-xs lg:text-sm text-muted-foreground">71 productos con fotos de etiquetas</p>
      </div>

      <div className="overflow-x-auto flex gap-3 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:gap-4">
        <div className="min-w-[160px] lg:min-w-0 rounded-xl border border-border/50 bg-card p-3 lg:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Total Productos</p>
              <p className="text-xl lg:text-2xl font-bold">{stats.totalProducts}</p>
            </div>
          </div>
        </div>
        <div className="min-w-[160px] lg:min-w-0 rounded-xl border border-border/50 bg-card p-3 lg:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Hash className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Total Unidades</p>
              <p className="text-xl lg:text-2xl font-bold">{stats.totalQuantity}</p>
            </div>
          </div>
        </div>
        <div className="min-w-[160px] lg:min-w-0 rounded-xl border border-border/50 bg-card p-3 lg:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Globe className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Marcas</p>
              <p className="text-xl lg:text-2xl font-bold">{stats.uniqueBrands}</p>
            </div>
          </div>
        </div>
        <div className="min-w-[160px] lg:min-w-0 rounded-xl border border-border/50 bg-card p-3 lg:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs lg:text-sm text-muted-foreground">Valor Estimado</p>
              <p className="text-xl lg:text-2xl font-bold">${stats.totalValueUSD.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 bg-background py-3 -mx-4 px-4 lg:mx-0 lg:px-0 space-y-2">
        <div className="flex gap-2 lg:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 lg:py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2.5 lg:py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            {brands.map((b) => (
              <option key={b} value={b}>{b === "all" ? "Todas" : b}</option>
            ))}
          </select>
        </div>
        {searchQuery && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &quot;{searchQuery}&quot;
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
        {filtered.map((product) => (
          <Link key={product.id} href={`/ebay/inventory/${product.id}`} className="group rounded-xl border border-border/50 bg-card overflow-hidden hover:border-primary/50 transition-all block">
            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.partNumber || product.description}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <ImageIcon className="h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white font-bold">
                x{product.quantity}
              </div>
              {product.estimatedPriceUSD && (
                <div className="absolute bottom-2 left-2 rounded-full bg-green-500/90 px-2.5 py-1 text-sm text-white font-bold shadow-lg">
                  ${product.estimatedPriceUSD}
                </div>
              )}
            </div>
            <div className="p-2.5 lg:p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{product.id}</span>
                <span className="text-[10px] text-muted-foreground truncate">{product.origin}</span>
              </div>
              <p className="text-xs lg:text-sm font-semibold text-foreground truncate">{product.brand || "Sin marca"}</p>
              <p className="text-[11px] lg:text-xs text-muted-foreground truncate">{product.partNumber || "Sin parte"}</p>
              <p className="text-[11px] lg:text-xs text-muted-foreground truncate">{product.description || "Sin descripción"}</p>
              {product.ebayCategory && (
                <div className="flex items-center gap-1 text-[10px] text-blue-500">
                  <Tag className="h-3 w-3" />
                  <span className="truncate">{product.ebayCategory}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mb-2" />
          <p>No se encontraron productos</p>
        </div>
      )}

      <button className="lg:hidden fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 active:scale-95 transition-transform">
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
