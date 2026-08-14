import "server-only";

import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, engineeringRequests, quotes } from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  ENGINEERING_ALLOWED_EXTENSIONS,
  ENGINEERING_FILE_MIME,
  ENGINEERING_MAX_FILE_BYTES,
} from "@/lib/engineering/files";
import { canAttachEngineeringFiles, type EngineeringStatus } from "@/lib/engineering/status";
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
