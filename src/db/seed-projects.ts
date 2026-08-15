import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { orders, projects, quotes } from "./schema";

type Actor = { id: string; name: string } | null;

const DEMO_PROJECTS = [
  {
    id: "demo-project-ford",
    code: "DEMO_PRY_001",
    name: "Herramental Ford",
    customerId: "demo-customer-003",
    description:
      "Agrupador demo de herramental. Contiene pedidos y RFQ del mismo cliente. No es un proyecto real de AMD.",
    status: "activo" as const,
    startDaysAgo: 25,
    endInDays: -2,
    orderIds: ["demo-quote-005-order"],
    quoteIds: ["demo-quote-004", "demo-quote-005"],
  },
  {
    id: "demo-project-celda",
    code: "DEMO_PRY_002",
    name: "Celda Maquiladora A",
    customerId: "demo-customer-007",
    description: "Agrupador demo de varias entregas. No es un trabajo real.",
    status: "planeacion" as const,
    startDaysAgo: 5,
    endInDays: 40,
    orderIds: ["demo-quote-015-order"],
    quoteIds: ["demo-quote-015", "demo-quote-009"],
  },
];

export async function seedProjectsDemo(
  db: PostgresJsDatabase,
  actor: Actor,
) {
  const now = new Date();

  for (const demo of DEMO_PROJECTS) {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - demo.startDaysAgo);
    const estimatedEndDate = new Date(now);
    estimatedEndDate.setDate(estimatedEndDate.getDate() + demo.endInDays);

    await db
      .insert(projects)
      .values({
        id: demo.id,
        code: demo.code,
        name: demo.name,
        customerId: demo.customerId,
        description: demo.description,
        ownerUserId: actor?.id ?? null,
        status: demo.status,
        startDate,
        estimatedEndDate,
        notes: "Registro DEMO. No usar como expediente real.",
        isDemo: true,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
        createdAt: startDate,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: projects.code,
        set: {
          name: demo.name,
          description: demo.description,
          status: demo.status,
          startDate,
          estimatedEndDate,
          updatedAt: now,
        },
      });

    for (const quoteId of demo.quoteIds) {
      await db
        .update(quotes)
        .set({ projectId: demo.id, updatedAt: now })
        .where(eq(quotes.id, quoteId));
    }
    for (const orderId of demo.orderIds) {
      await db
        .update(orders)
        .set({ projectId: demo.id, updatedAt: now })
        .where(eq(orders.id, orderId));
    }
  }

  console.log(`Seeded ${DEMO_PROJECTS.length} demo projects.`);
}
