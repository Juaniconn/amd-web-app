import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { PERMISSION_IDS, type PermissionId } from "@/lib/permissions/catalog";
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

/**
 * Ruta de aterrizaje según lo que el usuario realmente puede ver.
 *
 * Un operador de piso NO tiene dashboard:read, así que mandarlo a /dashboard
 * lo rebotaría de vuelta y crearía un bucle de redirecciones. Su home es la
 * vista de piso.
 */
export function landingPathFor(permissions: readonly string[]): string {
  if (permissions.includes(PERMISSION_IDS.dashboardRead)) return "/dashboard";
  if (permissions.includes(PERMISSION_IDS.productionMyWork)) return "/my-production";
  return "/sin-acceso";
}

export async function requirePermission(permission: PermissionId) {
  const session = await requireSession();
  const access = await getUserAccess(session.user.id);
  if (!access.permissions.includes(permission)) {
    redirect(landingPathFor(access.permissions));
  }
  return { session, access };
}

export async function requireAnyPermission(...permissions: PermissionId[]) {
  const session = await requireSession();
  const access = await getUserAccess(session.user.id);
  if (!permissions.some((permission) => access.permissions.includes(permission))) {
    redirect(landingPathFor(access.permissions));
  }
  return { session, access };
}
