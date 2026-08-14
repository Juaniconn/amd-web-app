import { index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const documentEntityTypeEnum = pgEnum("document_entity_type", [
  "quote",
  "customer",
  "order",
  "engineering_request",
]);

export const documentStorageBackendEnum = pgEnum("document_storage_backend", [
  "local",
  "r2",
]);

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    entityType: documentEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: text("checksum_sha256"),
    storageBackend: documentStorageBackendEnum("storage_backend")
      .notNull()
      .default("local"),
    objectKey: text("object_key").notNull(),
    uploadedBy: text("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("documents_entity_idx").on(table.entityType, table.entityId),
    index("documents_object_key_idx").on(table.objectKey),
  ],
);
