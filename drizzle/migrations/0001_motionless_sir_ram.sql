ALTER TABLE "hero" ALTER COLUMN "lvl" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hero" ADD COLUMN "exp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero" ADD COLUMN "available_points" smallint DEFAULT 0 NOT NULL;