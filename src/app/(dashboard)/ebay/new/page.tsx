"use client";

import { useState, useRef } from "react";
import { Camera, Upload, X, Package, Sparkles, Loader2, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Textarea } from "@/components/ui";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState({
    sku: "",
    title: "",
    description: "",
    manufacturer: "",
    model: "",
    quantity: 1,
    price: 0,
    category: "",
  });
  const [analyzed, setAnalyzed] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ebay/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = await res.json();
      if (data.success) {
        setProduct({
          ...product,
          title: data.product.title,
          description: data.product.description,
          manufacturer: data.product.manufacturer,
          model: data.product.model,
          category: data.product.category,
        });
        setAnalyzed(true);
        showToast("Análisis completado");
      }
    } catch {
      showToast("Error al analizar imágenes", "error");
    }
    setAnalyzing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product.title) {
      showToast("El título es requerido", "error");
      return;
    }
    if (!product.price || product.price <= 0) {
      showToast("El precio es requerido", "error");
      return;
    }
    if (!product.quantity || product.quantity < 1) {
      showToast("La cantidad es requerida", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/ebay/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Producto guardado correctamente");
        setTimeout(() => router.push("/ebay/inventory"), 1000);
      } else {
        showToast(`Error: ${data.error}`, "error");
      }
    } catch {
      showToast("Error al guardar", "error");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 ${toast.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}
          >
            {toast.type === "success" ? "✓" : "✕"} {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4">
          <Link href="/ebay/inventory" className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agregar Producto</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Toma fotos del producto para que la IA lo analice automáticamente
            </p>
          </div>
        </div>
      </motion.div>

      {/* Camera / Upload */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-premium p-6">
          <h2 className="text-sm font-semibold mb-4">Fotos del Producto</h2>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {images.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square rounded-xl overflow-hidden border border-border group"
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-brand hover:bg-muted/30 flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <Camera className="w-6 h-6 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Tomar foto</span>
            </motion.button>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleCapture}
            className="hidden"
          />

          {images.length > 0 && (
            <Button
              onClick={analyzeImages}
              loading={analyzing}
              icon={<Sparkles className="w-4 h-4" />}
            >
              {analyzing ? "Analizando..." : "Analizar con IA"}
            </Button>
          )}

          {analyzed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-xl bg-success/10 text-success text-[12px] flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Análisis completado. Los campos se han llenado automáticamente.
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <form onSubmit={handleSubmit}>
          <div className="card-premium p-6">
            <h2 className="text-sm font-semibold mb-4">Información del Producto</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="SKU (opcional)"
                value={product.sku}
                onChange={(e) => setProduct({ ...product, sku: e.target.value })}
                placeholder="Se genera automáticamente"
              />
              <Input
                label="Fabricante"
                value={product.manufacturer}
                onChange={(e) => setProduct({ ...product, manufacturer: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Título *"
                  value={product.title}
                  onChange={(e) => setProduct({ ...product, title: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Descripción"
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Input
                label="Cantidad *"
                type="number"
                value={product.quantity}
                onChange={(e) => setProduct({ ...product, quantity: parseInt(e.target.value) || 1 })}
                min="1"
                required
              />
              <Input
                label="Precio (USD) *"
                type="number"
                value={product.price}
                onChange={(e) => setProduct({ ...product, price: parseFloat(e.target.value) || 0 })}
                min="0.01"
                step="0.01"
                required
              />
              <Input
                label="Modelo"
                value={product.model}
                onChange={(e) => setProduct({ ...product, model: e.target.value })}
              />
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Categoría</label>
                <select
                  value={product.category}
                  onChange={(e) => setProduct({ ...product, category: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm outline-none focus:border-brand transition-colors"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Mecánico">Mecánico</option>
                  <option value="Automatización">Automatización</option>
                  <option value="Hidráulico">Hidráulico</option>
                  <option value="Neumático">Neumático</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => router.push("/ebay/inventory")}>
                Cancelar
              </Button>
              <Button type="submit" loading={saving}>
                Guardar Producto
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
