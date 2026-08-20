export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;
export const CALCULATOR_PAGE_SIZE = 5;

export function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value?: string | null) {
  const parsed = Number(value ?? "1");
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    pageCount,
  };
}

export function parsePageSize(
  value?: string | null,
  fallback: number = DEFAULT_PAGE_SIZE,
) {
  const parsed = Number(value ?? fallback);
  if ((PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)) return parsed;
  return fallback;
}

export function resolvePageSize(value?: number, fallback: number = DEFAULT_PAGE_SIZE) {
  if (value != null && (PAGE_SIZE_OPTIONS as readonly number[]).includes(value)) {
    return value;
  }
  return fallback;
}

export function queryWithoutPage(query: URLSearchParams) {
  const next = new URLSearchParams(query);
  next.delete("page");
  return next;
}

export function pagerHref(
  path: string,
  query: URLSearchParams,
  page: number,
  pageParam = "page",
) {
  const next = new URLSearchParams(query);
  if (page <= 1) next.delete(pageParam);
  else next.set(pageParam, String(page));
  const encoded = next.toString();
  return encoded ? `${path}?${encoded}` : path;
}

export function hiddenQueryFields(
  query: URLSearchParams,
  omit: string[] = ["page", "ncrPage", "perPage"],
) {
  const fields: Record<string, string> = {};
  for (const [key, value] of query.entries()) {
    if (omit.includes(key) || !value) continue;
    fields[key] = value;
  }
  return fields;
}
