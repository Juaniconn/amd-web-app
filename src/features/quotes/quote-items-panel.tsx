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
import { TAX_PERCENTS } from "@/lib/quotes/commercial";
import { MoneyInput } from "@/components/ui/money-input";
import { displayQty, inputQty } from "@/lib/inventory/catalog";
import { displayMoney, inputMoney } from "@/lib/quotes/money";
import type { QuoteItemCosting } from "@/lib/quotes/costing";
import type { QuoteAgentPreview } from "@/lib/quotes/market-preview";
import { QuoteDrawingIntake } from "@/features/quotes/quote-drawing-intake";
import { QuoteItemCostingPanel } from "@/features/quotes/quote-item-costing";
import { rfqBlocksEngineering, type RfqType } from "@/lib/quotes/rfq";
import {
  addQuoteItemAction,
  deleteQuoteItemAction,
  updateQuoteItemAction,
} from "@/server/actions/quotes";

type QuoteItem = {
  id: string;
  position?: number;
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
  costing?: QuoteItemCosting | null;
  documents?: { id: string; originalName: string; sizeBytes: number }[];
};

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

function MoneyField({
  id,
  name,
  currency,
  defaultValue,
  required,
}: {
  id: string;
  name: string;
  currency: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ? inputMoney(defaultValue) : "");
  return (
    <MoneyInput
      id={id}
      name={name}
      currency={currency}
      value={value}
      onChange={setValue}
      required={required}
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
  const taxValue = item?.taxPercent
    ? String(Number(item.taxPercent))
    : currency.toLowerCase() === "usd"
      ? "0"
      : "16";
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
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min="1"
          step="1"
          required
          placeholder="Ej. 13"
          defaultValue={item ? inputQty(item.quantity) : ""}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="unit">Unidad</Label>
        <Input id="unit" name="unit" defaultValue={item?.unit ?? "pza"} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="unitPrice">Precio unitario</Label>
        <MoneyField
          id="unitPrice"
          name="unitPrice"
          currency={currency}
          defaultValue={item?.unitPrice ?? "0"}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="discountPercent">Desc. %</Label>
        <DecimalInput
          id="discountPercent"
          name="discountPercent"
          placeholder="0"
          defaultValue={item ? String(Number(item.discountPercent) || 0) : ""}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="taxPercent">IVA %</Label>
        <select
          id="taxPercent"
          name="taxPercent"
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          defaultValue={taxValue}
        >
          {TAX_PERCENTS.map((percent) => (
            <option key={percent} value={percent}>
              {percent}%
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name="estimatedCost" value="0" />
    </>
  );
}

export function QuoteItemsPanel({
  quoteId,
  currency,
  items,
  canWrite,
  lockedReason,
  engineeringDocuments = [],
  rfqType = "solo_fabricacion",
  engineeringReleased = false,
  preview = null,
}: {
  quoteId: string;
  currency: string;
  items: QuoteItem[];
  canWrite: boolean;
  lockedReason?: string;
  engineeringDocuments?: { id: string; originalName: string; sizeBytes: number }[];
  rfqType?: RfqType | string;
  engineeringReleased?: boolean;
  preview?: QuoteAgentPreview | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filesItemId, setFilesItemId] = useState<string | null>(null);
  const editingItem = items.find((item) => item.id === editingId);
  const filesItem = items.find((item) => item.id === filesItemId);

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
      {canWrite && rfqBlocksEngineering(rfqType as RfqType) ? (
        <QuoteDrawingIntake
          quoteId={quoteId}
          canWrite={canWrite}
          variant="solo_fabricacion"
          currency={currency}
          preview={preview}
        />
      ) : null}
      {canWrite && !rfqBlocksEngineering(rfqType as RfqType) && engineeringReleased ? (
        <QuoteDrawingIntake
          quoteId={quoteId}
          canWrite={canWrite}
          variant="ingenieria"
          currency={currency}
          preview={preview}
        />
      ) : null}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {rfqBlocksEngineering(rfqType as RfqType)
            ? "Aún no hay partidas. Sube PDF (o un ZIP) y pulsa Calcular preliminar."
            : lockedReason
              ? "Las partidas se generan solas cuando Ingeniería libera el plano."
              : "Aún no hay partidas."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>N° parte</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">P. unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead>Archivos</TableHead>
              {canWrite ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className={
                  editingId === item.id || filesItemId === item.id ? "bg-muted/40" : undefined
                }
              >
                <TableCell>{item.position ?? "—"}</TableCell>
                <TableCell>
                  {item.kind === "servicio_ingenieria" ? "Servicio ING" : "Pieza"}
                </TableCell>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell>{item.partNumber ?? "—"}</TableCell>
                <TableCell>
                  {item.costing?.material_code ?? item.costing?.material ?? "—"}
                </TableCell>
                <TableCell>{item.costing?.supplier_name ?? "—"}</TableCell>
                <TableCell className="text-right">
                  {displayQty(item.quantity)} {item.unit}
                </TableCell>
                <TableCell className="text-right">
                  {displayMoney(item.unitPrice, currency)}
                </TableCell>
                <TableCell className="text-right">
                  {displayMoney(item.lineSubtotal, currency)}
                </TableCell>
                <TableCell>
                  {item.kind === "servicio_ingenieria"
                    ? "—"
                    : `${item.documents?.length ?? 0} archivo(s)`}
                </TableCell>
                {canWrite ? (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {item.kind !== "servicio_ingenieria" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            setAdding(false);
                            setEditingId(null);
                            setError(null);
                            setFilesItemId(item.id);
                          }}
                        >
                          {canWrite ? "Editar archivos" : "Ver archivos"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setAdding(false);
                          setFilesItemId(null);
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
                            if (filesItemId === item.id) setFilesItemId(null);
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

      {items.some((item) => (item.costing?.processes?.length ?? 0) > 0) ? (
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Procesos</p>
            <p className="text-xs text-muted-foreground">
              Se arman al leer el PDF. El operador los verá en el número de
              parte.
            </p>
          </div>
          <ol className="space-y-3">
            {items
              .filter((item) => item.kind !== "servicio_ingenieria")
              .map((item) => (
                <li key={item.id}>
                  <p className="text-sm font-medium">
                    {item.partNumber || item.description}
                    {item.costing?.pieces_per_stock
                      ? ` · ${item.costing.pieces_per_stock} pza / hoja`
                      : ""}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {(item.costing?.processes ?? []).map((step) => (
                      <li key={`${item.id}-${step.position}`}>
                        {step.position}. {step.name}
                        {step.notes ? ` — ${step.notes}` : ""}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
          </ol>
        </div>
      ) : null}

      {filesItem && filesItem.kind !== "servicio_ingenieria" ? (
        <QuoteItemCostingPanel
          quoteId={quoteId}
          itemId={filesItem.id}
          currency={currency}
          quantity={filesItem.quantity}
          costing={filesItem.costing ?? null}
          documents={filesItem.documents ?? []}
          engineeringDocuments={engineeringDocuments}
          canWrite={canWrite}
          title={`#${filesItem.position ?? ""} ${filesItem.partNumber || filesItem.description}`}
          onCancel={() => setFilesItemId(null)}
        />
      ) : null}

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
        <>
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
        </>
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
