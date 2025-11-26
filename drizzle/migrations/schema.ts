import { pgTable, unique, varchar, text, smallint, integer, boolean, foreignKey, jsonb, bigint, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const hero = pgTable("hero", {
	id: varchar().primaryKey().notNull(),
	nickname: varchar().notNull(),
	location: text(),
	born: text(),
	lvl: smallint().default(1).notNull(),
	clan: varchar().default('),
	type: varchar().default('hero'),
	exp: integer().default(0).notNull(),
	availablePoints: smallint("available_points").default(0).notNull(),
	isDupe: boolean("is_dupe").default(false).notNull(),
}, (table) => [
	unique("hero_nickname_unique").on(table.nickname),
]);

export const fightRoom = pgTable("fight_room", {
	roomId: varchar("room_id").primaryKey().notNull(),
	player1Stats: jsonb("player1_stats"),
	player2Stats: jsonb("player2_stats"),
	playerOne: varchar("player_one").notNull(),
	playerTwo: varchar("player_two"),
	history: jsonb().default([]),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	createdAt: bigint("created_at", { mode: "number" }).notNull(),
	isFinished: boolean("is_finished").default(false),
	isPvp: boolean("is_pvp").default(true),
}, (table) => [
	foreignKey({
			columns: [table.playerOne],
			foreignColumns: [hero.id],
			name: "fight_room_player_one_hero_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.playerTwo],
			foreignColumns: [hero.id],
			name: "fight_room_player_two_hero_id_fk"
		}).onDelete("cascade"),
]);

export const stats = pgTable("stats", {
	id: serial().primaryKey().notNull(),
	ownerId: varchar("owner_id").notNull(),
	strength: smallint().default(5).notNull(),
	mastery: smallint().default(5).notNull(),
	agility: smallint().default(5).notNull(),
	health: smallint().default(5).notNull(),
	knowledge: smallint().default(5).notNull(),
	currentHp: smallint("current_hp"),
}, (table) => [
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [hero.id],
			name: "stats_owner_id_hero_id_fk"
		}).onDelete("cascade"),
	unique("stats_owner_id_unique").on(table.ownerId),
]);

export const itemInstance = pgTable("item_instance", {
	id: varchar().primaryKey().notNull(),
	templateId: integer("template_id").notNull(),
	ownerId: varchar("owner_id").notNull(),
	equipped: boolean().default(false),
	equipSlot: smallint("equip_slot"),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [itemTemplate.id],
			name: "item_instance_template_id_item_template_id_fk"
		}),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [hero.id],
			name: "item_instance_owner_id_hero_id_fk"
		}).onDelete("cascade"),
	unique("item_instance_id_unique").on(table.id),
]);

export const itemTemplate = pgTable("item_template", {
	id: serial().primaryKey().notNull(),
	name: varchar().notNull(),
	type: varchar().notNull(),
	rarity: varchar().notNull(),
	baseStats: jsonb("base_stats"),
	requirements: jsonb(),
	description: text(),
	imageUrl: varchar("image_url"),
	price: integer().default(0),
	stackable: boolean().default(false),
	slots: jsonb().default([]).notNull(),
});
