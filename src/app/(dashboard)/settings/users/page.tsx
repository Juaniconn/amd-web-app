import { CreateUserDialog } from "@/app/(dashboard)/settings/users/create-user-dialog";
import { UserRowActions } from "@/app/(dashboard)/settings/users/user-row-actions";
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
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;

  const users = await listUsers();
  const needle = q?.toLowerCase();
  const filtered = needle
    ? users.filter((user) =>
        [user.name, user.email, ...user.roles.map((role) => role.name)]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
    : users;

  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Usuarios</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} usuarios</p>
        </div>
        {access.permissions.includes(PERMISSION_IDS.usersWrite) && <CreateUserDialog />}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">No se encontraron usuarios</p>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role.id} variant="outline" className="text-[10px]">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("es-MX")}
                  </TableCell>
                  <TableCell>
                    <UserRowActions
                      user={{ id: user.id, name: user.name, email: user.email, roleId: user.roles[0]?.id ?? "" }}
                      currentUserId={session.user.id}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} resultados · Página {page} de {pageCount}</span>
        </div>
      )}
    </div>
  );
}
