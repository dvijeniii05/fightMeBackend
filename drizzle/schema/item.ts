import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  smallint,
  text,
  varchar,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { heroSxma } from "./hero";

type itemStatsType = {
  hp?: number;
  damage?: number;
  attackArea?: number;
  blockArea?: number;
  critChance?: number;
  critMultiplier?: number;
  evadeChance?: number;
  fastChance?: number;
  skillCritChance?: number;
  //TODO: add more stats specific to gear + awakenings?
};

type forgeRequirementsType = {
  cost: number; // cost in shards
  costType: string; // type of shards (A, B, C)
  successRate: number; // percentage chance of success
};

export const itemTemplateSxma = pgTable("item_template", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // "weapon", "armor", "consumable" TODO: change to numbers
  rarity: varchar("rarity").notNull(), // "common", "rare", "epic", "legendary" TODO: change to numbers
  baseStats: jsonb("base_stats").$type<itemStatsType>(), // { damage: 10, .... }
  requirements: jsonb("requirements"), // { level: 15, strength: 20 }
  description: text("description"),
  imageUrl: varchar("image_url"),
  price: integer("price").default(0),
  stackable: boolean("stackable").default(false),
  slots: jsonb("slots").$type<number[]>().notNull().default([]), // for armor
  isForgable: boolean("is_forgable").default(false),
  forgeLevels: jsonb("forge_levels").$type<{
    [level: number]: itemStatsType & forgeRequirementsType;
  }>(), // number of times item can be forged
});

export const itemInstanceSxma = pgTable("item_instance", {
  id: varchar("id").primaryKey().unique().notNull(),
  templateId: integer("template_id")
    .references(() => itemTemplateSxma.id)
    .notNull(),
  ownerId: varchar("owner_id")
    .references(() => heroSxma.id, { onDelete: "cascade" })
    .notNull(),

  // Instance-specific data
  // durability: smallint("durability"), // Current durability
  // maxDurability: smallint("max_durability"), // Max durability for this instance
  // enchantLevel: smallint("enchant_level").default(0),
  // socketedGems: jsonb("socketed_gems").default([]), // Array of gem IDs
  // customStats: jsonb("custom_stats"), // Any bonus stats from enchanting

  forgeLevel: smallint("forge_level").default(0), // Current forge level
  // Inventory management
  equipped: boolean("equipped").default(false),
  equipSlot: smallint("equip_slot"), //  1 to 6 (left to right)
  // stackSize: smallint("stack_size").default(1), // For stackable items
});

export const itemTemplateRelations = relations(
  itemTemplateSxma,
  ({ many }) => ({
    instances: many(itemInstanceSxma),
  }),
);

export const itemInstanceRelations = relations(itemInstanceSxma, ({ one }) => ({
  template: one(itemTemplateSxma, {
    fields: [itemInstanceSxma.templateId],
    references: [itemTemplateSxma.id],
  }),
  owner: one(heroSxma, {
    fields: [itemInstanceSxma.ownerId],
    references: [heroSxma.id],
  }),
}));

export type SelectItemInstance = typeof itemInstanceSxma.$inferSelect;
export type SelectItemTemplate = typeof itemTemplateSxma.$inferSelect;
export type SelectFullItem = typeof itemInstanceSxma.$inferSelect & {
  template: typeof itemTemplateSxma.$inferSelect;
};
