ALTER TYPE "public"."document_entity_type" ADD VALUE IF NOT EXISTS 'quote_item';--> statement-breakpoint
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "costing" jsonb;
