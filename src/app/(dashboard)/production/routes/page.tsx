import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { PRODUCTION_ROUTE_STEP_KIND_LABELS } from "@/lib/production/catalog";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { listProductionRoutes } from "@/server/services/production-catalogs";

export default async function ProductionRoutesPage() {
  await requirePermission(PERMISSION_IDS.productionView);
  const routes = await listProductionRoutes();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Rutas de fabricación</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rutas oficiales A, B y C. El administrador puede crear rutas
            adicionales; no hay secuencias fijas en código.
          </p>
        </div>
        <Link href="/production" className={buttonVariants({ variant: "outline" })}>
          Volver
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {routes.map((route) => (
          <Card key={route.id}>
            <CardHeader>
              <CardTitle>{route.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{route.description}</p>
              <ol className="space-y-1">
                {route.steps.map((step) => (
                  <li key={step.id}>
                    {step.position}. {step.name} ·{" "}
                    {PRODUCTION_ROUTE_STEP_KIND_LABELS[step.kind]}
                    {step.workCenterName ? ` (${step.workCenterName})` : ""}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
