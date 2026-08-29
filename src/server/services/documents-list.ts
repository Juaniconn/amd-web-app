import "server-only";

import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";

export type DocumentListFilter = {
  entityType?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listDocuments(filter: DocumentListFilter = {}) {
  const { entityType, search, limit = 50, offset = 0 } = filter;

  const conditions = [];
  if (entityType) {
    conditions.push(sql`${documents.entityType} = ${entityType}`);
  }
  if (search) {
    conditions.push(sql`${documents.originalName} ILIKE ${`%${search}%`}`);
  }

  const whereClause =
    conditions.length > 0 ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : sql`TRUE`;

  const rows = await db
    .select({
      id: documents.id,
      entityType: documents.entityType,
      entityId: documents.entityId,
      originalName: documents.originalName,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(whereClause)
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents)
    .where(whereClause);

  return {
    rows,
    total: countResult[0]?.count ?? 0,
  };
}
