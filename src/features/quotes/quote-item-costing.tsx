"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { displayMoney } from "@/lib/quotes/money";
import type { QuoteItemCosting } from "@/lib/quotes/costing";
import {
  attachEngineeringDocumentAction,
  deleteQuoteItemDocumentAction,
  recalculateQuoteItemAction,
  uploadQuoteItemDocumentAction,
} from "@/server/actions/quotes";

type Doc = {
  id: string;
  originalName: string;
  sizeBytes: number;
};

export function QuoteItemCostingPanel({
  quoteId,
  itemId,
  currency,
  quantity,
  costing,
  documents,
  engineeringDocuments,
  canWrite,
  title,
  onCancel,
}: {
  quoteId: string;
  itemId: string;
  currency: string;
  quantity: string;
  costing: QuoteItemCosting | null;
  documents: Doc[];
  engineeringDocuments: Doc[];
  canWrite: boolean;
  title?: string;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const breakdown = costing?.breakdown;

  async function run(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
    formData: FormData,
  ) {
    setPending(true);
    setError(null);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo completar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4 md:col-span-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {title ? `${title} · plano y calculadora` : "Plano y calculadora"}
          </p>
          <p className="text-xs text-muted-foreground">
            El estimado nace del PDF (agente de cotizaciones). Aquí puedes adjuntar
            el plano o un DXF y recalcular. El preliminar de mercado no usa proveedores
            hasta que Dirección entregue la lista.
          </p>
        </div>
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>

      {(costing?.material_code || costing?.supplier_name || costing?.cad) ? (
        <div className="grid gap-2 rounded-lg border bg-background px-3 py-2 text-sm sm:grid-cols-3">
          <p>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Material
            </span>
            <span className="mt-0.5 block">{costing.material ?? "—"}</span>
          </p>
          <p>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Proveedor
            </span>
            <span className="mt-0.5 block">{costing.supplier_name ?? "—"}</span>
          </p>
          <p>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Piezas / hoja
            </span>
            <span className="mt-0.5 block">
              {costing.pieces_per_stock ?? "Sin dato de hoja"}
            </span>
          </p>
          {costing.cad?.volume_mm3 ? (
            <p className="sm:col-span-3 text-xs text-muted-foreground">
              CAD · {costing.cad.solids ?? 0} sólido(s) · volumen{" "}
              {Math.round(costing.cad.volume_mm3)} mm³
              {costing.cad.note ? ` · ${costing.cad.note}` : ""}
            </p>
          ) : costing.cad?.note ? (
            <p className="sm:col-span-3 text-xs text-muted-foreground">{costing.cad.note}</p>
          ) : null}
        </div>
      ) : null}

      {costing?.catalog ? (
        <p className="text-xs text-muted-foreground">
          {costing.catalog.materialLabel ? (
            <>
              Material{" "}
              {costing.catalog.materialId ? (
                <a
                  className="underline-offset-4 hover:underline"
                  href={`/inventory/materials/${costing.catalog.materialId}`}
                >
                  {costing.catalog.materialLabel}
                </a>
              ) : (
                costing.catalog.materialLabel
              )}
              {costing.catalog.costPerKg != null
                ? ` · ${costing.catalog.costPerKg} MXN/kg`
                : ""}
              {" · "}
            </>
          ) : null}
          {costing.catalog.supplierName ? (
            <>
              {costing.catalog.supplierId ? (
                <a
                  className="underline-offset-4 hover:underline"
                  href={`/suppliers/${costing.catalog.supplierId}`}
                >
                  {costing.catalog.supplierName}
                </a>
              ) : (
                costing.catalog.supplierName
              )}
              {" · "}
            </>
          ) : null}
          {costing.catalog.laserName ? (
            <>
              Láser{" "}
              {costing.catalog.laserMachineId ? (
                <a
                  className="underline-offset-4 hover:underline"
                  href={`/machines/${costing.catalog.laserMachineId}`}
                >
                  {costing.catalog.laserName}
                </a>
              ) : (
                costing.catalog.laserName
              )}
              {" · "}
            </>
          ) : null}
          {costing.catalog.pressName ? (
            <>
              Doblez{" "}
              {costing.catalog.pressBrakeId ? (
                <a
                  className="underline-offset-4 hover:underline"
                  href={`/machines/${costing.catalog.pressBrakeId}`}
                >
                  {costing.catalog.pressName}
                </a>
              ) : (
                costing.catalog.pressName
              )}
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Catálogos:{" "}
          <a className="underline-offset-4 hover:underline" href="/settings/calculator">
            Calculadora
          </a>
        </p>
      )}

      {documents.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2">
              <a className="underline-offset-4 hover:underline" href={`/api/documents/${doc.id}`}>
                {doc.originalName}
              </a>
              {canWrite ? (
                <form action={(formData) => run(deleteQuoteItemDocumentAction, formData)}>
                  <input type="hidden" name="id" value={doc.id} />
                  <input type="hidden" name="quoteId" value={quoteId} />
                  <input type="hidden" name="itemId" value={itemId} />
                  <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                    Quitar
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Sin plano PDF en esta partida.</p>
      )}

      {canWrite ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(uploadQuoteItemDocumentAction, new FormData(event.currentTarget));
          }}
        >
          <input type="hidden" name="quoteId" value={quoteId} />
          <input type="hidden" name="itemId" value={itemId} />
          <div className="space-y-1">
            <Label htmlFor={`file-${itemId}`}>Plano PDF o DXF</Label>
            <Input
              id={`file-${itemId}`}
              name="file"
              type="file"
              accept=".pdf,.dxf"
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            Subir archivo
          </Button>
        </form>
      ) : null}

      {canWrite && engineeringDocuments.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Desde ingeniería
          </p>
          <ul className="space-y-1 text-sm">
            {engineeringDocuments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-2">
                <span>{doc.originalName}</span>
                <form action={(formData) => run(attachEngineeringDocumentAction, formData)}>
                  <input type="hidden" name="quoteId" value={quoteId} />
                  <input type="hidden" name="itemId" value={itemId} />
                  <input type="hidden" name="documentId" value={doc.id} />
                  <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                    Usar en esta partida
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {canWrite ? (
        <form
          className="grid gap-3 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(recalculateQuoteItemAction, new FormData(event.currentTarget));
          }}
        >
          <input type="hidden" name="quoteId" value={quoteId} />
          <input type="hidden" name="itemId" value={itemId} />
          <Field
            id={`cost-qty-${itemId}`}
            label="Cantidad"
            name="quantity"
            defaultValue={String(costing?.quantity ?? quantity ?? "1")}
          />
          <Field
            id={`cost-weight-${itemId}`}
            label="Peso lb"
            name="unit_weight_lb"
            defaultValue={num(costing?.unit_weight_lb)}
          />
          <Field
            id={`cost-scrap-${itemId}`}
            label="Scrap lb"
            name="scrap_weight_lb"
            defaultValue={num(costing?.scrap_weight_lb)}
          />
          <Field
            id={`cost-cut-${itemId}`}
            label="Corte in"
            name="cut_length_in"
            defaultValue={num(costing?.cut_length_in)}
          />
          <Field id={`cost-holes-${itemId}`} label="Hoyos" name="holes" defaultValue={num(costing?.holes)} />
          <Field id={`cost-bends-${itemId}`} label="Doblez" name="bends" defaultValue={num(costing?.bends)} />
          <Field
            id={`cost-hems-${itemId}`}
            label="Hems"
            name="hem_count"
            defaultValue={num(costing?.hem_count)}
          />
          <Field
            id={`cost-thk-${itemId}`}
            label="Espesor in"
            name="thickness_in"
            defaultValue={num(costing?.thickness_in)}
          />
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`finish-${itemId}`}>Acabado</Label>
            <Input
              id={`finish-${itemId}`}
              name="finish"
              defaultValue={costing?.finish ?? ""}
              placeholder="POWDER COAT"
            />
          </div>
          <Field
            id={`cost-margin-${itemId}`}
            label="Margen %"
            name="margin_pct"
            defaultValue={String(costing?.margin_pct ?? "")}
          />
          <div className="flex items-end sm:col-span-4">
            <Button type="submit" disabled={pending}>
              Calcular precio
            </Button>
          </div>
        </form>
      ) : null}

      {breakdown ? (
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <p>Material {displayMoney(breakdown.material_cost, currency)}</p>
          <p>Corte {displayMoney(breakdown.cut_cost, currency)}</p>
          <p>Doblez {displayMoney(breakdown.bend_cost, currency)}</p>
          <p>Acabado {displayMoney(breakdown.finish_cost, currency)}</p>
          <p>CAM {displayMoney(breakdown.engineering_cost, currency)}</p>
          <p>Empaque {displayMoney(breakdown.packing_cost, currency)}</p>
          <p className="font-medium sm:col-span-3">
            Precio unitario {displayMoney(breakdown.unit_price, currency)} · Lote{" "}
            {displayMoney(breakdown.total, currency)}
          </p>
          {breakdown.warnings.length > 0 ? (
            <p className="text-xs text-muted-foreground sm:col-span-3">
              {breakdown.warnings.join(" ")}
            </p>
          ) : null}
          {costing?.cut_length_basis ? (
            <p className="text-xs text-muted-foreground sm:col-span-3">
              {costing.cut_length_basis}
            </p>
          ) : null}
        </div>
      ) : null}

      {(costing?.processes?.length ?? 0) > 0 ? (
        <div>
          <p className="text-sm font-medium">Procesos de esta partida</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {costing?.processes?.map((step) => (
              <li key={step.position}>
                {step.name}
                {step.notes ? ` — ${step.notes}` : ""}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  name,
  defaultValue,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        inputMode="decimal"
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}

function num(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return String(value);
}
