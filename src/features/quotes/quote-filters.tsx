import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  QUOTE_ENGINEERING_STATUS_LABELS,
  RFQ_TYPE_LABELS,
  type QuoteEngineeringStatus,
  type RfqType,
} from "@/lib/quotes/rfq";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/quotes/status";

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm";

type QuoteFiltersProps = {
  q?: string;
  status?: string;
  rfqType?: string;
  engineeringStatus?: string;
  perPage?: number;
};

export function QuoteFilters({
  q,
  status,
  rfqType,
  engineeringStatus,
  perPage,
}: QuoteFiltersProps) {
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
      <div className="space-y-1">
        <label
          htmlFor="rfqType"
          className="text-xs font-medium text-muted-foreground"
        >
          Tipo RFQ
        </label>
        <select
          id="rfqType"
          name="rfqType"
          defaultValue={rfqType ?? ""}
          className={selectClassName}
        >
          <option value="">Todos</option>
          {(Object.entries(RFQ_TYPE_LABELS) as [RfqType, string][]).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="space-y-1">
        <label
          htmlFor="engineeringStatus"
          className="text-xs font-medium text-muted-foreground"
        >
          Estado ingeniería
        </label>
        <select
          id="engineeringStatus"
          name="engineeringStatus"
          defaultValue={engineeringStatus ?? ""}
          className={selectClassName}
        >
          <option value="">Todos</option>
          {(
            Object.entries(QUOTE_ENGINEERING_STATUS_LABELS) as [
              QuoteEngineeringStatus,
              string,
            ][]
          ).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline">
        Filtrar
      </Button>
    </form>
  );
}
