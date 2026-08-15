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
  kind?: string;
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

function DecimalInput({
  id,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <Input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      required={required}
      placeholder={placeholder}
      defaultValue={defaultValue ?? ""}
      onWheel={(event) => event.currentTarget.blur()}
    />
  );
}

function ItemFields({
  item,
  currency,
}: {
  currency: string;
  item?: Pick<
    QuoteItem,
    | "kind"
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
  const usd = currency.toLowerCase() === "usd";
  const taxDefault = usd ? "0" : item?.taxPercent;
  return (
    <>
      {item?.kind ? <input type="hidden" name="kind" value={item.kind} /> : null}
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
        <DecimalInput
          id="quantity"
          name="quantity"
          required
          placeholder="Ej. 13"
          defaultValue={item?.quantity}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="unit">Unidad</Label>
        <Input id="unit" name="unit" defaultValue={item?.unit ?? "pza"} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="unitPrice">Precio unitario</Label>
        <DecimalInput
          id="unitPrice"
          name="unitPrice"
          required
          placeholder="Escribe el precio"
          defaultValue={item?.unitPrice}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="discountPercent">Desc. %</Label>
        <DecimalInput
          id="discountPercent"
          name="discountPercent"
          placeholder="0"
          defaultValue={item?.discountPercent}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="taxPercent">IVA %</Label>
        {usd ? (
          <>
            <input type="hidden" name="taxPercent" value="0" />
            <Input id="taxPercent" value="0" disabled />
            <p className="text-xs text-muted-foreground">USD no cobra IVA.</p>
          </>
        ) : (
          <DecimalInput
            id="taxPercent"
            name="taxPercent"
            placeholder="16"
            defaultValue={taxDefault}
          />
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="estimatedCost">Costo est.</Label>
        <DecimalInput
          id="estimatedCost"
          name="estimatedCost"
          placeholder="0"
          defaultValue={item?.estimatedCost}
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
  lockedReason,
}: {
  quoteId: string;
  currency: string;
  items: QuoteItem[];
  canWrite: boolean;
  lockedReason?: string;
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
      {lockedReason ? (
        <p className="text-sm text-muted-foreground">{lockedReason}</p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay partidas. Agrega piezas, cantidades y precios.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
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
                <TableCell>
                  {item.kind === "servicio_ingenieria" ? "Servicio ING" : "Pieza"}
                </TableCell>
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
          <ItemFields currency={currency} />
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
          <ItemFields currency={currency} item={editingItem} />
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
