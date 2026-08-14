import "server-only";

import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, quotes } from "@/db/schema";
import { AppError } from "@/lib/errors";
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
