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
	"lvl" smallint DEFAULT 1 NOT NULL,
	"clan" varchar DEFAULT '',
	"type" varchar DEFAULT 'hero',
	"exp" integer DEFAULT 0 NOT NULL,
	"available_points" smallint DEFAULT 0 NOT NULL,
	"is_dupe" boolean DEFAULT false NOT NULL,
	CONSTRAINT "hero_id_unique" UNIQUE("id"),
	CONSTRAINT "hero_nickname_unique" UNIQUE("nickname")
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
CREATE TABLE "item_instance" (
	"id" varchar PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"owner_id" varchar NOT NULL,
	"equipped" boolean DEFAULT false,
	"equip_slot" smallint,
	CONSTRAINT "item_instance_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "item_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"type" varchar NOT NULL,
	"rarity" varchar NOT NULL,
	"base_stats" jsonb,
	"requirements" jsonb,
	"description" text,
	"image_url" varchar,
	"price" integer DEFAULT 0,
	"stackable" boolean DEFAULT false,
	"slots" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fight_room" ADD CONSTRAINT "fight_room_player_one_hero_id_fk" FOREIGN KEY ("player_one") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fight_room" ADD CONSTRAINT "fight_room_player_two_hero_id_fk" FOREIGN KEY ("player_two") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stats" ADD CONSTRAINT "stats_owner_id_hero_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_instance" ADD CONSTRAINT "item_instance_template_id_item_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."item_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_instance" ADD CONSTRAINT "item_instance_owner_id_hero_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;