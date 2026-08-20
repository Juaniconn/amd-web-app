"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PAYMENT_TERM_LABELS,
  PAYMENT_TERMS,
  TAX_PERCENTS,
  type PaymentTerm,
} from "@/lib/quotes/commercial";
import { MoneyInput } from "@/components/ui/money-input";
import { parseMoney } from "@/lib/quotes/money";
import {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
} from "@/server/actions/purchasing";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm";

type Line = {
  materialId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxPercent: string;
};

type Props = {
  mode: "create" | "edit";
  purchaseOrderId?: string;
  suppliers: { id: string; code: string; legalName: string; paymentTerm: string | null }[];
  branches: { id: string; code: string; name: string }[];
  materials: { id: string; code: string; description: string; supplierId?: string | null }[];
  defaultValues?: {
    supplierId?: string;
    branchId?: string;
    expectedDate?: string;
    currency?: "mxn" | "usd";
    paymentTerm?: PaymentTerm;
    isUrgent?: boolean;
    urgentReason?: string;
    notes?: string;
    items?: Line[];
  };
};

const emptyLine = (): Line => ({
  materialId: "",
  description: "",
  quantity: "1",
  unitPrice: "0.00",
  taxPercent: "16",
});

export function PurchaseOrderForm({
  mode,
  purchaseOrderId,
  suppliers,
  branches,
  materials,
  defaultValues,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [supplierId, setSupplierId] = useState(defaultValues?.supplierId ?? "");
  const [branchId, setBranchId] = useState(defaultValues?.branchId ?? "");
  const [expectedDate, setExpectedDate] = useState(defaultValues?.expectedDate ?? "");
  const [currency, setCurrency] = useState<"mxn" | "usd">(defaultValues?.currency ?? "mxn");
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm>(
    defaultValues?.paymentTerm ?? "net_30",
  );
  const [isUrgent, setIsUrgent] = useState(defaultValues?.isUrgent ?? false);
  const [urgentReason, setUrgentReason] = useState(defaultValues?.urgentReason ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [items, setItems] = useState<Line[]>(
    defaultValues?.items?.length ? defaultValues.items : [emptyLine()],
  );

  function updateLine(index: number, patch: Partial<Line>) {
    setItems((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const payload = {
      supplierId,
      branchId: branchId || undefined,
      expectedDate: expectedDate || undefined,
      currency,
      paymentTerm,
      isUrgent,
      urgentReason: urgentReason || undefined,
      notes: notes || undefined,
      items: items.map((line) => ({
        materialId: line.materialId,
        description: line.description || undefined,
        quantity: Number(line.quantity),
        unitPrice: parseMoney(line.unitPrice),
        taxPercent: Number(line.taxPercent),
      })),
    };
    const result =
      mode === "create"
        ? await createPurchaseOrderAction(payload)
        : await updatePurchaseOrderAction({ ...payload, id: purchaseOrderId });
    setPending(false);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="supplierId">Proveedor</Label>
          <select
            id="supplierId"
            className={selectClassName}
            value={supplierId}
            onChange={(event) => {
              const next = event.target.value;
              setSupplierId(next);
              const supplier = suppliers.find((row) => row.id === next);
              if (supplier?.paymentTerm) {
                setPaymentTerm(supplier.paymentTerm as PaymentTerm);
              }
              setItems((current) =>
                current.map((line) => {
                  const material = materials.find((row) => row.id === line.materialId);
                  if (material && material.supplierId === next) return line;
                  return { ...emptyLine(), taxPercent: line.taxPercent };
                }),
              );
            }}
            required
          >
            <option value="">Selecciona proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.code} · {supplier.legalName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="branchId">Sucursal que compra</Label>
          <select
            id="branchId"
            className={selectClassName}
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          >
            <option value="">Sin sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code} · {branch.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="expectedDate">Fecha esperada</Label>
          <Input
            id="expectedDate"
            type="date"
            value={expectedDate}
            onChange={(event) => setExpectedDate(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="currency">Moneda</Label>
          <select
            id="currency"
            className={selectClassName}
            value={currency}
            onChange={(event) => setCurrency(event.target.value as "mxn" | "usd")}
          >
            <option value="mxn">MXN</option>
            <option value="usd">USD</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="paymentTerm">Condiciones de pago</Label>
          <select
            id="paymentTerm"
            className={selectClassName}
            value={paymentTerm}
            onChange={(event) => setPaymentTerm(event.target.value as PaymentTerm)}
          >
            {PAYMENT_TERMS.map((term) => (
              <option key={term} value={term}>
                {PAYMENT_TERM_LABELS[term]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(event) => setIsUrgent(event.target.checked)}
          />
          Compra urgente
        </label>
      </div>
      {isUrgent ? (
        <div className="space-y-1">
          <Label htmlFor="urgentReason">Motivo de urgencia</Label>
          <Input
            id="urgentReason"
            value={urgentReason}
            onChange={(event) => setUrgentReason(event.target.value)}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Partidas</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, emptyLine()])}>
            Agregar partida
          </Button>
        </div>
        {items.map((line, index) => {
          const supplierMaterials = supplierId
            ? materials.filter((row) => row.supplierId === supplierId)
            : [];
          return (
          <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-12">
            <div className="sm:col-span-4 space-y-1">
              <Label>Material</Label>
              <select
                className={selectClassName}
                value={line.materialId}
                onChange={(event) => {
                  const material = supplierMaterials.find((row) => row.id === event.target.value);
                  updateLine(index, {
                    materialId: event.target.value,
                    description: material?.description ?? line.description,
                  });
                }}
                required
                disabled={!supplierId}
              >
                <option value="">
                  {supplierId
                    ? supplierMaterials.length === 0
                      ? "Este proveedor no tiene materiales en inventario"
                      : "Selecciona"
                    : "Elige un proveedor primero"}
                </option>
                {supplierMaterials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.code} · {material.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label>Descripción</Label>
              <Input
                value={line.description}
                onChange={(event) => updateLine(index, { description: event.target.value })}
              />
            </div>
            <div className="sm:col-span-1 space-y-1">
              <Label>Cant.</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={line.quantity}
                onChange={(event) => updateLine(index, { quantity: event.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Precio</Label>
              <MoneyInput
                currency={currency}
                value={line.unitPrice}
                onChange={(next) => updateLine(index, { unitPrice: next })}
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>IVA</Label>
              <select
                className={selectClassName}
                value={line.taxPercent}
                onChange={(event) => updateLine(index, { taxPercent: event.target.value })}
              >
                {TAX_PERCENTS.map((tax) => (
                  <option key={tax} value={String(tax)}>
                    {tax}%
                  </option>
                ))}
              </select>
            </div>
            {items.length > 1 ? (
              <div className="sm:col-span-12">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                >
                  Quitar partida
                </Button>
              </div>
            ) : null}
          </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {mode === "create" ? "Crear orden de compra" : "Guardar orden de compra"}
      </Button>
    </form>
  );
}
