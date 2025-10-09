import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  smallint,
  text,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { fightRoomSxma } from "./fightRoom";

export const heroSxma = pgTable("hero", {
  id: varchar("id").primaryKey().unique().notNull(),
  nickname: varchar("nickname").notNull().unique(),
  location: text("location"), // upd to match current location
  born: text("born"), // would this be needed??
  lvl: smallint("lvl").default(1).notNull(),
  clan: varchar("clan").default(""), // ref to Clan Sxma
  type: varchar("type").default("hero"), // hero or bot
  exp: integer("exp").default(0).notNull(),
  statsPoints: smallint("available_points").default(0).notNull(), //linked to lvl up
  isDupe: boolean("is_dupe").default(false).notNull(), // to mark if hero is a copied bot
});

export const statsSxma = pgTable("stats", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => heroSxma.id, { onDelete: "cascade" })
    .unique(),
  strength: smallint("strength").default(5).notNull(),
  mastery: smallint("mastery").default(5).notNull(),
  agility: smallint("agility").default(5).notNull(),
  health: smallint("health").default(5).notNull(),
  knowledge: smallint("knowledge").default(5).notNull(),
  currentHp: smallint("current_hp"),
});

export const inventorySxma = pgTable("inventory", {
  id: serial("id").primaryKey(),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => heroSxma.id, { onDelete: "cascade" })
    .unique(),
  equipped: varchar("equipped").array().default([]), //TODO: many2many with Items
  stashed: varchar("stashed").array().default([]), //TODO: many2many with Items
});

export const heroRelations = relations(heroSxma, ({ one }) => ({
  inventory: one(inventorySxma, {
    fields: [heroSxma.id],
    references: [inventorySxma.ownerId], // Match hero.id → inventory.heroId
  }),
  stats: one(statsSxma, {
    fields: [heroSxma.id],
    references: [statsSxma.ownerId], // Match hero.id → stats.heroId
  }),
  fightRoomPlayerOne: one(fightRoomSxma, {
    fields: [heroSxma.id],
    references: [fightRoomSxma.playerOne],
  }),
  fightRoomPlayerTwo: one(fightRoomSxma, {
    fields: [heroSxma.id],
    references: [fightRoomSxma.playerTwo],
  }),
}));

export const inventoriesRelations = relations(inventorySxma, ({ one }) => ({
  owner: one(heroSxma, {
    fields: [inventorySxma.ownerId],
    references: [heroSxma.id],
  }),
}));

export const statsRelations = relations(statsSxma, ({ one }) => ({
  owner: one(heroSxma, {
    fields: [statsSxma.ownerId],
    references: [heroSxma.id],
  }),
}));

export type SelectHero = typeof heroSxma.$inferSelect;
export type InsertHero = typeof heroSxma.$inferInsert;
