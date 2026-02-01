ALTER TABLE "item_instance" ADD COLUMN "forge_level" smallint DEFAULT 0;--> statement-breakpoint
ALTER TABLE "item_template" ADD COLUMN "forge_levels" jsonb;