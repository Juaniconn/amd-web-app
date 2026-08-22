import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getUserAccess } from "@/server/services/access";
import {
  getMyOperationsSummary,
  listMyOperations,
} from "@/server/services/production-tasks";
import { OperationCard } from "@/features/production/my-production-card";

export default async function MyProductionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const access = await getUserAccess(session.user.id);
  if (!access.permissions.includes(PERMISSION_IDS.productionMyWork)) {
    redirect("/dashboard");
  }

  const [operations, summary] = await Promise.all([
    listMyOperations(session.user.id),
    getMyOperationsSummary(session.user.id),
  ]);

  const inProgress = operations.filter((op) => op.status === "en_proceso");
  const ready = operations.filter(
    (op) => op.status === "pendiente" && op.isUnblocked,
  );
  const blocked = operations.filter(
    (op) => op.status === "pendiente" && !op.isUnblocked,
  );

  return (
    <div className="space-y-5">
      {/* Encabezado con resumen del turno */}
      <div>
        <h1 className="text-lg font-semibold">Mis Procesos</h1>
        <p className="text-xs text-muted-foreground">
          {session.user.name} · Los procesos que te toca hacer hoy
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{summary.inProgress}</p>
          <p className="text-[10px] text-muted-foreground">En curso</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{summary.pending}</p>
          <p className="text-[10px] text-muted-foreground">Por hacer</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{summary.doneToday}</p>
          <p className="text-[10px] text-muted-foreground">Terminados hoy</p>
        </div>
      </div>

      {operations.length === 0 ? (
        <div className="rounded-lg border bg-card py-12 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
          <h3 className="mt-3 text-sm font-medium">No tienes procesos asignados</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.doneToday > 0
              ? `Terminaste ${summary.doneToday} ${summary.doneToday === 1 ? "proceso" : "procesos"} hoy. Buen trabajo.`
              : "Si crees que es un error, avisa a tu jefe de producción."}
          </p>
        </div>
      ) : (
        <>
          {inProgress.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-700">
                <Loader2 className="h-3 w-3 animate-spin" />
                Trabajando ahora ({inProgress.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {inProgress.map((op) => (
                  <OperationCard key={op.id} op={op} />
                ))}
              </div>
            </section>
          )}

          {ready.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Listos para empezar ({ready.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {ready.map((op) => (
                  <OperationCard key={op.id} op={op} />
                ))}
              </div>
            </section>
          )}

          {blocked.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3 w-3" />
                Esperando proceso anterior ({blocked.length})
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {blocked.map((op) => (
                  <OperationCard key={op.id} op={op} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
