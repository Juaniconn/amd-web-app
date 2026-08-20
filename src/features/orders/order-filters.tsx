import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm";

export function OrderFilters({
  q,
  status,
  delayed,
  perPage,
}: {
  q?: string;
  status?: string;
  delayed?: boolean;
  perPage?: number;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-card px-4 py-3">
      {perPage ? <input type="hidden" name="perPage" value={perPage} /> : null}
      <div className="min-w-56 flex-1 space-y-1">
        <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
          Buscar
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="OT, cliente, RFQ o número de parte"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
          Estado
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ""}
          className={selectClassName}
        >
          <option value="">Todos</option>
          {(Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="delayed" value="1" defaultChecked={delayed} />
        Retrasados
      </label>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
    </form>
  );
}
