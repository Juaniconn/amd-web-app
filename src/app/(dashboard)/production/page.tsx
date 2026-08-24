import "server-only";

import { redirect } from "next/navigation";
import { ProductionPage } from "@/features/production/production-page";
import { listOrdersForProduction, listPartsForProduction } from "@/server/services/production-unified";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";

export default async function ProductionMainPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    delayed?: string | string[];
    page?: string | string[];
    perPage?: string | string[];
    view?: string | string[];
  }>;
}) {
  await requirePermission(PERMISSION_IDS.productionView);
  const params = await searchParams;

  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const delayed = (Array.isArray(params.delayed) ? params.delayed[0] : params.delayed) === "1";
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const pageSize = Number(Array.isArray(params.perPage) ? params.perPage[0] : params.perPage) || 20;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;

  if (view === "kanban") {
    redirect("/production/kanban");
  }

  const [ordersResult, partsResult] = await Promise.all([
    listOrdersForProduction({ q, status, delayed, page, pageSize }),
    listPartsForProduction({ q, status, delayed, page, pageSize }),
  ]);

  const canCreate = false; // TODO: Add permission check

  return (
    <ProductionPage
      orders={ordersResult.rows}
      parts={partsResult.rows}
      canCreate={canCreate}
    />
  );
}
