"use client";

import { PAGE_SIZE_OPTIONS } from "@/lib/ui/pagination";

export function PageSizeSelect({
  action,
  pageSize,
  hiddenFields,
}: {
  action: string;
  pageSize: number;
  hiddenFields: Record<string, string>;
}) {
  return (
    <form method="get" action={action} className="flex items-center gap-2">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="perPage" className="text-xs text-muted-foreground">
        Mostrar
      </label>
      <select
        id="perPage"
        name="perPage"
        defaultValue={String(pageSize)}
        className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </form>
  );
}
