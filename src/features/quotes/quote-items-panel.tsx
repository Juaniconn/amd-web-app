"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addQuoteItemAction,
  deleteQuoteItemAction,
  updateQuoteItemAction,
} from "@/server/actions/quotes";

type QuoteItem = {
  id: string;
  description: string;
  partNumber: string | null;
  quantity: string;
  unit: string;
  unitPrice: string;
  discountPercent: string;
  taxPercent: string;
  estimatedCost: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
  lineEstimatedCost: string;
  lineProfit: string;
  lineMarginPercent: string | null;
};

function money(value: string | null, currency: string) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function QuoteItemsPanel({
  quoteId,
  currency,
  items,
  canWrite,
}: {
  quoteId: string;
  currency: string;
  items: QuoteItem[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>, formData: FormData) {
    setPending(true);
    setError(null);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo guardar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay partidas. Agrega piezas, cantidades y precios.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead>N° parte</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">P. unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Margen</TableHead>
              {canWrite ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell>{item.partNumber ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {Number(item.quantity)} {item.unit}
                </TableCell>
                <TableCell className="text-right">
                  {money(item.unitPrice, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {money(item.lineSubtotal, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {money(item.lineEstimatedCost, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {item.lineMarginPercent ? `${item.lineMarginPercent}%` : "—"}
                </TableCell>
                {canWrite ? (
                  <TableCell className="text-right">
                    <form
                      action={(formData) => run(deleteQuoteItemAction, formData)}
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="quoteId" value={quoteId} />
                      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                        Quitar
                      </Button>
                    </form>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canWrite ? (
        <form
          className="grid gap-3 rounded-lg border p-4 md:grid-cols-4"
          action={(formData) => run(addQuoteItemAction, formData)}
        >
          <input type="hidden" name="quoteId" value={quoteId} />
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" name="description" required minLength={2} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="partNumber">N° parte</Label>
            <Input id="partNumber" name="partNumber" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input id="quantity" name="quantity" type="number" min="0" step="0.0001" required defaultValue="1" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="unit">Unidad</Label>
            <Input id="unit" name="unit" defaultValue="pza" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="unitPrice">Precio unitario</Label>
            <Input id="unitPrice" name="unitPrice" type="number" min="0" step="0.0001" required defaultValue="0" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="discountPercent">Desc. %</Label>
            <Input id="discountPercent" name="discountPercent" type="number" min="0" max="100" step="0.01" defaultValue="0" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="taxPercent">IVA %</Label>
            <Input id="taxPercent" name="taxPercent" type="number" min="0" max="100" step="0.01" defaultValue="16" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="estimatedCost">Costo est.</Label>
            <Input id="estimatedCost" name="estimatedCost" type="number" min="0" step="0.0001" defaultValue="0" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              Agregar partida
            </Button>
          </div>
        </form>
      ) : null}

      {canWrite && items.length > 0 ? (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Editar una partida existente
          </summary>
          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <form
                key={item.id}
                className="grid gap-3 md:grid-cols-4"
                action={(formData) => run(updateQuoteItemAction, formData)}
              >
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="quoteId" value={quoteId} />
                <Input name="description" defaultValue={item.description} className="md:col-span-2" />
                <Input name="partNumber" defaultValue={item.partNumber ?? ""} placeholder="N° parte" />
                <Input name="quantity" type="number" step="0.0001" defaultValue={item.quantity} />
                <Input name="unit" defaultValue={item.unit} />
                <Input name="unitPrice" type="number" step="0.0001" defaultValue={item.unitPrice} />
                <Input name="discountPercent" type="number" step="0.01" defaultValue={item.discountPercent} />
                <Input name="taxPercent" type="number" step="0.01" defaultValue={item.taxPercent} />
                <Input name="estimatedCost" type="number" step="0.0001" defaultValue={item.estimatedCost} />
                <Button type="submit" variant="outline" disabled={pending}>
                  Guardar
                </Button>
              </form>
            ))}
          </div>
        </details>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
