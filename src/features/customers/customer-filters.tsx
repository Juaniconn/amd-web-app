import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
} from "@/lib/validation/customers";

const selectClassName =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm";

type CustomerFiltersProps = {
  q?: string;
  status?: string;
  type?: string;
};

export function CustomerFilters({ q, status, type }: CustomerFiltersProps) {
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
          placeholder="Empresa, RFC, código o email"
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
          {Object.entries(CUSTOMER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label
          htmlFor="type"
          className="text-xs font-medium text-muted-foreground"
        >
          Tipo
        </label>
        <select
          id="type"
          name="type"
          defaultValue={type ?? ""}
          className={selectClassName}
        >
          <option value="">Todos</option>
          {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
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
