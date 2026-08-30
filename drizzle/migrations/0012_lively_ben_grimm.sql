ALTER TABLE "hero" ADD COLUMN "skill_loadout" jsonb DEFAULT '["precise"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hero" ADD COLUMN "critical_strikes" integer DEFAULT 0 NOT NULL;