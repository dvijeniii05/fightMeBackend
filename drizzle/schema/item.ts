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

export const itemTemplateSxma = pgTable("item_template", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // "weapon", "armor", "consumable" TODO: change to numbers
  rarity: varchar("rarity").notNull(), // "common", "rare", "epic", "legendary" TODO: change to numbers
  baseStats: jsonb("base_stats"), // { damage: 10, .... }
  requirements: jsonb("requirements"), // { level: 15, strength: 20 }
  description: text("description"),
  imageUrl: varchar("image_url"),
  price: integer("price").default(0),
  stackable: boolean("stackable").default(false),
  slots: jsonb("slots").$type<number[]>().notNull().default([]), // for armor
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
