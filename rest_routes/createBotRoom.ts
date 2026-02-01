import { randomUUIDv7, type BunRequest, type ServerWebSocket } from "bun";
import { insertFightRoom } from "../drizzle/queries/fightRoom";
import { copyBotForFight, selectHero } from "../drizzle/queries/hero";
import { calculateStatsHelper } from "../helpers/calculateStatsHelper";

export const createBotRoom = async (
  req: BunRequest<"/fight/createBotRoom/:heroId/:botId">,
) => {
  const { heroId, botId } = req.params;
  const url = new URL(req.url);
  const isDungeon = url.searchParams.get("isDungeon") === "true";
  const shardsType = url.searchParams.get("shardsType");
  // const shardsType = shardsTypeParam ? parseInt(shardsTypeParam) : 0;

  const roomId = randomUUIDv7();
  console.log("CREATE_BOT_ROOM_FUNC", heroId, shardsType);
  //TODO: same user cannot have multiple fightRooms active!!!

  try {
    const hero = await selectHero(heroId);
    const bot = await copyBotForFight(botId, roomId);
    if (hero && bot) {
      const caclStats = calculateStatsHelper(hero);
      const calcBotStats = calculateStatsHelper(bot);

      await insertFightRoom({
        roomId,
        playerOneCalcStats: caclStats,
        playerOne: heroId,
        playerTwoCalcStats: calcBotStats,
        playerTwo: botId,
        createdAt: Date.now(),
        isPvp: false,
        isDungeon: isDungeon,
        shardsType: shardsType,
      });
      console.log(`Room ${roomId} created`);
      return Response.json({ roomId: roomId }, { status: 200 });
    } else {
      console.log("NO_HERO_FOUND");
    }
  } catch (err) {
    console.log("CREATE_ROOM_ERROR", err);
    return Response.json(
      { message: `ERROR: Failed to create room foor ${heroId}` },
      { status: 502 },
    );
  }
};
