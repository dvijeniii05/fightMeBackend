import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { heroSxma, statsSxma, type InsertHero } from "../schema/hero";
import type { StatsProps } from "../../helpers/calculateStatsHelper";
import { itemInstanceSxma } from "../schema/item";

interface Props {
  data: Omit<InsertHero, "inventoryId" | "statsId">;
  isBot?: boolean;
}

export const insertHero = async ({ data, isBot }: Props) => {
  await db.transaction(async tx => {
    const [hero] = await tx
      .insert(heroSxma)
      .values({
        ...data,
        type: isBot ? "bot" : "hero",
      })
      .returning();
    console.log("HERO_CREATE", { ...data });

    // Insert stats with default values
    await tx.insert(statsSxma).values({
      ownerId: data.id,
      // Default values of 5 will be used for all stats
    });

    // Return the created hero with relations
    return hero;
  });
};

export const selectHero = async (heroId: string) => {
  // Query the hero with related inventory and stats
  console.log("SELECTING_HERO_FUNC", heroId);
  const heroWithRelations = await db.query.heroSxma.findFirst({
    where: eq(heroSxma.id, heroId),
    with: {
      stats: true,
      items: {
        with: {
          template: true,
        },
      },
    },
  });

  return heroWithRelations;
};

export const selectAllUniqueBots = async () => {
  // Query all heroes where type is 'bot'
  const bots = await db.query.heroSxma.findMany({
    where: and(eq(heroSxma.type, "bot"), eq(heroSxma.isDupe, false)),
    with: {
      stats: true,
    },
  });

  return bots;
};

export const copyBotForFight = async (botId: string, roomId: string) => {
  // Find the bot by ID
  const botTemplate = await db.query.heroSxma.findFirst({
    where: eq(heroSxma.id, botId),
    with: {
      stats: true,
      items: {
        with: {
          template: true,
        },
      },
    },
  });

  if (!botTemplate) {
    throw new Error("Bot not found");
  }

  const newBotId = botTemplate.id + "-" + roomId;

  await db.transaction(async tx => {
    // Insert new Bot with copied data
    await tx.insert(heroSxma).values({
      id: newBotId,
      nickname: botTemplate.nickname + "SUFFIX", //TODO: add random suffix
      location: botTemplate.location,
      born: botTemplate.born,
      lvl: botTemplate.lvl,
      clan: botTemplate.clan,
      type: "bot",
      exp: botTemplate.exp,
      statsPoints: botTemplate.statsPoints,
      isDupe: true,
    });

    // Insert new stats with copied data
    await tx.insert(statsSxma).values({
      ownerId: newBotId,
      strength: botTemplate.stats?.strength,
      mastery: botTemplate.stats?.mastery,
      agility: botTemplate.stats?.agility,
      health: botTemplate.stats?.health,
      knowledge: botTemplate.stats?.knowledge,
      currentHp: botTemplate.stats?.currentHp,
    });

    //TODO: Check AND update logic for items duplication!!!
    // Copy all items from the original bot
    if (botTemplate.items && botTemplate.items.length > 0) {
      const itemsToInsert = botTemplate.items.map(item => ({
        templateId: item.templateId,
        ownerId: newBotId,
        equipped: item.equipped,
        equipSlot: item.equipSlot,
        id: item.id, // keep the same id as original item
      }));

      await tx.insert(itemInstanceSxma).values(itemsToInsert);
    }
  });

  // Return the new bot ID
  const botDupe = await selectHero(newBotId);

  return botDupe;
};

export const deleteCopiedBot = async (botId: string) => {
  await db.delete(heroSxma).where(eq(heroSxma.id, botId));
};

export const updateHeroAfterFight = async (data: {
  heroId: string;
  exp: number;
  lvl: number;
  statsPoints: number;
}) => {
  const updatedHero = await db
    .update(heroSxma)
    .set({ exp: data.exp, lvl: data.lvl, statsPoints: data.statsPoints })
    .where(eq(heroSxma.id, data.heroId));

  return updatedHero;
};

export const updateHeroCurrHp = async (data: {
  heroId: string;
  currHp: number;
}) => {
  const updatedStats = await db
    .update(statsSxma)
    .set({ currentHp: data.currHp })
    .where(eq(statsSxma.ownerId, data.heroId));

  return updatedStats;
};

export const updateHeroStats = async (data: {
  ownerId: string;
  strength: number;
  mastery: number;
  agility: number;
  health: number;
  knowledge: number;
  currentHp: number;
  freeStats: number;
}) => {
  await db
    .update(heroSxma)
    .set({ statsPoints: data.freeStats })
    .where(eq(heroSxma.id, data.ownerId));

  await db
    .update(statsSxma)
    .set({
      strength: data.strength,
      mastery: data.mastery,
      agility: data.agility,
      health: data.health,
      knowledge: data.knowledge,
    })
    .where(eq(statsSxma.ownerId, data.ownerId));

  return Promise.resolve(true);
};
