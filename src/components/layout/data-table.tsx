import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { PageSizeSelect } from "@/components/layout/page-size-select";
import { hiddenQueryFields, pagerHref } from "@/lib/ui/pagination";

export function TableCard({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border bg-card">{children}</div>;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border bg-card px-4 py-3">{children}</div>;
}

export function EmptyTable({
  colSpan,
  title,
  description,
  href,
  actionLabel,
}: {
  colSpan: number;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-12 text-center">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {href && actionLabel ? (
          <Link href={href} className={`${buttonVariants()} mt-4 inline-flex`}>
            {actionLabel}
          </Link>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function TablePager({
  total,
  page,
  pageCount,
  label,
  path,
  query,
  pageSize,
  pageParam = "page",
}: {
  total: number;
  page: number;
  pageCount: number;
  label: string;
  path: string;
  query: URLSearchParams;
  pageSize: number;
  pageParam?: string;
}) {
  const prevHref = page > 1 ? pagerHref(path, query, page - 1, pageParam) : undefined;
  const nextHref = page < pageCount ? pagerHref(path, query, page + 1, pageParam) : undefined;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <p>
        {total} {label} · página {page} de {pageCount}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <PageSizeSelect
          action={path}
          pageSize={pageSize}
          hiddenFields={hiddenQueryFields(query)}
        />
        {prevHref ? (
          <Link href={prevHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Anterior
          </Link>
        ) : (
          <span
            className={`${buttonVariants({ variant: "outline", size: "sm" })} pointer-events-none opacity-40`}
          >
            Anterior
          </span>
        )}
        {nextHref ? (
          <Link href={nextHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Siguiente
          </Link>
        ) : (
          <span
            className={`${buttonVariants({ variant: "outline", size: "sm" })} pointer-events-none opacity-40`}
          >
            Siguiente
          </span>
        )}
      </div>
    </div>
  );
}
