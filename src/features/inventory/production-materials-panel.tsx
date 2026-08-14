"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { displayQty } from "@/lib/inventory/catalog";
import {
  addOrderMaterialAction,
  consumeOrderMaterialAction,
  removeOrderMaterialAction,
  reserveOrderMaterialsAction,
} from "@/server/actions/inventory";

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

export function ProductionMaterialsPanel({
  productionOrderId,
  lines,
  materials,
  canReserve,
  canConsume,
}: {
  productionOrderId: string;
  lines: Line[];
  materials: { id: string; code: string; description: string; unitCode: string }[];
  canReserve: boolean;
  canConsume: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(
    action: (formData: FormData) => Promise<{
      ok: boolean;
      error?: string;
      shortage?: boolean;
    }>,
    formData: FormData,
  ) {
    setPending(true);
    setError(null);
    setInfo(null);
    const result = await action(formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo completar.");
      return;
    }
    if (result.shortage) {
      setInfo(
        "Reserva parcial: hay faltante. La OT puede pasar a Esperando Material.",
      );
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin material declarado. La OT puede programarse hasta que se agregue
          una línea.
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
                        Parcial
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
                            formData.set("productionOrderId", productionOrderId);
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
            <input type="hidden" name="productionOrderId" value={productionOrderId} />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Material</label>
              <select
                name="materialId"
                required
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                <option value="">Seleccionar</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.code} · {material.description} ({material.unitCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Cantidad</label>
              <Input name="quantity" className="h-8 w-24" required />
            </div>
            <Button type="submit" variant="outline" disabled={pending}>
              Agregar a la OT
            </Button>
          </form>
          {lines.length > 0 ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData();
                formData.set("productionOrderId", productionOrderId);
                void run(reserveOrderMaterialsAction, formData);
              }}
            >
              <Button type="submit" disabled={pending}>
                Reservar todo
              </Button>
            </form>
          ) : null}
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
