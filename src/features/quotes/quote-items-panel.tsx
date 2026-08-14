"use client";

import { Plus } from "lucide-react";
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

function ItemFields({
  item,
}: {
  item?: Pick<
    QuoteItem,
    | "description"
    | "partNumber"
    | "quantity"
    | "unit"
    | "unitPrice"
    | "discountPercent"
    | "taxPercent"
    | "estimatedCost"
  >;
}) {
  return (
    <>
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          name="description"
          required
          minLength={2}
          defaultValue={item?.description}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="partNumber">N° parte</Label>
        <Input
          id="partNumber"
          name="partNumber"
          defaultValue={item?.partNumber ?? ""}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="quantity">Cantidad</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min="0"
          step="0.0001"
          required
          defaultValue={item?.quantity ?? "1"}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="unit">Unidad</Label>
        <Input id="unit" name="unit" defaultValue={item?.unit ?? "pza"} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="unitPrice">Precio unitario</Label>
        <Input
          id="unitPrice"
          name="unitPrice"
          type="number"
          min="0"
          step="0.0001"
          required
          defaultValue={item?.unitPrice ?? "0"}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="discountPercent">Desc. %</Label>
        <Input
          id="discountPercent"
          name="discountPercent"
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={item?.discountPercent ?? "0"}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="taxPercent">IVA %</Label>
        <Input
          id="taxPercent"
          name="taxPercent"
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={item?.taxPercent ?? "16"}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="estimatedCost">Costo est.</Label>
        <Input
          id="estimatedCost"
          name="estimatedCost"
          type="number"
          min="0"
          step="0.0001"
          defaultValue={item?.estimatedCost ?? "0"}
        />
      </div>
    </>
  );
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
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingItem = items.find((item) => item.id === editingId);

  async function run(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
    formData: FormData,
    onSuccess?: () => void,
  ) {
    setPending(true);
    setError(null);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo guardar.");
      return;
    }
    onSuccess?.();
    router.refresh();
  }

  function closeForms() {
    setAdding(false);
    setEditingId(null);
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
              <TableRow
                key={item.id}
                className={editingId === item.id ? "bg-muted/40" : undefined}
              >
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
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setAdding(false);
                          setError(null);
                          setEditingId(item.id);
                        }}
                      >
                        Editar
                      </Button>
                      <form
                        action={(formData) =>
                          run(deleteQuoteItemAction, formData, () => {
                            if (editingId === item.id) setEditingId(null);
                          })
                        }
                      >
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="quoteId" value={quoteId} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                        >
                          Quitar
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canWrite && adding ? (
        <form
          key="add-item"
          className="grid gap-3 rounded-lg border p-4 md:grid-cols-4"
          action={(formData) => run(addQuoteItemAction, formData, closeForms)}
        >
          <input type="hidden" name="quoteId" value={quoteId} />
          <p className="text-sm font-medium md:col-span-4">Nueva partida</p>
          <ItemFields />
          <div className="flex items-end gap-2 md:col-span-4">
            <Button type="submit" disabled={pending}>
              Agregar partida
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={closeForms}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {canWrite && editingItem ? (
        <form
          key={editingItem.id}
          className="grid gap-3 rounded-lg border p-4 md:grid-cols-4"
          action={(formData) =>
            run(updateQuoteItemAction, formData, closeForms)
          }
        >
          <input type="hidden" name="id" value={editingItem.id} />
          <input type="hidden" name="quoteId" value={quoteId} />
          <p className="text-sm font-medium md:col-span-4">Editar partida</p>
          <ItemFields item={editingItem} />
          <div className="flex items-end gap-2 md:col-span-4">
            <Button type="submit" disabled={pending}>
              Guardar cambios
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={closeForms}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {canWrite && !adding && !editingId ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setError(null);
            setAdding(true);
          }}
        >
          <Plus />
          Agregar partida
        </Button>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
