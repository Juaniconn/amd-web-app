import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import {
  activityLogs,
  documents,
  engineeringHours,
  engineeringRequests,
  quotes,
} from "./schema";
import { activitySummary } from "../lib/audit/activity";
import type { EngineeringStatus } from "../lib/engineering/status";
import { documentObjectKey, getStorage } from "../lib/storage";

type DemoRequest = {
  id: string;
  number: string;
  quoteId: string;
  status: EngineeringStatus;
  projectType: string;
  priority: "baja" | "media" | "alta";
  description: string;
  hours: number;
  dueDays: number | null;
};

const DEMO_REQUESTS: DemoRequest[] = [
  {
    id: "demo-eng-001",
    number: "DEMO_ING_001",
    quoteId: "demo-quote-001",
    status: "pendiente",
    projectType: "diseno_nuevo",
    priority: "alta",
    description: "Diseño nuevo de placas CNC. DEMO, no es un proyecto real.",
    hours: 0,
    dueDays: 5,
  },
  {
    id: "demo-eng-002",
    number: "DEMO_ING_002",
    quoteId: "demo-quote-002",
    status: "asignado",
    projectType: "reverse_engineering",
    priority: "media",
    description: "Reconstrucción CAD del eje torneado. DEMO.",
    hours: 2,
    dueDays: 8,
  },
  {
    id: "demo-eng-009",
    number: "DEMO_ING_009",
    quoteId: "demo-quote-009",
    status: "disenando",
    projectType: "diseno_nuevo",
    priority: "alta",
    description: "Diseño solamente a partir de brief. DEMO.",
    hours: 6.5,
    dueDays: -1,
  },
  {
    id: "demo-eng-010",
    number: "DEMO_ING_010",
    quoteId: "demo-quote-010",
    status: "revision_interna",
    projectType: "manufacturabilidad",
    priority: "media",
    description: "Validación de manufactura del plano del cliente. DEMO.",
    hours: 1.5,
    dueDays: 3,
  },
  {
    id: "demo-eng-013",
    number: "DEMO_ING_013",
    quoteId: "demo-quote-013",
    status: "esperando_cliente",
    projectType: "modificacion",
    priority: "alta",
    description: "Modificación enviada al cliente. DEMO.",
    hours: 12,
    dueDays: 10,
  },
  {
    id: "demo-eng-008",
    number: "DEMO_ING_008",
    quoteId: "demo-quote-008",
    status: "liberado",
    projectType: "manufacturabilidad",
    priority: "baja",
    description: "Plano del cliente validado y liberado. DEMO.",
    hours: 3,
    dueDays: 2,
  },
  {
    id: "demo-eng-006",
    number: "DEMO_ING_006",
    quoteId: "demo-quote-006",
    status: "cancelado",
    projectType: "diseno_nuevo",
    priority: "baja",
    description: "Cancelada porque el cliente eligió otro proveedor. DEMO.",
    hours: 0.5,
    dueDays: null,
  },
];

