import { randomUUIDv7, type BunRequest } from "bun";
import { db } from "../drizzle/db";
import { heroSxma, statsSxma } from "../drizzle/schema/hero";
import { itemInstanceSxma } from "../drizzle/schema/item";

interface CreateBotWithItemsBody {
  nickname: string;
  stats: {
    strength: number;
    mastery: number;
    agility: number;
    health: number;
    knowledge: number;
  };
  lvl: number;
  items: {
    templateId: number;
    equipSlot: number; // 1-6
  }[];
}

export const createBotWithItems = async (
  req: BunRequest<"/misc/createBotWithItems">,
) => {
  try {
    const body: CreateBotWithItemsBody = await req.json();

    // Validate input
    if (!body.nickname) {
      return Response.json(
        { message: "Nickname is required" },
        { status: 400 },
      );
    }

    if (!body.stats) {
      return Response.json({ message: "Stats are required" }, { status: 400 });
    }

    const botId = randomUUIDv7();

    await db.transaction(async tx => {
      // 1. Create bot hero
      await tx.insert(heroSxma).values({
        id: botId,
        nickname: body.nickname,
        type: "bot",
        lvl: body.lvl,
        exp: 0,
        statsPoints: 0,
        isDupe: false,
      });

      // 2. Create stats
      const currentHp = Math.round(body.stats.health * 100);
      await tx.insert(statsSxma).values({
        ownerId: botId,
        strength: body.stats.strength,
        mastery: body.stats.mastery,
        agility: body.stats.agility,
        health: body.stats.health,
        knowledge: body.stats.knowledge,
        currentHp: currentHp,
      });

      // 3. Create items if provided
      if (body.items && body.items.length > 0) {
        const itemInstances = body.items.map(item => ({
          id: randomUUIDv7(),
          templateId: item.templateId,
          ownerId: botId,
          equipped: true,
          equipSlot: item.equipSlot,
        }));

        await tx.insert(itemInstanceSxma).values(itemInstances);
      }
    });

    console.log(`Bot "${body.nickname}" created with ID: ${botId}`);

    return Response.json(
      {
        success: true,
        botId: botId,
        message: `Bot "${body.nickname}" created successfully`,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("CREATE_BOT_WITH_ITEMS_ERROR", err);

    if (err.code === "23505") {
      return Response.json(
        {
          message: "Nickname is already taken.",
          code: "NICKNAME_NOT_UNIQUE",
        },
        { status: 409 },
      );
    }

    return Response.json(
      { message: `ERROR: Bot creation failed - ${err.message}` },
      { status: 500 },
    );
  }
};
