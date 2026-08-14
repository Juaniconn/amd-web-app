import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/quotes/status";

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm";

type QuoteFiltersProps = {
  q?: string;
  status?: string;
};

export function QuoteFilters({ q, status }: QuoteFiltersProps) {
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
          placeholder="Número, cliente o notas"
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor="status"
          className="text-xs font-medium text-muted-foreground"
        >
          Estado
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status ?? ""}
          className={selectClassName}
        >
          <option value="">Todos</option>
          {(Object.entries(QUOTE_STATUS_LABELS) as [QuoteStatus, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </div>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
    </form>
  );
}
