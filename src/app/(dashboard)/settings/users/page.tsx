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

export default async function UsersPage() {
  const { session, access } = await requirePermission(PERMISSION_IDS.usersRead);
  const users = await listUsers();
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
            {users.map((user) => (
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
    </div>
  );
}
