ALTER TABLE "hero" RENAME COLUMN "shards" TO "shards_a";--> statement-breakpoint
ALTER TABLE "hero" ADD COLUMN "shards_b" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero" ADD COLUMN "shards_c" integer DEFAULT 0 NOT NULL;