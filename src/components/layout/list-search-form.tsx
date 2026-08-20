import type { ReactNode } from "react";
import { FilterBar } from "@/components/layout/data-table";

export function ListSearchForm({
  action,
  q,
  perPage,
  placeholder,
  extra,
}: {
  action: string;
  q?: string;
  perPage: number;
  placeholder: string;
  extra?: ReactNode;
}) {
  return (
    <FilterBar>
      <form method="get" action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="perPage" value={perPage} />
        <div className="min-w-56 flex-1 space-y-1">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder={placeholder}
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          />
        </div>
        {extra}
        <button
          type="submit"
          className="h-8 rounded-lg border border-input px-2.5 text-sm hover:bg-muted"
        >
          Filtrar
        </button>
      </form>
    </FilterBar>
  );
}
