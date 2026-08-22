import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getUserAccess } from "@/server/services/access";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";

export default async function SinAccesoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Si en realidad sí tiene un destino válido, no dejarlo aquí.
  const access = await getUserAccess(session.user.id);
  if (access.permissions.includes(PERMISSION_IDS.dashboardRead)) redirect("/dashboard");
  if (access.permissions.includes(PERMISSION_IDS.productionMyWork)) {
    redirect("/my-production");
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="text-lg font-semibold">Tu cuenta no tiene accesos asignados</h1>
        <p className="text-sm text-muted-foreground">
          {session.user.name}, tu usuario existe pero todavía no tiene un rol con
          permisos. Pide al administrador que te asigne uno desde Configuración →
          Usuarios.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
