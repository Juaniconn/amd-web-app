"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CALCULATOR_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/ui/pagination";

export type CatalogRow = {
  id: string;
  searchText: string;
  cells: ReactNode[];
};

export function CatalogPagedTable({
  title,
  href,
  hrefLabel,
  headers,
  rows,
  empty,
  colSpan,
}: {
  title: string;
  href: string;
  hrefLabel: string;
  headers: string[];
  rows: CatalogRow[];
  empty: string;
  colSpan: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(CALCULATOR_PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => row.searchText.toLowerCase().includes(needle));
  }, [query, rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const slice = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <Link href={href} className={buttonVariants({ variant: "outline" })}>
          {hrefLabel}
        </Link>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Filtrar esta lista"
            className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Mostrar</label>
          <select
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {slice.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-muted-foreground">
                {rows.length === 0 ? empty : "No hay resultados con ese filtro."}
              </TableCell>
            </TableRow>
          ) : (
            slice.map((row) => (
              <TableRow key={row.id}>
                {row.cells.map((cell, index) => (
                  <TableCell key={index}>{cell}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {filtered.length} {filtered.length === 1 ? "registro" : "registros"} · página{" "}
          {currentPage} de {pageCount}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className={buttonVariants({ variant: "outline", size: "sm" })}
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className={buttonVariants({ variant: "outline", size: "sm" })}
            disabled={currentPage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