export async function seedEngineeringDemo(
  db: PostgresJsDatabase,
  actor: { id: string; name: string } | null,
) {
  const now = new Date();
  const storage = getStorage();

  for (const demo of DEMO_REQUESTS) {
    const [quote] = await db
      .select({
        id: quotes.id,
        customerId: quotes.customerId,
        isDemo: quotes.isDemo,
      })
      .from(quotes)
      .where(eq(quotes.id, demo.quoteId))
      .limit(1);
    if (!quote) continue;

    const dueDate =
      demo.dueDays === null
        ? null
        : new Date(now.getTime() + demo.dueDays * 24 * 60 * 60 * 1000);
    const assigned = demo.status !== "pendiente";
    const released = demo.status === "liberado";
    const approved =
      demo.status === "aprobado" || demo.status === "liberado";
    const cancelled = demo.status === "cancelado";

    await db
      .insert(engineeringRequests)
      .values({
        id: demo.id,
        number: demo.number,
        customerId: quote.customerId,
        quoteId: quote.id,
        assigneeUserId: assigned ? actor?.id ?? null : null,
        description: demo.description,
        projectType: demo.projectType,
        priority: demo.priority,
        dueDate,
        status: demo.status,
        hoursLogged: demo.hours.toFixed(2),
        assignedAt: assigned ? now : null,
        designStartedAt:
          demo.status === "disenando" ||
          demo.status === "revision_interna" ||
          demo.status === "esperando_cliente" ||
          released
            ? now
            : null,
        approvedAt: approved ? now : null,
        releasedAt: released ? now : null,
        cancelledAt: cancelled ? now : null,
        releasedBy: released ? actor?.id ?? null : null,
        isDemo: true,
        createdBy: actor?.id ?? null,
        updatedBy: actor?.id ?? null,
      })
      .onConflictDoUpdate({
        target: engineeringRequests.number,
        set: {
          status: demo.status,
          description: demo.description,
          projectType: demo.projectType,
          priority: demo.priority,
          dueDate,
          hoursLogged: demo.hours.toFixed(2),
          deletedAt: null,
          updatedAt: now,
        },
      });

    await db
      .update(quotes)
      .set({
        requiresEngineering: true,
        engineeringType: demo.projectType as never,
        engineeringStatus:
          demo.status === "pendiente"
            ? "pendiente"
            : demo.status === "esperando_cliente"
              ? "esperando_cliente"
              : demo.status === "liberado"
                ? "liberada"
                : demo.status === "cancelado"
                  ? "pendiente"
                  : "en_proceso",
      })
      .where(eq(quotes.id, quote.id));

    await db.delete(engineeringHours).where(eq(engineeringHours.engineeringRequestId, demo.id));
    if (demo.hours > 0) {
      await db.insert(engineeringHours).values({
        id: `${demo.id}-hours-1`,
        engineeringRequestId: demo.id,
        userId: actor?.id ?? null,
        hours: demo.hours.toFixed(2),
        note: "Captura demo de horas de ingeniería.",
        workedOn: now,
        createdBy: actor?.id ?? null,
      });
    }

    const existingLog = await db
      .select({ id: activityLogs.id })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.entityType, "engineering_request"),
          eq(activityLogs.entityId, demo.id),
          eq(activityLogs.action, "created"),
        ),
      )
      .limit(1);
    if (existingLog.length === 0) {
      await db.insert(activityLogs).values({
        id: `${demo.id}-created`,
        actorUserId: actor?.id ?? null,
        action: "created",
        entityType: "engineering_request",
        entityId: demo.id,
        parentEntityType: "quote",
        parentEntityId: quote.id,
        summary: activitySummary({
          actorName: actor?.name ?? null,
          action: "created",
          entityType: "engineering_request",
          entityLabel: demo.number,
        }),
        newValue: { number: demo.number, source: "demo-seed" },
      });
    }

    if (released) {
      const existingRelease = await db
        .select({ id: activityLogs.id })
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.entityType, "engineering_request"),
            eq(activityLogs.entityId, demo.id),
            eq(activityLogs.action, "released"),
          ),
        )
        .limit(1);
      if (existingRelease.length === 0) {
        await db.insert(activityLogs).values({
          id: `${demo.id}-released`,
          actorUserId: actor?.id ?? null,
          action: "released",
          entityType: "engineering_request",
          entityId: demo.id,
          parentEntityType: "quote",
          parentEntityId: quote.id,
          summary: activitySummary({
            actorName: actor?.name ?? null,
            action: "released",
            entityType: "engineering_request",
            entityLabel: demo.number,
          }),
          newValue: { status: "liberado" },
        });
      }
    }
  }

  const file = {
    requestId: "demo-eng-013",
    name: "revision-cliente.pdf",
    body: "Archivo CAD/PDF demo de ingeniería. No es un plano real de AMD.\n",
  };
  const objectKey = documentObjectKey("engineering_request", file.requestId, file.name);
  const stored = await storage.put(objectKey, Buffer.from(file.body, "utf8"));
  await db
    .insert(documents)
    .values({
      id: `${file.requestId}-doc-1`,
      entityType: "engineering_request",
      entityId: file.requestId,
      originalName: file.name,
      mimeType: "application/pdf",
      sizeBytes: stored.sizeBytes,
      checksumSha256: stored.checksumSha256,
      storageBackend: stored.backend,
      objectKey: stored.objectKey,
      uploadedBy: actor?.id ?? null,
    })
    .onConflictDoUpdate({
      target: documents.id,
      set: {
        originalName: file.name,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksumSha256,
        objectKey: stored.objectKey,
      },
    });

  console.log(`Seeded ${DEMO_REQUESTS.length} demo engineering requests.`);
}
