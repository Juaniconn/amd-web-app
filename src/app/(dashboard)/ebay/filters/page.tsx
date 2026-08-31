"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, X, Package, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge, Button, Input } from "@/components/ui";
import Link from "next/link";

interface Product {
  id: number;
  sku: string;
  producto: string;
  fabricante: string;
  modelo: string;
  cantidad: number;
  categoria: string;
  precio: number;
  status: string;
}

export default function FiltersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchSKU, setSearchSKU] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedMfrs, setSelectedMfrs] = useState<Set<string>>(new Set());
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [selectedStatus, setSelectedStatus] = useState<Set<string>>(new Set());
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    fetch("/api/ebay/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const manufacturers = useMemo(() => Array.from(new Set(products.map((p) => p.fabricante).filter(Boolean))).sort(), [products]);
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.categoria).filter(Boolean))).sort(), [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSKU = !searchSKU || p.sku.toLowerCase().includes(searchSKU.toLowerCase());
      const matchProduct = !searchProduct || p.producto.toLowerCase().includes(searchProduct.toLowerCase());
      const matchMfr = selectedMfrs.size === 0 || selectedMfrs.has(p.fabricante);
      const matchCat = selectedCats.size === 0 || selectedCats.has(p.categoria);
      const matchStatus = selectedStatus.size === 0 || selectedStatus.has(p.status);
      const matchPriceMin = !priceMin || p.precio >= parseFloat(priceMin);
      const matchPriceMax = !priceMax || p.precio <= parseFloat(priceMax);
      return matchSKU && matchProduct && matchMfr && matchCat && matchStatus && matchPriceMin && matchPriceMax;
    });
  }, [products, searchSKU, searchProduct, selectedMfrs, selectedCats, selectedStatus, priceMin, priceMax]);

  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const newSet = new Set(set);
    if (newSet.has(value)) newSet.delete(value);
    else newSet.add(value);
    setter(newSet);
  };

  const clearAll = () => {
    setSearchSKU("");
    setSearchProduct("");
    setSelectedMfrs(new Set());
    setSelectedCats(new Set());
    setSelectedStatus(new Set());
    setPriceMin("");
    setPriceMax("");
  };

  if (loading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Filtros Avanzados</h1>
        <p className="text-sm text-muted-foreground mt-1">Busca y filtra productos por SKU, categoría, fabricante y más</p>
      </motion.div>

      {/* Search Bar */}
      <div className="card-premium p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por SKU..."
              value={searchSKU}
              onChange={(e) => setSearchSKU(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchProduct}
              onChange={(e) => setSearchProduct(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:border-brand"
            />
          </div>
          <Button variant="outline" icon={<Filter className="w-4 h-4" />} onClick={() => setShowFilters(!showFilters)}>
            Filtros
          </Button>
          <Button variant="ghost" onClick={clearAll}>Limpiar</Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 mt-4 border-t border-border">
                {/* Manufacturers */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fabricantes</p>
                  <div className="flex flex-wrap gap-1">
                    {manufacturers.slice(0, 6).map((mfr) => (
                      <button
                        key={mfr}
                        onClick={() => toggleFilter(selectedMfrs, mfr, setSelectedMfrs)}
                        className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${selectedMfrs.has(mfr) ? "bg-brand text-white border-brand" : "border-border hover:border-brand"}`}
                      >
                        {mfr}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Categories */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Categorías</p>
                  <div className="flex flex-wrap gap-1">
                    {categories.slice(0, 6).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => toggleFilter(selectedCats, cat, setSelectedCats)}
                        className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${selectedCats.has(cat) ? "bg-brand text-white border-brand" : "border-border hover:border-brand"}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Status */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Estado</p>
                  <div className="flex flex-wrap gap-1">
                    {["draft", "published", "ended"].map((status) => (
                      <button
                        key={status}
                        onClick={() => toggleFilter(selectedStatus, status, setSelectedStatus)}
                        className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${selectedStatus.has(status) ? "bg-brand text-white border-brand" : "border-border hover:border-brand"}`}
                      >
                        {status === "draft" ? "Borrador" : status === "published" ? "Publicado" : "Finalizado"}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Price Range */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rango de Precio</p>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="w-full px-2 py-1 rounded-lg border border-border bg-muted/50 text-sm" />
                    <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-full px-2 py-1 rounded-lg border border-border bg-muted/50 text-sm" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">{filtered.length} resultados</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((product) => (
          <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-premium p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13px] font-medium">{product.producto}</p>
                <p className="text-[11px] text-muted-foreground">{product.fabricante}</p>
              </div>
              <Badge variant={product.status === "published" ? "default" : "secondary"}>
                {product.status === "published" ? "Publicado" : "Borrador"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-muted-foreground">{product.sku}</span>
              <span className="font-medium">${product.precio.toFixed(2)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
