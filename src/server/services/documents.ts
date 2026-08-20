import "server-only";

import path from "node:path";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { documents, engineeringRequests, orders, projects, quoteItems, quotes } from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  ENGINEERING_ALLOWED_EXTENSIONS,
  ENGINEERING_FILE_MIME,
  ENGINEERING_MAX_FILE_BYTES,
} from "@/lib/engineering/files";
import { canAttachEngineeringFiles, type EngineeringStatus } from "@/lib/engineering/status";
import { canEditOrder, type OrderStatus } from "@/lib/orders/status";
import { canEditProject, type ProjectStatus } from "@/lib/projects/status";
import { canEditQuote, type QuoteStatus } from "@/lib/quotes/status";
import {
  documentObjectKey,
  getStorage,
} from "@/lib/storage";
import { recordActivity } from "@/server/services/activity";
import type { Actor } from "@/server/services/customers";

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "xlsx",
  "xls",
  "doc",
  "docx",
  "dxf",
  "dwg",
  "step",
  "stp",
  "iges",
  "igs",
  "fcstd",
  "stl",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "txt",
]);

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  dxf: "image/vnd.dxf",
  dwg: "application/acad",
  step: "application/step",
  stp: "application/step",
  iges: "model/iges",
  igs: "model/iges",
  fcstd: "application/x-freecad",
  stl: "model/stl",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
};

function extensionOf(name: string) {
  return path.extname(name).replace(".", "").toLowerCase();
}

export function assertAllowedDocument(originalName: string, sizeBytes: number) {
  if (sizeBytes <= 0) {
    throw new AppError("El archivo está vacío.", "EMPTY_FILE", 400);
  }
  if (sizeBytes > MAX_DOCUMENT_BYTES) {
    throw new AppError("El archivo supera 20 MB.", "FILE_TOO_LARGE", 400);
  }
  const ext = extensionOf(originalName);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new AppError(
      "Tipo de archivo no permitido. Usa PDF, Office, planos CAD o imágenes.",
      "FILE_TYPE",
      400,
    );
  }
  return { ext, mimeType: MIME_BY_EXT[ext] ?? "application/octet-stream" };
}

export async function uploadQuoteDocument(
  quoteId: string,
  file: { originalName: string; bytes: Buffer },
  actor: Actor,
) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!quote || quote.deletedAt) {
    throw new AppError("La cotización no existe.", "QUOTE_NOT_FOUND", 404);
  }
  if (!canEditQuote(quote.status as QuoteStatus)) {
    throw new AppError(
      "No se pueden adjuntar archivos en este estado.",
      "QUOTE_LOCKED",
      409,
    );
  }

  const meta = assertAllowedDocument(file.originalName, file.bytes.byteLength);
  const storage = getStorage();
  const objectKey = documentObjectKey("quote", quoteId, file.originalName);
  const stored = await storage.put(objectKey, file.bytes);
  const id = crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(documents).values({
        id,
        entityType: "quote",
        entityId: quoteId,
        originalName: file.originalName,
        mimeType: meta.mimeType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksumSha256,
        storageBackend: stored.backend,
        objectKey: stored.objectKey,
        uploadedBy: actor.userId,
      });
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "created",
        entityType: "document",
        entityId: id,
        entityLabel: file.originalName,
        parentEntityType: "quote",
        parentEntityId: quoteId,
      });
    });
  } catch (error) {
    await storage.remove(objectKey);
    throw error;
  }

  return { id };
}

export async function deleteQuoteDocument(
  id: string,
  quoteId: string,
  actor: Actor,
) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!quote || quote.deletedAt) {
    throw new AppError("La cotización no existe.", "QUOTE_NOT_FOUND", 404);
  }
  if (!canEditQuote(quote.status as QuoteStatus)) {
    throw new AppError(
      "No se pueden eliminar archivos en este estado.",
      "QUOTE_LOCKED",
      409,
    );
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, id),
        eq(documents.entityType, "quote"),
        eq(documents.entityId, quoteId),
      ),
    )
    .limit(1);
  if (!doc) {
    throw new AppError("El archivo no existe.", "DOCUMENT_NOT_FOUND", 404);
  }

  const storage = getStorage();
  await db.transaction(async (tx) => {
    await tx.delete(documents).where(eq(documents.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "document",
      entityId: id,
      entityLabel: doc.originalName,
      parentEntityType: "quote",
      parentEntityId: quoteId,
    });
  });
  await storage.remove(doc.objectKey);
  return { id };
}

