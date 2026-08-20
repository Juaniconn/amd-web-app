import { Badge } from "@/components/ui/badge";
import { TablePager } from "@/components/layout/data-table";
import { ListSearchForm } from "@/components/layout/list-search-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  firstSearchParam,
  paginateRows,
  parsePage,
  parsePageSize,
} from "@/lib/ui/pagination";
import { listRolesWithPermissions } from "@/server/services/dashboard";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  await requirePermission(PERMISSION_IDS.rolesRead);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const page = parsePage(firstSearchParam(params.page));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const roles = await listRolesWithPermissions();
  const needle = q?.toLowerCase();
  const filtered = needle
    ? roles.filter((role) =>
        [role.name, role.description, ...role.permissions.map((permission) => permission.id)]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : roles;
  const result = paginateRows(filtered, page, pageSize);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Roles</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Matriz de permisos de Fase 1. La asignación a usuarios se hace al crear el usuario.
        </p>
      </div>

      <ListSearchForm
        action="/settings/roles"
        q={q}
        perPage={pageSize}
        placeholder="Rol, descripción o permiso"
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rol</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Permisos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="max-w-md text-muted-foreground">
                  {role.description}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((permission) => (
                      <Badge key={permission.id} variant="outline">
                        {permission.id}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePager
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        label={result.total === 1 ? "rol" : "roles"}
        path="/settings/roles"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
