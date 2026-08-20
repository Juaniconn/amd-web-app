import { MATERIAL_CATEGORY_LABELS } from "@/lib/inventory/catalog";

export function InventoryFilters({
  q,
  category,
  critical,
  perPage,
}: {
  q?: string;
  category?: string;
  critical?: boolean;
  perPage?: number;
}) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border bg-card px-4 py-3">
      {perPage ? <input type="hidden" name="perPage" value={perPage} /> : null}
      <div className="min-w-56 flex-1 space-y-1">
        <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Código o descripción"
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="category" className="text-xs font-medium text-muted-foreground">
          Categoría
        </label>
        <select
          id="category"
          name="category"
          defaultValue={category ?? ""}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Todas</option>
          {Object.entries(MATERIAL_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 pb-1 text-sm">
        <input type="checkbox" name="critical" value="1" defaultChecked={critical} />
        Solo críticos
      </label>
      <button
        type="submit"
        className="h-8 rounded-lg border border-input px-2.5 text-sm hover:bg-muted"
      >
        Filtrar
      </button>
    </form>
  );
}
