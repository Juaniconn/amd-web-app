import Link from "next/link";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { PERMISSION_IDS } from "@/lib/permissions/catalog";
import { getDelayRisks } from "@/server/services/production-risk";

const levelVariant = {
  alto: "destructive",
  medio: "default",
  bajo: "secondary",
} as const;

export default async function DelayRisksPage() {
  await requirePermission(PERMISSION_IDS.productionView);
  const risks = await getDelayRisks();
  const high = risks.filter((r) => r.riskLevel === "alto").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          Riesgo de Atrasos
        </h1>
        <p className="text-xs text-muted-foreground">
          Predicción con datos reales del taller: avance vs. plazo, operador, máquina,
          material, scrap y retrabajo. {risks.length} números de parte en riesgo
          {high > 0 ? ` · ${high} con riesgo alto` : ""}
        </p>
      </div>

      {risks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ShieldAlert className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium">Sin riesgos detectados</p>
            <p className="text-xs text-muted-foreground">
              Todos los números de parte activos van bien de avance respecto a su fecha de
              compromiso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {risks.map((risk) => (
            <Card
              key={risk.partId}
              className={
                risk.riskLevel === "alto"
                  ? "border-l-4 border-l-red-500"
                  : risk.riskLevel === "medio"
                    ? "border-l-4 border-l-amber-500"
                    : ""
              }
            >
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/production/${risk.partId}`}
                      className="font-mono text-sm font-bold hover:underline"
                    >
                      {risk.label}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {risk.customerName}
                    </p>
                  </div>
                  <Badge variant={levelVariant[risk.riskLevel]}>
                    Riesgo {risk.riskLevel} · {risk.riskScore}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Compromiso:{" "}
                    <span className="font-medium text-foreground">
                      {risk.promisedDate.toLocaleDateString("es-MX")}
                    </span>{" "}
                    ({risk.daysToPromise < 0 ? `${-risk.daysToPromise} días vencido` : `en ${risk.daysToPromise} días`})
                  </span>
                  <span>
                    Avance: <span className="font-medium text-foreground">{risk.progressPercent}%</span>
                  </span>
                </div>

                {/* barra de progreso */}
                <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div
                    className={`h-full ${
                      risk.riskLevel === "alto"
                        ? "bg-red-500"
                        : risk.riskLevel === "medio"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${risk.progressPercent}%` }}
                  />
                </div>

                <ul className="space-y-0.5">
                  {risk.reasons.map((reason) => (
                    <li key={reason} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle
                        className={`h-3 w-3 shrink-0 ${
                          risk.riskLevel === "alto" ? "text-red-500" : "text-amber-500"
                        }`}
                      />
                      {reason}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
