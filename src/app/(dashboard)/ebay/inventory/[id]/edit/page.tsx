"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Package, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Input, Textarea } from "@/components/ui";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [product, setProduct] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (params.id) {
      setId(params.id as string);
    }
  }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/ebay/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.product) {
          setProduct({
            sku: data.product.sku || "",
            title: data.product.producto || "",
            description: `${data.product.producto} - ${data.product.fabricante} ${data.product.modelo}`,
            manufacturer: data.product.fabricante || "",
            model: data.product.modelo || "",
            quantity: data.product.cantidad || 1,
            price: data.product.precio || 0,
            category: data.product.categoria || "",
            condition: "new",
          });
        }
      })
      .catch(() => showToast("Error al cargar producto", "error"));
  }, [id]);

  const handleSave = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ebay/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto: product.title,
          fabricante: product.manufacturer,
          modelo: product.model,
          cantidad: product.quantity,
          precio: product.price,
          categoria: product.category,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        showToast("Cambios guardados correctamente");
        setTimeout(() => setSaved(false), 2000);
      } else {
        showToast(`Error: ${data.error}`, "error");
      }
    } catch {
      showToast("Error al guardar", "error");
    }
    setSaving(false);
  };

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <Link
          href={`/ebay/inventory/${id}`}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">Editar Producto</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{product.sku}</p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-premium p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Título"
              value={product.title}
              onChange={(e) => setProduct({ ...product, title: e.target.value })}
            />
            <Input
              label="SKU"
              value={product.sku}
              onChange={(e) => setProduct({ ...product, sku: e.target.value })}
            />
            <Input
              label="Fabricante"
              value={product.manufacturer}
              onChange={(e) => setProduct({ ...product, manufacturer: e.target.value })}
            />
            <Input
              label="Modelo"
              value={product.model}
              onChange={(e) => setProduct({ ...product, model: e.target.value })}
            />
            <Input
              label="Cantidad"
              type="number"
              value={product.quantity}
              onChange={(e) => setProduct({ ...product, quantity: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Precio (USD)"
              type="number"
              value={product.price}
              onChange={(e) => setProduct({ ...product, price: parseFloat(e.target.value) || 0 })}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Descripción"
                value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-xl bg-success/10 text-success text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Cambios guardados
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 pt-4 border-t border-border">
            <Link href={`/ebay/inventory/${id}`}>
              <Button variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              loading={saving}
              icon={<Save className="w-4 h-4" />}
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
