import {
  isEnoughShards,
  calculateShardDeductions,
  isForgeSuccess,
} from "../../helpers/forgeHelpers";
import { db } from "../db";
import { heroSxma } from "../schema/hero";
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

export const forgeItemInstance = async (heroId: string, itemId: string) => {
  return await db.transaction(async tx => {
    // Get the item instance with its template
    const itemInstance = await tx.query.itemInstanceSxma.findFirst({
      where: and(
        eq(itemInstanceSxma.id, itemId),
        eq(itemInstanceSxma.ownerId, heroId),
      ),
      with: {
        template: true,
      },
    });

    const heroData = await tx.query.heroSxma.findFirst({
      where: eq(heroSxma.id, heroId),
    });

    if (!itemInstance || !heroData) {
      throw new Error("Item not found or does not belong to this hero");
    }

    // Check if item is forgeable
    if (!itemInstance.template.isForgable) {
      throw new Error("This item cannot be forged");
    }

    // Check if already at max forge level
    const currentForgeLevel = itemInstance.forgeLevel ?? 0;
    if (currentForgeLevel >= 8) {
      throw new Error("Item is already at maximum forge level");
    }

    // Check if forge levels exist for this item
    if (!itemInstance.template.forgeLevels) {
      throw new Error("Item template has no forge levels defined");
    }

    if (!isEnoughShards(itemInstance, heroData)) {
      throw new Error("Not enough shards to forge the item");
    }

    const wasForgeSuccessful = isForgeSuccess(
      itemInstance.template.forgeLevels[currentForgeLevel + 1].successRate,
    );

    // Increment the item instance forge level
    const [forgedItem] = await tx
      .update(itemInstanceSxma)
      .set({
        forgeLevel: wasForgeSuccessful
          ? currentForgeLevel + 1
          : currentForgeLevel,
      })
      .where(eq(itemInstanceSxma.id, itemId))
      .returning();

    // Deduct shards based on forge cost
    const updatedShards = calculateShardDeductions(itemInstance, heroData);
    await tx.update(heroSxma).set(updatedShards).where(eq(heroSxma.id, heroId));
    return forgedItem;
  });
};
