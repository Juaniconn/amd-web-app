import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { PageHeader } from "@/components/layout/page-header";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import { getKanbanBoard } from "@/server/services/production-kanban";
import { KanbanBoard } from "@/features/production/kanban-board";

export default async function KanbanPage() {
  const { access } = await requirePermission(PERMISSION_IDS.productionView);
  const columns = await getKanbanBoard();

  const totalTasks = columns.reduce((acc, col) => acc + col.tasks.length, 0);
  const delayedTasks = columns.reduce(
    (acc, col) => acc + col.tasks.filter((t) => t.isDelayed).length,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tablero de Producción"
        description="Vista Kanban de números de parte por estado. Atrasaodos en rojo."
        actions={
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Total: <span className="font-bold text-foreground">{totalTasks}</span>
            </span>
            {delayedTasks > 0 && (
              <span className="text-red-500 font-bold">
                {delayedTasks} atrasado{delayedTasks > 1 ? "s" : ""}
              </span>
            )}
          </div>
        }
      />

      {totalTasks === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground">
            No hay números de parte en producción.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea una orden de trabajo desde una cotización aprobada.
          </p>
        </div>
      ) : (
        <KanbanBoard columns={columns} />
      )}
    </div>
  );
}
