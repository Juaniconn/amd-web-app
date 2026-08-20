import "server-only";

import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  deliveries,
  invoices,
  ncrs,
  purchaseOrders,
  qualityInspections,
} from "@/db/schema";

export async function getPurchasingDashboardStats() {
  const [open] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(purchaseOrders)
    .where(
      inArray(purchaseOrders.status, ["borrador", "enviada", "confirmada", "parcial"]),
    );
  const [urgent] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.isUrgent, true),
        inArray(purchaseOrders.status, ["borrador", "enviada", "confirmada", "parcial"]),
      ),
    );
  return {
    open: Number(open?.value ?? 0),
    urgent: Number(urgent?.value ?? 0),
  };
}

export async function getQualityDashboardStats() {
  const [rejected] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(qualityInspections)
    .where(eq(qualityInspections.result, "rechazado"));
  const [openNcr] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(ncrs)
    .where(inArray(ncrs.status, ["abierta", "en_analisis", "retrabajo"]));
  return {
    rejectedInspections: Number(rejected?.value ?? 0),
    openNcrs: Number(openNcr?.value ?? 0),
  };
}

export async function getDeliveryDashboardStats() {
  const [pending] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(deliveries)
    .where(inArray(deliveries.status, ["pendiente", "preparando", "enviado"]));
  const [incidents] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(deliveries)
    .where(eq(deliveries.status, "incidencia"));
  return {
    inTransit: Number(pending?.value ?? 0),
    incidents: Number(incidents?.value ?? 0),
  };
}

export async function getBillingDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [open] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(invoices)
    .where(inArray(invoices.status, ["emitida", "parcial"]));
  const [overdue] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(invoices)
    .where(
      and(
        inArray(invoices.status, ["emitida", "parcial"]),
        lt(invoices.dueDate, today),
      ),
    );
  return {
    open: Number(open?.value ?? 0),
    overdue: Number(overdue?.value ?? 0),
  };
}
