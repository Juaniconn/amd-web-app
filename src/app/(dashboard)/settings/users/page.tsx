import { CreateUserDialog } from "@/app/(dashboard)/settings/users/create-user-dialog";
import { UserRowActions } from "@/app/(dashboard)/settings/users/user-row-actions";
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
import { Badge } from "@/components/ui/badge";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import {
  firstSearchParam,
  paginateRows,
  parsePage,
  parsePageSize,
} from "@/lib/ui/pagination";
import { listUsers } from "@/server/services/dashboard";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
  }>;
}) {
  const { session, access } = await requirePermission(PERMISSION_IDS.usersRead);
  const params = await searchParams;
  const q = firstSearchParam(params.q)?.trim() || undefined;
  const page = parsePage(firstSearchParam(params.page));
  const pageSize = parsePageSize(firstSearchParam(params.perPage));
  const users = await listUsers();
  const needle = q?.toLowerCase();
  const filtered = needle
    ? users.filter((user) =>
        [user.name, user.email, ...user.roles.map((role) => role.name)]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : users;
  const result = paginateRows(filtered, page, pageSize);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("perPage", String(pageSize));
  const canWrite = access.permissions.includes(PERMISSION_IDS.usersWrite);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Usuarios</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Los usuarios se persisten en PostgreSQL. El alta pública está deshabilitada.
          </p>
        </div>
        {canWrite ? <CreateUserDialog /> : null}
      </div>

      <ListSearchForm
        action="/settings/users"
        q={q}
        perPage={pageSize}
        placeholder="Nombre, correo o rol"
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Creado</TableHead>
              {canWrite ? (
                <TableHead className="text-right">Acciones</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role.id} variant="secondary">
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {user.createdAt.toLocaleDateString("es-MX")}
                </TableCell>
                {canWrite ? (
                  <TableCell>
                    <UserRowActions
                      currentUserId={session.user.id}
                      user={{
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        roleId: user.roles[0]?.id ?? "ventas",
                      }}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePager
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        label={result.total === 1 ? "usuario" : "usuarios"}
        path="/settings/users"
        query={query}
        pageSize={pageSize}
      />
    </div>
  );
}
