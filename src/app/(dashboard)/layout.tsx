import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth/auth";
import { ROLES, type RoleId } from "@/lib/permissions/catalog";
import { getUserAccess } from "@/server/services/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login?reauth=1");
  }

  const access = await getUserAccess(session.user.id);
  const roleNames = access.roleIds.map(
    (roleId) => ROLES[roleId as RoleId]?.name ?? roleId,
  );

  return (
    <AppShell
      userName={session.user.name}
      userEmail={session.user.email}
      roles={roleNames}
      permissions={access.permissions}
    >
      {children}
    </AppShell>
  );
}