export async function getDocumentForDownload(id: string) {
  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  if (!doc) {
    throw new AppError("El archivo no existe.", "DOCUMENT_NOT_FOUND", 404);
  }
  return doc;
}

export async function listQuoteDocuments(quoteId: string) {
  return db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "quote"), eq(documents.entityId, quoteId)))
    .orderBy(desc(documents.createdAt));
}

export async function listQuoteItemDocuments(quoteItemId: string) {
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.entityType, "quote_item"),
        eq(documents.entityId, quoteItemId),
      ),
    )
    .orderBy(desc(documents.createdAt));
}

export async function uploadQuoteItemDocument(
  quoteId: string,
  quoteItemId: string,
  file: { originalName: string; bytes: Buffer },
  actor: Actor,
) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!quote || quote.deletedAt) {
    throw new AppError("La cotización no existe.", "QUOTE_NOT_FOUND", 404);
  }
  if (!canEditQuote(quote.status as QuoteStatus)) {
    throw new AppError(
      "No se pueden adjuntar archivos en este estado.",
      "QUOTE_LOCKED",
      409,
    );
  }
  const [item] = await db
    .select({ id: quoteItems.id })
    .from(quoteItems)
    .where(and(eq(quoteItems.id, quoteItemId), eq(quoteItems.quoteId, quoteId)))
    .limit(1);
  if (!item) {
    throw new AppError("La partida no existe.", "QUOTE_ITEM_NOT_FOUND", 404);
  }

  const meta = assertAllowedDocument(file.originalName, file.bytes.byteLength);
  const storage = getStorage();
  const objectKey = documentObjectKey("quote_item", quoteItemId, file.originalName);
  const stored = await storage.put(objectKey, file.bytes);
  const id = crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(documents).values({
        id,
        entityType: "quote_item",
        entityId: quoteItemId,
        originalName: file.originalName,
        mimeType: meta.mimeType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksumSha256,
        storageBackend: stored.backend,
        objectKey: stored.objectKey,
        uploadedBy: actor.userId,
      });
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "created",
        entityType: "document",
        entityId: id,
        entityLabel: file.originalName,
        parentEntityType: "quote_item",
        parentEntityId: quoteItemId,
      });
    });
  } catch (error) {
    await storage.remove(objectKey);
    throw error;
  }

  return { id };
}

export async function deleteQuoteItemDocument(
  id: string,
  quoteId: string,
  quoteItemId: string,
  actor: Actor,
) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!quote || quote.deletedAt) {
    throw new AppError("La cotización no existe.", "QUOTE_NOT_FOUND", 404);
  }
  if (!canEditQuote(quote.status as QuoteStatus)) {
    throw new AppError(
      "No se pueden eliminar archivos en este estado.",
      "QUOTE_LOCKED",
      409,
    );
  }
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, id),
        eq(documents.entityType, "quote_item"),
        eq(documents.entityId, quoteItemId),
      ),
    )
    .limit(1);
  if (!doc) {
    throw new AppError("El archivo no existe.", "DOCUMENT_NOT_FOUND", 404);
  }
  await db.transaction(async (tx) => {
    await tx.delete(documents).where(eq(documents.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "document",
      entityId: id,
      entityLabel: doc.originalName,
      parentEntityType: "quote_item",
      parentEntityId: quoteItemId,
    });
  });
  return { id };
}

