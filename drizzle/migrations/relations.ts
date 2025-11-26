import { relations } from "drizzle-orm/relations";
import { hero, fightRoom, stats, itemTemplate, itemInstance } from "./schema";

export const fightRoomRelations = relations(fightRoom, ({one}) => ({
	hero_playerOne: one(hero, {
		fields: [fightRoom.playerOne],
		references: [hero.id],
		relationName: "fightRoom_playerOne_hero_id"
	}),
	hero_playerTwo: one(hero, {
		fields: [fightRoom.playerTwo],
		references: [hero.id],
		relationName: "fightRoom_playerTwo_hero_id"
	}),
}));

export const heroRelations = relations(hero, ({many}) => ({
	fightRooms_playerOne: many(fightRoom, {
		relationName: "fightRoom_playerOne_hero_id"
	}),
	fightRooms_playerTwo: many(fightRoom, {
		relationName: "fightRoom_playerTwo_hero_id"
	}),
	stats: many(stats),
	itemInstances: many(itemInstance),
}));

export const statsRelations = relations(stats, ({one}) => ({
	hero: one(hero, {
		fields: [stats.ownerId],
		references: [hero.id]
	}),
}));

export const itemInstanceRelations = relations(itemInstance, ({one}) => ({
	itemTemplate: one(itemTemplate, {
		fields: [itemInstance.templateId],
		references: [itemTemplate.id]
	}),
	hero: one(hero, {
		fields: [itemInstance.ownerId],
		references: [hero.id]
	}),
}));

export const itemTemplateRelations = relations(itemTemplate, ({many}) => ({
	itemInstances: many(itemInstance),
}));