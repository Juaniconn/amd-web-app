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
    // `reauth=1` avisa al middleware de que la sesión fue rechazada aquí.
    // Sin ese marcador, una cookie caduca provoca un bucle: el middleware ve
    // la cookie y manda a /dashboard, esta función la valida, falla y vuelve
    // a /login — ERR_TOO_MANY_REDIRECTS sin llegar nunca al formulario.
    redirect("/login?reauth=1");
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

export async function requireAnyPermission(...permissions: PermissionId[]) {
  const session = await requireSession();
  const access = await getUserAccess(session.user.id);
  if (!permissions.some((permission) => access.permissions.includes(permission))) {
    redirect("/dashboard");
  }
  return { session, access };
}