export async function attachEngineeringDocumentToQuoteItem(
  quoteId: string,
  quoteItemId: string,
  documentId: string,
  actor: Actor,
) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);
  if (!quote || quote.deletedAt) {
    throw new AppError("La cotización no existe.", "QUOTE_NOT_FOUND", 404);
  }
  if (!canEditQuote(quote.status as QuoteStatus)) {
    throw new AppError(
      "No se pueden adjuntar archivos en este estado.",
      "QUOTE_LOCKED",
      409,
    );
  }
  const [item] = await db
    .select({ id: quoteItems.id })
    .from(quoteItems)
    .where(and(eq(quoteItems.id, quoteItemId), eq(quoteItems.quoteId, quoteId)))
    .limit(1);
  if (!item) {
    throw new AppError("La partida no existe.", "QUOTE_ITEM_NOT_FOUND", 404);
  }
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc || doc.entityType !== "engineering_request") {
    throw new AppError("El archivo de ingeniería no existe.", "DOCUMENT_NOT_FOUND", 404);
  }
  const [request] = await db
    .select({ id: engineeringRequests.id, quoteId: engineeringRequests.quoteId })
    .from(engineeringRequests)
    .where(eq(engineeringRequests.id, doc.entityId))
    .limit(1);
  if (!request || request.quoteId !== quoteId) {
    throw new AppError(
      "El archivo no pertenece a la ingeniería de esta cotización.",
      "DOCUMENT_NOT_LINKED",
      409,
    );
  }
  const id = crypto.randomUUID();
  await db.insert(documents).values({
    id,
    entityType: "quote_item",
    entityId: quoteItemId,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    checksumSha256: doc.checksumSha256,
    storageBackend: doc.storageBackend,
    objectKey: doc.objectKey,
    uploadedBy: actor.userId,
  });
  return { id };
}

function assertAllowedEngineeringDocument(originalName: string, sizeBytes: number) {
  if (sizeBytes <= 0) {
    throw new AppError("El archivo está vacío.", "EMPTY_FILE", 400);
  }
  if (sizeBytes > ENGINEERING_MAX_FILE_BYTES) {
    throw new AppError("El archivo supera 50 MB.", "FILE_TOO_LARGE", 400);
  }
  const ext = extensionOf(originalName);
  if (!ENGINEERING_ALLOWED_EXTENSIONS.includes(ext as (typeof ENGINEERING_ALLOWED_EXTENSIONS)[number])) {
    throw new AppError(
      "Tipo no permitido. Usa PDF, DWG, DXF, STEP, STP, IGES, PNG, JPG o ZIP.",
      "FILE_TYPE",
      400,
    );
  }
  return {
    ext,
    mimeType:
      ENGINEERING_FILE_MIME[ext as keyof typeof ENGINEERING_FILE_MIME] ??
      "application/octet-stream",
  };
}

async function loadEngineeringRequest(id: string) {
  const [row] = await db
    .select()
    .from(engineeringRequests)
    .where(eq(engineeringRequests.id, id))
    .limit(1);
  if (!row || row.deletedAt) {
    throw new AppError(
      "La solicitud de ingeniería no existe.",
      "ENGINEERING_NOT_FOUND",
      404,
    );
  }
  return row;
}

export async function listEngineeringDocuments(engineeringRequestId: string) {
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.entityType, "engineering_request"),
        eq(documents.entityId, engineeringRequestId),
      ),
    )
    .orderBy(desc(documents.createdAt));
}

export async function uploadEngineeringDocument(
  engineeringRequestId: string,
  file: { originalName: string; bytes: Buffer },
  actor: Actor,
) {
  const request = await loadEngineeringRequest(engineeringRequestId);
  if (!canAttachEngineeringFiles(request.status as EngineeringStatus)) {
    throw new AppError(
      "No se pueden adjuntar archivos en este estado.",
      "ENGINEERING_LOCKED",
      409,
    );
  }

  const meta = assertAllowedEngineeringDocument(
    file.originalName,
    file.bytes.byteLength,
  );
  const storage = getStorage();
  const objectKey = documentObjectKey(
    "engineering_request",
    engineeringRequestId,
    file.originalName,
  );
  const stored = await storage.put(objectKey, file.bytes);
  const id = crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(documents).values({
        id,
        entityType: "engineering_request",
        entityId: engineeringRequestId,
        originalName: file.originalName,
        mimeType: meta.mimeType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksumSha256,
        storageBackend: stored.backend,
        objectKey: stored.objectKey,
        uploadedBy: actor.userId,
      });
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "created",
        entityType: "document",
        entityId: id,
        entityLabel: file.originalName,
        parentEntityType: "engineering_request",
        parentEntityId: engineeringRequestId,
      });
    });
  } catch (error) {
    await storage.remove(objectKey);
    throw error;
  }

  return { id };
}

