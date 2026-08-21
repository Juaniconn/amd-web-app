import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getUserAccess } from "@/server/services/access";
import { listMyProductionTasks, type MyProductionTask } from "@/server/services/production-tasks";
import { MyProductionCard } from "@/features/production/my-production-card";

export default async function MyProductionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const access = await getUserAccess(session.user.id);
  const isOperator = access.permissions.includes(PERMISSION_IDS.productionView) &&
    !access.permissions.includes(PERMISSION_IDS.productionCreate);

  // Show full production view for admins/managers
  if (!isOperator && access.permissions.includes(PERMISSION_IDS.productionView)) {
    redirect("/production");
  }

  const tasks = await listMyProductionTasks(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis tareas de hoy"
        description="Números de parte asignados para producir hoy. Toca uno para empezar."
      />

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-medium text-muted-foreground">
              No tienes números de parte asignados para hoy.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Si crees que es un error, contacta a tu jefe de producción.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <MyProductionCard
              key={task.id}
              task={{
                ...task,
                priority: task.priority as "urgente" | "compromiso_inmediato" | "programada" | "produccion_normal",
                status: task.status as import("@/lib/production/status").ProductionStatus,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
