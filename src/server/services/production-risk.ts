import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { Alert, AlertTone } from "@/server/services/alerts";

export type DelayRisk = {
  partId: string;
  label: string;
  customerName: string;
  promisedDate: Date;
  progressPercent: number;
  daysToPromise: number;
  riskScore: number; // 0-100
  riskLevel: "alto" | "medio" | "bajo";
  reasons: string[];
};

type RiskRow = {
  id: string;
  label: string;
  customer: string;
  promised_date: Date | null;
  status: string;
  priority: string;
  operations_total: number;
  operations_done: number;
  ops_in_progress: number;
  days_since_start: number | null;
  scrap_count: number;
  rework_count: number;
  machine_down: boolean;
  operator_missing: boolean;
  material_low: boolean;
};

/**
 * Predicción de retrasos con datos reales del taller.
 *
 * Señales (cada una suma puntos de riesgo):
 * - Progreso por debajo del tiempo restante (la más fuerte)
 * - Sin operador asignado estando liberado/en producción
 * - Máquina asignada fuera de servicio o en mantenimiento
 * - Material requerido bajo mínimo
 * - Scrap y retrabajo repetidos en el número de parte
 * - Prioridad urgente sin avance
 */
export async function getDelayRisks(limit = 20): Promise<DelayRisk[]> {
  const rows = await db.execute<RiskRow>(sql`
    select
      po.id,
      coalesce(po.part_number, po.number) as label,
      c.legal_name as customer,
      po.promised_date,
      po.status,
      po.priority,
      coalesce(ops.total, 0) as operations_total,
      coalesce(ops.done, 0) as operations_done,
      coalesce(ops.in_progress, 0) as ops_in_progress,
      extract(day from now() - po.started_at)::int as days_since_start,
      coalesce((select count(*)::int from production_rework r where r.production_order_id = po.id and r.scrap_quantity > 0), 0) as scrap_count,
      coalesce((select count(*)::int from production_rework r where r.production_order_id = po.id and r.quality_released = true), 0) as rework_count,
      exists(
        select 1 from machines m
        where m.id = po.machine_id and m.active = true
          and m.status in ('mantenimiento','fuera_de_servicio')
      ) as machine_down,
      (po.operator_user_id is null
        and po.status in ('liberada','programada','en_produccion')) as operator_missing,
      exists(
        select 1 from production_order_materials pom
        join materials m on m.id = pom.material_id
        where pom.production_order_id = po.id
          and m.active = true and m.min_stock is not null
          and coalesce((select sum(b.on_hand) from inventory_balances b where b.material_id = m.id), 0) < m.min_stock
      ) as material_low
    from production_orders po
    join customers c on c.id = po.customer_id
    left join lateral (
      select
        count(*) filter (where o.status <> 'omitida') as total,
        count(*) filter (where o.status = 'terminada') as done,
        count(*) filter (where o.status = 'en_proceso') as in_progress
      from production_operations o
      where o.production_order_id = po.id
    ) ops on true
    where po.status in ('liberada','programada','en_produccion','pausada','esperando_material')
      and po.promised_date is not null
    order by po.promised_date asc
    limit ${limit * 3}
  `);

  const now = Date.now();
  const risks: DelayRisk[] = [];

  for (const row of rows) {
    if (!row.promised_date) continue;
    const total = Number(row.operations_total ?? 0);
    const done = Number(row.operations_done ?? 0);
    const progress = total > 0 ? done / total : 0;
    const daysLeft = Math.ceil((new Date(row.promised_date).getTime() - now) / (24 * 3600 * 1000));

    // Tiempo transcurrido vs. tiempo total estimado (inicio → compromiso).
    // Si la OT no tiene started_at usamos solo el progreso.
    const elapsed = row.days_since_start ?? null;

    let score = 0;
    const reasons: string[] = [];

    // 1. Progreso contra tiempo restante — la señal principal.
    // Fracción del plazo que falta: si quedan 2 días de 30, queda ~93% del plazo.
    if (elapsed !== null && elapsed > 0) {
      const timeFractionRemaining =
        Math.max(daysLeft, 0) / (elapsed + Math.max(daysLeft, 0));
      const progressDeficit = timeFractionRemaining - progress;
      if (progressDeficit > 0.15) {
        score += Math.min(45, Math.round(progressDeficit * 100));
        reasons.push(
          `avance ${Math.round(progress * 100)}% con solo ${Math.round(timeFractionRemaining * 100)}% del plazo restante`,
        );
      }
    } else if (daysLeft <= 7 && progress < 0.5 && total > 0) {
      score += 25;
      reasons.push(`a una semana del compromiso y lleva ${Math.round(progress * 100)}%`);
    }

    // 2-4. Bloqueos operativos
    if (row.operator_missing) {
      score += 15;
      reasons.push("sin operador asignado");
    }
    if (row.machine_down) {
      score += 20;
      reasons.push("máquina detenida");
    }
    if (row.material_low) {
      score += 20;
      reasons.push("material bajo mínimo");
    }
    if (Number(row.scrap_count) >= 2) {
      score += 10;
      reasons.push(`${row.scrap_count} registros de scrap`);
    }
    if (Number(row.rework_count) >= 2) {
      score += 8;
      reasons.push(`${row.rework_count} retrabajos`);
    }
    if (row.status === "pausada") {
      score += 12;
      reasons.push("producción pausada");
    }
    if (row.status === "esperando_material") {
      score += 18;
      reasons.push("esperando material");
    }
    if (row.priority === "urgente" && progress < 0.3) {
      score += 10;
      reasons.push("urgente sin avance");
    }
    if (daysLeft < 0) {
      score += 40;
      reasons.unshift("ya venció la fecha de compromiso");
    }

    if (score < 25) continue; // solo reportamos riesgo real

    risks.push({
      partId: row.id,
      label: row.label,
      customerName: row.customer,
      promisedDate: new Date(row.promised_date),
      progressPercent: Math.round(progress * 100),
      daysToPromise: daysLeft,
      riskScore: Math.min(100, score),
      riskLevel: score >= 60 ? "alto" : score >= 40 ? "medio" : "bajo",
      reasons,
    });
  }

  return risks.sort((a, b) => b.riskScore - a.riskScore).slice(0, limit);
}

/** Convierte los riesgos en alertas para el centro de operaciones. */
export async function getDelayRiskAlerts(): Promise<Alert[]> {
  const risks = await getDelayRisks();
  return risks.map<Alert>((risk) => {
    const tone: AlertTone = risk.riskLevel === "alto" ? "urgent" : "warning";
    return {
      id: `delay_risk:${risk.partId}`,
      tone,
      title:
        risk.daysToPromise < 0
          ? `${risk.label} vencido — riesgo ${risk.riskLevel}`
          : `${risk.label} en riesgo de atraso`,
      description:
        `${risk.customerName} · compromiso en ${risk.daysToPromise} ${risk.daysToPromise === 1 ? "día" : "días"} · ` +
        `${risk.reasons.slice(0, 3).join(", ")}`,
      href: `/production/${risk.partId}`,
      sortKey: 70 + risk.riskScore,
    };
  });
}
