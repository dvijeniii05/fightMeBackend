ALTER TABLE "hero" ADD COLUMN "avatar" smallint;--> statement-breakpoint
UPDATE "hero"
SET "avatar" = "sprite"
WHERE "avatar" IS NULL AND "sprite" BETWEEN 1 AND 6;