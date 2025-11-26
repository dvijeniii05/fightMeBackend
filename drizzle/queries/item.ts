import { db } from "../db";
import { itemTemplateSxma, itemInstanceSxma } from "../schema/item";
import { randomUUIDv7 } from "bun";
import { and, eq } from "drizzle-orm";

export const insertItemTemplate = async (
  data: typeof itemTemplateSxma.$inferInsert,
) => {
  return await db.insert(itemTemplateSxma).values(data).returning();
};

export const insertMultipleItemTemplates = async (
  data: (typeof itemTemplateSxma.$inferInsert)[],
) => {
  return await db.insert(itemTemplateSxma).values(data).returning();
};

export const getAllItems = async () => {
  return await db.query.itemTemplateSxma.findMany();
};

export const createItemInstance = async (
  ownerId: string,
  templateId: number,
  options?: {
    equipped?: boolean;
    equipSlot?: number;
  },
) => {
  return await db
    .insert(itemInstanceSxma)
    .values({
      id: randomUUIDv7(),
      templateId,
      ownerId,
      equipped: options?.equipped ?? false,
      equipSlot: options?.equipSlot,
    })
    .returning();
};

export const toggleItemEquipped = async (
  ownerId: string,
  itemId: string,
  options?: {
    equipped?: boolean;
    equipSlot?: number;
  },
) => {
  // console.log("TOGGLE_ITEM_EQUIPPED", { ownerId, itemId, options });

  return await db.transaction(async tx => {
    // If equipping to a specific slot, unequip any item currently in that slot
    if (options?.equipped && options?.equipSlot) {
      await tx
        .update(itemInstanceSxma)
        .set({ equipped: false })
        .where(
          and(
            eq(itemInstanceSxma.ownerId, ownerId),
            eq(itemInstanceSxma.equipped, true),
            eq(itemInstanceSxma.equipSlot, options.equipSlot),
          ),
        );
    }

    // Now equip/unequip the target item
    const [updatedItem] = await tx
      .update(itemInstanceSxma)
      .set({
        equipped: options?.equipped,
        equipSlot: options?.equipSlot,
      })
      .where(
        and(
          eq(itemInstanceSxma.id, itemId),
          eq(itemInstanceSxma.ownerId, ownerId),
        ),
      )
      .returning();

    return updatedItem;
  });
};

export const getHeroItems = async (ownerId: string) => {
  return await db
    .select()
    .from(itemInstanceSxma)
    .where(eq(itemInstanceSxma.ownerId, ownerId));
};
