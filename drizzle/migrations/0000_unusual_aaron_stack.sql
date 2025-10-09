CREATE TABLE "fight_room" (
	"room_id" varchar PRIMARY KEY NOT NULL,
	"player1_stats" jsonb,
	"player2_stats" jsonb,
	"player_one" varchar NOT NULL,
	"player_two" varchar,
	"history" jsonb DEFAULT '[]'::jsonb,
	"created_at" bigint NOT NULL,
	"is_finished" boolean DEFAULT false,
	"is_pvp" boolean DEFAULT true,
	CONSTRAINT "fight_room_room_id_unique" UNIQUE("room_id")
);
--> statement-breakpoint
CREATE TABLE "hero" (
	"id" varchar PRIMARY KEY NOT NULL,
	"nickname" varchar NOT NULL,
	"location" text,
	"born" text,
	"lvl" smallint DEFAULT 1,
	"clan" varchar DEFAULT '',
	"type" varchar DEFAULT 'hero',
	CONSTRAINT "hero_id_unique" UNIQUE("id"),
	CONSTRAINT "hero_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" varchar NOT NULL,
	"equipped" varchar[] DEFAULT '{}',
	"stashed" varchar[] DEFAULT '{}',
	CONSTRAINT "inventory_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
CREATE TABLE "stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" varchar NOT NULL,
	"strength" smallint DEFAULT 5 NOT NULL,
	"mastery" smallint DEFAULT 5 NOT NULL,
	"agility" smallint DEFAULT 5 NOT NULL,
	"health" smallint DEFAULT 5 NOT NULL,
	"knowledge" smallint DEFAULT 5 NOT NULL,
	"current_hp" smallint,
	CONSTRAINT "stats_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
ALTER TABLE "fight_room" ADD CONSTRAINT "fight_room_player_one_hero_id_fk" FOREIGN KEY ("player_one") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fight_room" ADD CONSTRAINT "fight_room_player_two_hero_id_fk" FOREIGN KEY ("player_two") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_owner_id_hero_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stats" ADD CONSTRAINT "stats_owner_id_hero_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;