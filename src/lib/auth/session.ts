import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import type { PermissionId } from "@/lib/permissions/catalog";
import { getUserAccess } from "@/server/services/access";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requirePermission(permission: PermissionId) {
  const session = await requireSession();
  const access = await getUserAccess(session.user.id);
  if (!access.permissions.includes(permission)) {
    redirect("/dashboard");
  }
  return { session, access };
}