export async function deleteEngineeringDocument(
  id: string,
  engineeringRequestId: string,
  actor: Actor,
) {
  const request = await loadEngineeringRequest(engineeringRequestId);
  if (!canAttachEngineeringFiles(request.status as EngineeringStatus)) {
    throw new AppError(
      "No se pueden eliminar archivos en este estado.",
      "ENGINEERING_LOCKED",
      409,
    );
  }

  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, id),
        eq(documents.entityType, "engineering_request"),
        eq(documents.entityId, engineeringRequestId),
      ),
    )
    .limit(1);
  if (!doc) {
    throw new AppError("El archivo no existe.", "DOCUMENT_NOT_FOUND", 404);
  }

  const storage = getStorage();
  await db.transaction(async (tx) => {
    await tx.delete(documents).where(eq(documents.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "document",
      entityId: id,
      entityLabel: doc.originalName,
      parentEntityType: "engineering_request",
      parentEntityId: engineeringRequestId,
    });
  });
  await storage.remove(doc.objectKey);
  return { id };
}

async function uploadEntityDocument(
  entityType: "order" | "project",
  entityId: string,
  file: { originalName: string; bytes: Buffer },
  actor: Actor,
) {
  const meta = assertAllowedDocument(file.originalName, file.bytes.byteLength);
  const storage = getStorage();
  const objectKey = documentObjectKey(entityType, entityId, file.originalName);
  const stored = await storage.put(objectKey, file.bytes);
  const id = crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(documents).values({
        id,
        entityType,
        entityId,
        originalName: file.originalName,
        mimeType: meta.mimeType,
        sizeBytes: stored.sizeBytes,
        checksumSha256: stored.checksumSha256,
        storageBackend: stored.backend,
        objectKey: stored.objectKey,
        uploadedBy: actor.userId,
      });
      await recordActivity(tx, {
        actorUserId: actor.userId,
        actorName: actor.name,
        action: "created",
        entityType: "document",
        entityId: id,
        entityLabel: file.originalName,
        parentEntityType: entityType,
        parentEntityId: entityId,
      });
    });
  } catch (error) {
    await storage.remove(objectKey);
    throw error;
  }

  return { id };
}

async function deleteEntityDocument(
  entityType: "order" | "project",
  id: string,
  entityId: string,
  actor: Actor,
) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, id),
        eq(documents.entityType, entityType),
        eq(documents.entityId, entityId),
      ),
    )
    .limit(1);
  if (!doc) {
    throw new AppError("El archivo no existe.", "DOCUMENT_NOT_FOUND", 404);
  }

  const storage = getStorage();
  await db.transaction(async (tx) => {
    await tx.delete(documents).where(eq(documents.id, id));
    await recordActivity(tx, {
      actorUserId: actor.userId,
      actorName: actor.name,
      action: "deleted",
      entityType: "document",
      entityId: id,
      entityLabel: doc.originalName,
      parentEntityType: entityType,
      parentEntityId: entityId,
    });
  });
  await storage.remove(doc.objectKey);
  return { id };
}

export async function uploadOrderDocument(
  orderId: string,
  file: { originalName: string; bytes: Buffer },
  actor: Actor,
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    throw new AppError("El pedido no existe.", "ORDER_NOT_FOUND", 404);
  }
  if (!canEditOrder(order.status as OrderStatus)) {
    throw new AppError(
      "No se pueden adjuntar archivos en este estado.",
      "ORDER_LOCKED",
      409,
    );
  }
  return uploadEntityDocument("order", orderId, file, actor);
}

export async function deleteOrderDocument(
  id: string,
  orderId: string,
  actor: Actor,
) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    throw new AppError("El pedido no existe.", "ORDER_NOT_FOUND", 404);
  }
  if (!canEditOrder(order.status as OrderStatus)) {
    throw new AppError(
      "No se pueden eliminar archivos en este estado.",
      "ORDER_LOCKED",
      409,
    );
  }
  return deleteEntityDocument("order", id, orderId, actor);
}

export async function uploadProjectDocument(
  projectId: string,
  file: { originalName: string; bytes: Buffer },
  actor: Actor,
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) {
    throw new AppError("El proyecto no existe.", "PROJECT_NOT_FOUND", 404);
  }
  if (!canEditProject(project.status as ProjectStatus)) {
    throw new AppError(
      "No se pueden adjuntar archivos en este estado.",
      "PROJECT_LOCKED",
      409,
    );
  }
  return uploadEntityDocument("project", projectId, file, actor);
}

