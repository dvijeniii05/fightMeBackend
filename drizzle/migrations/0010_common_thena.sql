ALTER TABLE "hero" DROP CONSTRAINT "hero_nickname_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "nickname_unique_idx" ON "hero" USING btree ("nickname") WHERE "hero"."is_dupe" = false;