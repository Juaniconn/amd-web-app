import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { requirePermission } from "@/lib/auth/session";
import { getOrdersKanbanBoard, getPartsKanbanBoard } from "@/server/services/production-kanban";
import { KanbanBoard } from "@/features/production/kanban-board";

export default async function KanbanPage() {
  const { access } = await requirePermission(PERMISSION_IDS.productionView);
  const ordersColumns = await getOrdersKanbanBoard();
  const partsColumns = await getPartsKanbanBoard();

  const totalOrders = ordersColumns.reduce((acc, col) => acc + col.orders.length, 0);
  const totalParts = partsColumns.reduce((acc, col) => acc + col.parts.length, 0);
  const delayedParts = partsColumns.reduce(
    (acc, col) => acc + col.parts.filter((p) => p.isDelayed).length,
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tablero de Producción"
        description="Vista Kanban con dos perspectivas: Órdenes de Trabajo y Números de Parte."
        actions={
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              OT: <span className="font-bold text-foreground">{totalOrders}</span>
            </span>
            <span className="text-muted-foreground">
              Partes: <span className="font-bold text-foreground">{totalParts}</span>
            </span>
            {delayedParts > 0 && (
              <span className="text-red-500 font-bold">
                {delayedParts} atrasado{delayedParts > 1 ? "s" : ""}
              </span>
            )}
          </div>
        }
      />

      {totalParts === 0 && totalOrders === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground">
            No hay órdenes de trabajo en producción.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea una orden de trabajo desde una cotización aprobada.
          </p>
        </div>
      ) : (
        <KanbanBoard ordersColumns={ordersColumns} partsColumns={partsColumns} />
      )}
    </div>
  );
}