export async function deleteProjectDocument(
  id: string,
  projectId: string,
  actor: Actor,
) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) {
    throw new AppError("El proyecto no existe.", "PROJECT_NOT_FOUND", 404);
  }
  if (!canEditProject(project.status as ProjectStatus)) {
    throw new AppError(
      "No se pueden eliminar archivos en este estado.",
      "PROJECT_LOCKED",
      409,
    );
  }
  return deleteEntityDocument("project", id, projectId, actor);
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function listAvailableOtDocuments(orderId: string) {
  const [order] = await db
    .select({
      id: orders.id,
      quoteId: orders.quoteId,
      engineeringRequestId: orders.engineeringRequestId,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return [];

  const filters = [
    and(eq(documents.entityType, "quote"), eq(documents.entityId, order.quoteId)),
    and(eq(documents.entityType, "order"), eq(documents.entityId, order.id)),
  ];
  if (order.engineeringRequestId) {
    filters.push(
      and(
        eq(documents.entityType, "engineering_request"),
        eq(documents.entityId, order.engineeringRequestId),
      ),
    );
  }
  const quoteItemRows = await db
    .select({ id: quoteItems.id })
    .from(quoteItems)
    .where(eq(quoteItems.quoteId, order.quoteId));
  if (quoteItemRows.length > 0) {
    filters.push(
      and(
        eq(documents.entityType, "quote_item"),
        inArray(
          documents.entityId,
          quoteItemRows.map((row) => row.id),
        ),
      ),
    );
  }

  const rows = await db
    .select()
    .from(documents)
    .where(or(...filters))
    .orderBy(desc(documents.createdAt));

  return rows.map((row) => ({
    id: row.id,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    source:
      row.entityType === "engineering_request"
        ? "Ingeniería"
        : row.entityType === "order"
          ? "Orden de trabajo"
          : row.entityType === "quote_item"
            ? "Partida"
            : "Cotización",
  }));
}

export async function listProductionOrderDocuments(productionOrderId: string) {
  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.entityType, "production_order"),
        eq(documents.entityId, productionOrderId),
      ),
    )
    .orderBy(desc(documents.createdAt));
}

export async function attachDocumentsToProductionOrder(
  tx: Tx,
  productionOrderId: string,
  sourceIds: string[],
  actor: Actor,
  allowed: {
    quoteId: string;
    orderId: string;
    engineeringRequestId: string | null;
    quoteItemIds?: string[];
  },
) {
  if (sourceIds.length === 0) return;
  const uniqueIds = [...new Set(sourceIds)];
  const rows = await tx
    .select()
    .from(documents)
    .where(inArray(documents.id, uniqueIds));
  if (rows.length !== uniqueIds.length) {
    throw new AppError("Uno de los archivos no existe.", "DOCUMENT_NOT_FOUND", 404);
  }
  const already = await tx
    .select({ objectKey: documents.objectKey })
    .from(documents)
    .where(
      and(
        eq(documents.entityType, "production_order"),
        eq(documents.entityId, productionOrderId),
      ),
    );
  const objectKeys = new Set(already.map((row) => row.objectKey));
  const quoteItemIds = new Set(allowed.quoteItemIds ?? []);
  for (const doc of rows) {
    const allowedSource =
      (doc.entityType === "quote" && doc.entityId === allowed.quoteId) ||
      (doc.entityType === "order" && doc.entityId === allowed.orderId) ||
      (doc.entityType === "engineering_request" &&
        doc.entityId === allowed.engineeringRequestId) ||
      (doc.entityType === "quote_item" && quoteItemIds.has(doc.entityId));
    if (!allowedSource) {
      throw new AppError(
        "El archivo no pertenece a este pedido.",
        "DOCUMENT_NOT_LINKED",
        409,
      );
    }
    if (objectKeys.has(doc.objectKey)) continue;
    objectKeys.add(doc.objectKey);
    await tx.insert(documents).values({
      id: crypto.randomUUID(),
      entityType: "production_order",
      entityId: productionOrderId,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      checksumSha256: doc.checksumSha256,
      storageBackend: doc.storageBackend,
      objectKey: doc.objectKey,
      uploadedBy: actor.userId,
    });
  }
}
