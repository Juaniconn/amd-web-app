"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { displayQty } from "@/lib/inventory/catalog";
import {
  addOrderMaterialAction,
  consumeOrderMaterialAction,
  consumeAllOrderMaterialsAction,
  removeOrderMaterialAction,
  reserveOrderMaterialsAction,
} from "@/server/actions/inventory";
import { requestOrderMaterialsAction } from "@/server/actions/purchasing";
import {
  PURCHASE_REQUEST_STATUS_LABELS,
  type PurchaseRequestStatus,
} from "@/lib/purchasing/catalog";

type Line = {
  id: string;
  materialCode: string;
  materialDescription: string;
  unitCode: string;
  requiredQty: string;
  reservedQty: string;
  consumedQty: string;
  available: string;
  shortage: string;
  consumable: string;
  covered: boolean;
};

type MissingMaterial = {
  code: string;
  description: string;
  shortage: string;
  available: string;
  unitCode: string;
};

export function ProductionMaterialsPanel({
  orderId,
  lines,
  materials,
  canReserve,
  canConsume,
  loadError,
  requests = [],
  canReadPurchasing = false,
}: {
  orderId: string;
  lines: Line[];
  materials: { id: string; code: string; description: string; unitCode: string }[];
  canReserve: boolean;
  canConsume: boolean;
  loadError?: string | null;
  requests?: {
    id: string;
    number: string;
    status: string;
  }[];
  canReadPurchasing?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [missing, setMissing] = useState<MissingMaterial[]>([]);
  const [pending, setPending] = useState(false);

  async function run(
    action: (formData: FormData) => Promise<{
      ok: boolean;
      error?: string;
      shortage?: boolean;
      covered?: boolean;
      waitingApplied?: boolean;
      releasedFromWait?: boolean;
      missing?: MissingMaterial[];
      number?: string;
    }>,
    formData: FormData,
  ) {
    setPending(true);
    setError(null);
    setInfo(null);
    setMissing([]);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo completar.");
      return;
    }
    if (result.missing && result.missing.length > 0) {
      setMissing(result.missing);
      setInfo(
        result.waitingApplied
          ? "No hay disponibilidad suficiente. Los números de parte Liberada pasaron a Esperando Material."
          : "No hay disponibilidad suficiente para cubrir todo el material.",
      );
    } else if (result.covered) {
      setInfo(
        result.releasedFromWait
          ? "Material completo. Los números de parte en espera volvieron a Liberada."
          : "Material cubierto y reservado para los números de parte de esta OT.",
      );
    } else if (result.number) {
      setInfo(`Solicitud ${result.number} creada como borrador para Compras.`);
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        El material de la cotización llega aquí. Reserva si hay existencia. Si falta,
        genera la solicitud de compra. Cuando todos los números de parte estén
        terminados, consume todo para cerrar el material de la OT.
      </p>
      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {canReserve
            ? "Sin material declarado. Elige un material del catálogo, indica la cantidad y agrégalo a esta orden."
            : "Sin material declarado. Quien edite la orden o reserve inventario puede agregar las líneas aquí."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3">Material</th>
                <th className="py-2 pr-3">Requerido</th>
                <th className="py-2 pr-3">Reservado</th>
                <th className="py-2 pr-3">Consumido</th>
                <th className="py-2 pr-3">Disponible</th>
                <th className="py-2 pr-3">Faltante</th>
                <th className="py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    <span className="font-medium">{line.materialCode}</span>
                    <span className="block text-muted-foreground">
                      {line.materialDescription}
                    </span>
                    {line.covered ? (
                      <Badge variant="secondary" className="mt-1">
                        Cubierto
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1">
                        Falta disponibilidad
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {displayQty(line.requiredQty)} {line.unitCode}
                  </td>
                  <td className="py-2 pr-3">{displayQty(line.reservedQty)}</td>
                  <td className="py-2 pr-3">{displayQty(line.consumedQty)}</td>
                  <td className="py-2 pr-3">{displayQty(line.available)}</td>
                  <td className="py-2 pr-3">{displayQty(line.shortage)}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {canReserve ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            const formData = new FormData();
                            formData.set("orderId", orderId);
                            formData.set("lineId", line.id);
                            void run(reserveOrderMaterialsAction, formData);
                          }}
                        >
                          <Button type="submit" size="xs" variant="outline" disabled={pending}>
                            Reservar
                          </Button>
                        </form>
                      ) : null}
                      {canConsume ? (
                        <form
                          className="flex items-center gap-1"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void run(
                              consumeOrderMaterialAction,
                              new FormData(event.currentTarget),
                            );
                          }}
                        >
                          <input type="hidden" name="lineId" value={line.id} />
                          <Input
                            name="quantity"
                            inputMode="decimal"
                            placeholder={displayQty(line.consumable)}
                            className="h-7 w-20"
                            required
                          />
                          <Button type="submit" size="xs" disabled={pending}>
                            Consumir
                          </Button>
                        </form>
                      ) : null}
                      {canReserve ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            const formData = new FormData();
                            formData.set("id", line.id);
                            void run(removeOrderMaterialAction, formData);
                          }}
                        >
                          <Button
                            type="submit"
                            size="xs"
                            variant="ghost"
                            disabled={pending}
                          >
                            Quitar
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canReserve ? (
        <div className="flex flex-wrap items-end gap-2">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void run(addOrderMaterialAction, new FormData(event.currentTarget));
            }}
          >
            <input type="hidden" name="orderId" value={orderId} />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Material</label>
              <select
                name="materialId"
                required
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="">Seleccionar</option>
                {materials.length === 0 ? (
                  <option value="" disabled>
                    No hay materiales activos
                  </option>
                ) : (
                  materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.code} · {material.description} ({material.unitCode})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Cantidad</label>
              <Input name="quantity" inputMode="decimal" className="h-8 w-24" required />
            </div>
            <Button type="submit" variant="outline" disabled={pending}>
              Agregar material
            </Button>
          </form>
          {lines.length > 0 ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData();
                formData.set("orderId", orderId);
                void run(reserveOrderMaterialsAction, formData);
              }}
            >
              <Button type="submit" disabled={pending}>
                Reservar todo
              </Button>
            </form>
          ) : null}
          {canConsume && lines.some((line) => Number(line.consumable) > 0) ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData();
                formData.set("orderId", orderId);
                void run(consumeAllOrderMaterialsAction, formData);
              }}
            >
              <Button type="submit" disabled={pending}>
                Consumir todo
              </Button>
            </form>
          ) : null}
          {lines.some((line) => !line.covered) ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData();
                formData.set("orderId", orderId);
                void run(requestOrderMaterialsAction, formData);
              }}
            >
              <Button type="submit" variant="outline" disabled={pending}>
                Pedir solicitud de material
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {requests.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {requests.map((request) => (
            <li key={request.id}>
              {canReadPurchasing ? (
                <Link
                  href={`/purchasing/requests/${request.id}`}
                  className="font-medium hover:underline"
                >
                  {request.number}
                </Link>
              ) : (
                <span className="font-medium">{request.number}</span>
              )}
              {" · "}
              {PURCHASE_REQUEST_STATUS_LABELS[request.status as PurchaseRequestStatus] ??
                request.status}
            </li>
          ))}
        </ul>
      ) : null}

      {missing.length > 0 ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
          <p className="font-medium">Materiales sin disponibilidad para reservar</p>
          <ul className="mt-2 space-y-1">
            {missing.map((item) => (
              <li key={item.code}>
                {item.code} · {item.description}: faltan {displayQty(item.shortage)}{" "}
                {item.unitCode} (disponible {displayQty(item.available)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {info ? <p className="text-sm text-muted-foreground">{info}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
