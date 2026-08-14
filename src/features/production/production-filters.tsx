import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PRODUCTION_STATUS_LABELS,
  type ProductionStatus,
} from "@/lib/production/status";

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm";

export function ProductionFilters({
  q,
  status,
  delayed,
}: {
  q?: string;
  status?: string;
  delayed?: boolean;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <div className="min-w-56 flex-1 space-y-1">
        <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
          Buscar
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="OT, pedido, RFQ, cliente o descripción"
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
          {(
            Object.entries(PRODUCTION_STATUS_LABELS) as [ProductionStatus, string][]
          ).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 pb-1 text-sm">
        <input type="checkbox" name="delayed" value="1" defaultChecked={delayed} />
        Solo retrasadas
      </label>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
    </form>
  );
}
